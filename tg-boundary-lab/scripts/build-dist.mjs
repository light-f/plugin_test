#!/usr/bin/env node
// 生成可直接部署到任意 HTTPS 静态托管的目录：dist/
// 用法：node scripts/build-dist.mjs
// 只拷贝运行期需要的文件，不含 manifest、测试、头像与本地服务脚本。
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "dist");
const FILES = ["index.html", "boundary-core.js", "boundary-ui.js", "plugin.js", "tiangong-bridge.js"];

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const missing = FILES.filter((file) => !existsSync(path.join(root, file)));
if (missing.length) {
  console.error(`✗ 缺少文件：${missing.join(", ")}`);
  process.exit(1);
}
for (const file of FILES) cpSync(path.join(root, file), path.join(outDir, file));

const total = readdirSync(outDir).length;
console.log(`✓ dist/ 已生成（${total} 个文件）：${FILES.join(", ")}`);
console.log("把 dist/ 内的文件上传到任意 HTTPS 静态目录，然后把 manifest 的 view.url 改成该地址再发布。");
