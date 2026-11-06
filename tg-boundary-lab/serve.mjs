#!/usr/bin/env node
// 天工插件本地页面服务：零依赖，只用 Node 内置模块，Windows / macOS 通用。
// 用法：node serve.mjs [根目录]     默认根目录为本文件所在目录
// 端口：默认 5178；环境变量 PORT 覆盖；PORT=0 由系统分配，实际端口见启动输出。
// 只监听 127.0.0.1；manifest 中的视图 URL 必须与启动输出的地址一致。
import { createReadStream, statSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HOST = "127.0.0.1";
const root = path.resolve(process.argv[2] ?? path.dirname(fileURLToPath(import.meta.url)));
const port = process.env.PORT === undefined || process.env.PORT === "" ? 5178 : Number(process.env.PORT);
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

function resolveFile(rawUrl) {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(rawUrl, "http://localhost").pathname);
  } catch {
    return null;
  }
  // 统一分隔符后再解析，防止 Windows 上 ..\ 越界；空字节直接拒绝。
  if (pathname.includes("\0")) return null;
  const relative = pathname.replace(/\\/g, "/").replace(/^\/+/, "");
  const target = path.resolve(root, relative);
  const rel = path.relative(root, target);
  if (rel.startsWith("..") || path.isAbsolute(rel)) return null;
  return target;
}

function send(res, status, text) {
  res.writeHead(status, { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" });
  res.end(text);
}

const server = createServer((req, res) => {
  if (req.method !== "GET" && req.method !== "HEAD") return send(res, 405, "Method Not Allowed");
  let file = resolveFile(req.url ?? "/");
  if (!file) return send(res, 403, "Forbidden");
  let stat;
  try {
    stat = statSync(file);
    if (stat.isDirectory()) {
      file = path.join(file, "index.html");
      stat = statSync(file);
    }
  } catch {
    return send(res, 404, "Not Found");
  }
  if (!stat.isFile()) return send(res, 404, "Not Found");
  res.writeHead(200, {
    "content-type": TYPES[path.extname(file).toLowerCase()] ?? "application/octet-stream",
    "content-length": stat.size,
    // 开发期禁用缓存：改页面后 plugin_view reload 即可看到新内容
    "cache-control": "no-store",
  });
  if (req.method === "HEAD") return res.end();
  createReadStream(file).pipe(res);
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`端口 ${port} 已被占用：换一个端口（如 PORT=5179），并同步修改 manifest 中的视图 URL。`);
  } else {
    console.error(`页面服务启动失败：${error.message}`);
  }
  process.exit(1);
});

server.listen(port, HOST, () => {
  const { port: actual } = server.address();
  console.log(`天工插件页面服务已启动：http://${HOST}:${actual}/  根目录：${root}`);
  console.log("按 Ctrl+C 停止。");
});
