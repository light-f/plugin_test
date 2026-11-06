#!/usr/bin/env node
// 天工插件 manifest 校验与发布包准备（零依赖，CI 与本机通用）。
//   node ci/check-manifest.mjs            开发期校验：JSON、v2 结构、id、视图 URL（http / https）
//   node ci/check-manifest.mjs --release  发布校验：额外要求三段 SemVer、tag = v<version>、
//                                         最低客户端版本明确；通过后在 .publish/<id>/ 准备打包内容并写 .publish/meta.env
// 最低客户端版本来源：CI 变量 TIANGONG_MIN_CLIENT_VERSION，缺失时报错，不猜默认值。
import fs from "node:fs";
import path from "node:path";

const release = process.argv.includes("--release");
const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const errors = [];
const fail = (message) => errors.push(message);

let manifest;
let manifestBytes;
try {
  manifestBytes = fs.readFileSync("manifest.v2.json");
  manifest = JSON.parse(manifestBytes.toString("utf8"));
} catch (error) {
  console.error(`manifest.v2.json 读取或 JSON 解析失败：${error.message}`);
  process.exit(1);
}

if (manifest.manifestVersion !== 2) fail("manifestVersion 必须是数字 2");
if (typeof manifest.id !== "string" || !/^[a-z0-9][a-z0-9._-]*$/.test(manifest.id)) {
  fail("id 须小写字母或数字开头，后续只含小写字母、数字、. _ -");
}
if (typeof manifest.version !== "string" || !manifest.version.trim()) fail("version 不能为空");
const cowork = manifest.cowork ?? {};
for (const key of ["displayName", "category", "icon", "color", "desc"]) {
  if (typeof cowork[key] !== "string" || !cowork[key].trim()) fail(`cowork.${key} 不能为空`);
}
if (!["orange", "blue", "purple", "green"].includes(cowork.color)) fail("cowork.color 只能是 orange/blue/purple/green");

const views = [];
if (!Array.isArray(manifest.subcapabilities) || manifest.subcapabilities.length === 0) {
  fail("subcapabilities 必须是非空数组");
} else {
  for (const sub of manifest.subcapabilities) {
    if (sub?.entryAgent) fail(`子能力 ${sub.id} 不能声明 entryAgent`);
    for (const view of Array.isArray(sub?.views) ? sub.views : []) views.push(view);
  }
}
if (views.length === 0) fail("至少声明一个视图");
const viewIds = new Set();
for (const view of views) {
  if (typeof view.id !== "string" || !/^[a-z0-9][a-z0-9-]*$/.test(view.id)) fail(`视图 id 非法：${view.id}`);
  if (viewIds.has(view.id)) fail(`视图 id 重复：${view.id}`);
  viewIds.add(view.id);
  let url;
  try {
    url = new URL(view.url);
  } catch {
    fail(`视图 ${view.id} 的 url 不是合法地址：${view.url}`);
    continue;
  }
  if (url.username || url.password) fail(`视图 ${view.id} 的 url 不能带账号密码`);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    fail(`视图 ${view.id} 的 url 只能是 http 或 https 地址（当前 ${view.url}）`);
  }
}

let minClientVersion = "";
if (release) {
  if (!SEMVER.test(manifest.version ?? "")) fail(`发布版本 version 须为三段 SemVer（如 1.0.0），当前 ${manifest.version}`);
  minClientVersion = (process.env.TIANGONG_MIN_CLIENT_VERSION ?? "").trim();
  if (!SEMVER.test(minClientVersion)) {
    fail("缺少或非法的最低客户端版本：请在 CI 变量 TIANGONG_MIN_CLIENT_VERSION 填写三段版本号（如 26.11.3），不要猜");
  }
  const tag = process.env.CI_COMMIT_TAG ?? "";
  if (tag && tag !== `v${manifest.version}`) fail(`tag ${tag} 与 manifest 版本不一致，应为 v${manifest.version}`);
}

if (errors.length) {
  for (const message of errors) console.error(`✗ ${message}`);
  process.exit(1);
}

if (release) {
  const staging = path.join(".publish", manifest.id);
  fs.rmSync(".publish", { recursive: true, force: true });
  fs.mkdirSync(staging, { recursive: true });
  // 原样拷贝字节：manifest 摘要按包内原始字节计算，不能重新序列化
  fs.writeFileSync(path.join(staging, "manifest.v2.json"), manifestBytes);
  if (fs.existsSync("README.md")) fs.copyFileSync("README.md", path.join(staging, "README.md"));
  fs.writeFileSync(
    path.join(".publish", "meta.env"),
    `PLUGIN_ID=${manifest.id}\nPLUGIN_VERSION=${manifest.version}\nMIN_CLIENT_VERSION=${minClientVersion}\n`,
  );
  console.log(`发布校验通过：${manifest.id}@${manifest.version}，最低客户端版本 ${minClientVersion}`);
} else {
  console.log(`manifest 校验通过：${manifest.id}@${manifest.version}，视图 ${views.length} 个`);
}
