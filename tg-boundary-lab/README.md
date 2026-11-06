# 边界值工坊 · Boundary Lab

给开发者和 QA 用的边界值 / 测试数据生成器：填一条字段规则，立刻得到边界值、异常值与优先级矩阵，可直接复制 Markdown、复制 CSV、下载 CSV，或把结果预填到对话继续加工。

纯前端计算，不联网、不上传任何数据，也没有业务凭据。

## 能做什么

- **7 种预设**：金额（两位小数）、整数区间、文件大小、日期区间、字符串长度、ID（格式校验）、枚举
- **自动覆盖**：低于下限 / 等于下限 / 下限 + 1 / 上限 - 1 / 等于上限 / 高于上限 / 零值 / 负值 / 空值 / 非数字 / 超额小数位 / 科学计数法 / 非法日期 / 非 ISO 格式 / 长度不足与超长 / 纯空格 / 特殊字符与注入串 / 中文与 emoji / 枚举外取值 / 大小写变体 / 首尾空格
- **优先级**：P0（边界与非法类型）、P1（常见异常）、P2（极端或需人工确认），可按行勾选保留
- **输出**：Markdown 表格（带字段类型标题）、CSV（带 BOM，Excel 直接打开）、剪贴板、下载、发到对话
- **中英切换**：外部开发者用英文输出，内部用中文；配置与语言会记住
- **深浅色**：跟随客户端主题，缺省跟随系统

## 文件

| 文件 | 作用 |
| --- | --- |
| `index.html` | 页面结构与样式 |
| `boundary-core.js` | 纯逻辑：预设、校验、用例生成、Markdown / CSV 导出、中英文案 |
| `boundary-ui.js` | 表单、表格、勾选、复制/下载/发到对话、语言与主题 |
| `plugin.js` | SDK 接入，暴露 5 个 action |
| `manifest.v2.json` | 插件清单（视图、permissions、actions、guide） |
| `tests/boundary-core.test.mjs` | 核心逻辑单测（15 条） |
| `scripts/build-dist.mjs` | 生成 `dist/`，用于 HTTPS 部署 |
| `serve.mjs` | 本地页面服务，本插件用 5180 |

## 本地开发

```bash
PORT=5180 node serve.mjs          # 视图地址 http://127.0.0.1:5180/index.html
node --test tests/boundary-core.test.mjs
node ci/check-manifest.mjs
node scripts/build-dist.mjs       # 产出 dist/ 供静态托管
```

## Agent 可用 action

| action | 说明 |
| --- | --- |
| `getMatrix` | 读取配置、汇总与全部用例行 |
| `setConfig` | 改字段规则并重新生成（field/type/min/max/decimals/required/values/pattern） |
| `applyPreset` | 套用 amount / integer / filesize / date / string / id / enum |
| `composeCases` | 把勾选用例的 Markdown 预填到对话输入框（不发送，需 `chat.compose`） |
| `getCsv` | 读取带 BOM 的 CSV 文本 |

## 分发注意事项

插件包只包含 manifest，页面必须由作者部署在 HTTPS 上；客户端不会替用户启动本地服务。
要给别人试用时：`node scripts/build-dist.mjs` → 把 `dist/` 上传到任意 HTTPS 静态目录 → 修改 `manifest.v2.json` 的 `view.url` 与三段版本号 → 走发布流程。
