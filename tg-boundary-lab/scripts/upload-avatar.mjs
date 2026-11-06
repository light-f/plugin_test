#!/usr/bin/env node
// 天工插件头像上传：把本地图片传到天工 Web 的 /api/images/upload，换回公网 S3 地址。
// 只用 Node 内置模块，Windows / macOS 通用，不依赖 curl 的表单语法。
//
// 用法：node upload-avatar.mjs <图片路径>
// 环境变量：
//   BRAINMAKER_API_BASE    客户端当前天工 Web 源站（人可读形态含 /v3 前缀也可以）
//   CODEMAKER_AUTH_TOKEN   当前登录凭据；脚本只把它放进请求头，绝不打印
//
// 输出（成功）：一行 `Avatar URL: <url>`；失败信息一律走 stderr，退出码非 0。
import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";

const MIME = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

function fail(message) {
  console.error(`upload-avatar: ${message}`);
  process.exit(1);
}

/** 只保留 scheme://host[:port]，Next.js 的 API 路由挂在根路径上，`/v3` 前缀对它们无意义。 */
function webOrigin(raw) {
  const trimmed = raw.trim().replace(/\/+$/, "");
  const match = /^(https?:\/\/[^/]+)/i.exec(trimmed);
  return match ? match[1] : "";
}

function postMultipart(url, { boundary, body }) {
  const target = new URL(url);
  const send = target.protocol === "https:" ? httpsRequest : httpRequest;
  return new Promise((resolve, reject) => {
    const req = send(
      target,
      {
        method: "POST",
        headers: {
          "content-type": `multipart/form-data; boundary=${boundary}`,
          "content-length": body.length,
          "x-access-token": process.env.CODEMAKER_AUTH_TOKEN,
        },
        timeout: 120000,
      },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () =>
          resolve({ status: res.statusCode ?? 0, text: Buffer.concat(chunks).toString("utf8") }),
        );
      },
    );
    req.on("timeout", () => req.destroy(new Error("请求超时（120 秒）")));
    req.on("error", reject);
    req.end(body);
  });
}

function headOk(url) {
  const target = new URL(url);
  const send = target.protocol === "https:" ? httpsRequest : httpRequest;
  return new Promise((resolve) => {
    const req = send(target, { method: "HEAD", timeout: 20000 }, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on("timeout", () => req.destroy(new Error("HEAD 超时")));
    req.on("error", () => resolve(false));
    req.end();
  });
}

async function main() {
  const file = process.argv[2];
  if (!file) fail("缺少图片路径。用法：node upload-avatar.mjs <图片路径>");

  const apiBase = process.env.BRAINMAKER_API_BASE ?? "";
  const origin = webOrigin(apiBase);
  if (!origin) fail("环境变量 BRAINMAKER_API_BASE 缺失或不是 http(s) 地址");
  if (!process.env.CODEMAKER_AUTH_TOKEN) fail("环境变量 CODEMAKER_AUTH_TOKEN 缺失（应已登录天工客户端）");

  let bytes;
  try {
    if (!statSync(file).isFile()) fail(`${file} 不是文件`);
    bytes = readFileSync(file);
  } catch (error) {
    fail(`读取图片失败：${error.message}`);
  }
  if (!bytes.length) fail("图片内容为空");

  const ext = path.extname(file).toLowerCase();
  const mime = MIME[ext];
  if (!mime) fail(`不支持的图片格式 ${ext || "(无扩展名)"}；只接受 png / jpg / jpeg / webp / gif`);

  const boundary = `----tiangong-avatar-${randomBytes(12).toString("hex")}`;
  const filename = path.basename(file).replace(/["\r\n]/g, "_");
  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\n` +
        `content-disposition: form-data; name="file"; filename="${filename}"\r\n` +
        `content-type: ${mime}\r\n\r\n`,
      "utf8",
    ),
    bytes,
    Buffer.from(`\r\n--${boundary}--\r\n`, "utf8"),
  ]);

  let response;
  try {
    response = await postMultipart(`${origin}/api/images/upload`, { boundary, body });
  } catch (error) {
    fail(`上传请求失败：${error.message}`);
  }

  if (response.status < 200 || response.status >= 300) {
    fail(`上传被拒绝：HTTP ${response.status} ${response.text.slice(0, 200)}`);
  }

  let parsed;
  try {
    parsed = JSON.parse(response.text);
  } catch {
    fail(`响应不是 JSON：${response.text.slice(0, 200)}`);
  }
  if (parsed?.status !== "uploaded") {
    fail(`上传未成功：status=${parsed?.status} message=${parsed?.message ?? ""}`);
  }
  const url = Array.isArray(parsed.files) ? parsed.files[0] : undefined;
  if (typeof url !== "string" || !/^https?:\/\//i.test(url)) {
    fail(`响应里没有可用的图片地址：${response.text.slice(0, 200)}`);
  }

  if (!(await headOk(url))) {
    fail(`图片地址已返回但无法公开访问（HEAD 非 200）：${url}`);
  }

  console.log(`Avatar URL: ${url}`);
}

main().catch((error) => fail(error?.message ?? String(error)));
