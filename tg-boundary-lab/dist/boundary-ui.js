// 页面交互：预设、表单、表格勾选、复制 / 下载 / 发到对话、中英切换。
import {
  DEFAULT_CONFIG,
  LABELS,
  PRESETS,
  generate,
  presetById,
  toCsv,
  toMarkdown,
} from "./boundary-core.js";

const UI = {
  zh: {
    title: "边界值工坊",
    sub: "填规则 → 自动生成边界值 / 异常 / 优先级 → 复制或下载，纯本地计算",
    field: "字段名",
    type: "类型",
    min: "下限",
    max: "上限",
    decimals: "小数位",
    required: "必填字段",
    values: "枚举取值（逗号分隔）",
    pattern: "格式正则（可选）",
    generate: "生成用例",
    cases: "条用例",
    copyMd: "复制 Markdown",
    copyCsv: "复制 CSV",
    download: "下载 CSV",
    compose: "发到对话",
    thId: "用例",
    thCategory: "类别",
    thInput: "输入",
    thExpected: "预期",
    thPriority: "优先级",
    note: "所有计算在本页完成，不上传任何数据。取消勾选的行不会进入复制、下载与发到对话的内容；CSV 带 BOM，可直接用 Excel 打开。",
    copied: "已复制到剪贴板",
    downloaded: "已下载 {name}",
    composed: "已预填到对话框（未发送）",
    composeFallback: "当前不在天工会话中：已改为复制到剪贴板",
    copyFailed: "复制失败，请手动选择表格内容",
    preset: "预设",
    empty: "(空)",
  },
  en: {
    title: "Boundary Lab",
    sub: "Enter a rule → get boundary / invalid / priority rows → copy or download. All local.",
    field: "Field",
    type: "Type",
    min: "Min",
    max: "Max",
    decimals: "Decimals",
    required: "Required",
    values: "Enum values (comma separated)",
    pattern: "Pattern (regex, optional)",
    generate: "Generate",
    cases: "cases",
    copyMd: "Copy Markdown",
    copyCsv: "Copy CSV",
    download: "Download CSV",
    compose: "Send to chat",
    thId: "ID",
    thCategory: "Category",
    thInput: "Input",
    thExpected: "Expected",
    thPriority: "Priority",
    note: "Everything runs locally — nothing is uploaded. Unchecked rows are excluded from copy, download and chat. CSV includes a BOM so Excel opens it correctly.",
    copied: "Copied to clipboard",
    downloaded: "Downloaded {name}",
    composed: "Prefilled into the chat input (not sent)",
    composeFallback: "Not running inside Tiangong: copied to clipboard instead",
    copyFailed: "Copy failed — select the table manually",
    preset: "Preset",
    empty: "(empty)",
  },
};

const STORAGE = { config: "tg-boundary-lab:config", lang: "tg-boundary-lab:lang" };

const els = {
  lang: document.querySelector("#lang"),
  presets: document.querySelector("#presets"),
  field: document.querySelector("#field"),
  type: document.querySelector("#type"),
  min: document.querySelector("#min"),
  max: document.querySelector("#max"),
  decimals: document.querySelector("#decimals"),
  required: document.querySelector("#required"),
  values: document.querySelector("#values"),
  pattern: document.querySelector("#pattern"),
  wrapMin: document.querySelector("#wrap-min"),
  wrapMax: document.querySelector("#wrap-max"),
  wrapDecimals: document.querySelector("#wrap-decimals"),
  wrapValues: document.querySelector("#wrap-values"),
  wrapPattern: document.querySelector("#wrap-pattern"),
  generate: document.querySelector("#generate"),
  error: document.querySelector("#error"),
  status: document.querySelector("#status"),
  count: document.querySelector("#count"),
  p0: document.querySelector("#p0count"),
  p1: document.querySelector("#p1count"),
  p2: document.querySelector("#p2count"),
  tbody: document.querySelector("#tbody"),
  copyMd: document.querySelector("#copy-md"),
  copyCsv: document.querySelector("#copy-csv"),
  download: document.querySelector("#download"),
  compose: document.querySelector("#compose"),
};

function readStored(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeStored(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 存储不可用时仅影响下次打开时的回填，不影响生成。
  }
}

let lang = readStored(STORAGE.lang, "zh") === "en" ? "en" : "zh";
let config = { ...DEFAULT_CONFIG, ...(readStored(STORAGE.config, {}) || {}) };
let result = null;
let activePreset = "amount";
let statusTimer = null;

const t = () => UI[lang];

function setStatus(message, tone = "ok") {
  els.status.textContent = message;
  els.status.style.color = tone === "error" ? "var(--p0)" : "var(--ok)";
  if (statusTimer) clearTimeout(statusTimer);
  statusTimer = setTimeout(() => {
    els.status.textContent = "";
  }, 3200);
}

function applyStaticText() {
  const dict = t();
  document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  els.lang.textContent = lang === "zh" ? "EN" : "中文";
  for (const node of document.querySelectorAll("[data-i18n]")) {
    const key = node.dataset.i18n;
    if (dict[key]) node.textContent = dict[key];
  }
}

function syncFormFromConfig() {
  els.field.value = config.field ?? "";
  els.type.value = config.type ?? "number";
  els.min.value = config.min ?? "";
  els.max.value = config.max ?? "";
  els.decimals.value = String(config.decimals ?? 0);
  els.required.checked = Boolean(config.required);
  els.values.value = Array.isArray(config.values) ? config.values.join(", ") : config.values ?? "";
  els.pattern.value = config.pattern ?? "";
  updateFieldVisibility();
}

function readForm() {
  return {
    field: els.field.value.trim(),
    type: els.type.value,
    min: els.min.value.trim() === "" ? null : els.min.value.trim(),
    max: els.max.value.trim() === "" ? null : els.max.value.trim(),
    decimals: Number(els.decimals.value),
    required: els.required.checked,
    values: els.values.value,
    pattern: els.pattern.value.trim(),
    unit: config.unit ?? "",
  };
}

function updateFieldVisibility() {
  const type = els.type.value;
  const isDate = type === "date";
  const isEnum = type === "enum";
  const isString = type === "string";

  els.wrapMin.classList.toggle("hidden", isEnum);
  els.wrapMax.classList.toggle("hidden", isEnum);
  els.wrapDecimals.classList.toggle("hidden", type !== "decimal");
  els.wrapValues.classList.toggle("hidden", !isEnum);
  els.wrapPattern.classList.toggle("hidden", !isString);

  els.min.placeholder = isDate ? "2026-01-01" : isString ? "2" : "0.01";
  els.max.placeholder = isDate ? "2026-12-31" : isString ? "20" : "99999.99";
  els.field.placeholder = "amount";
}

function renderPresets() {
  const dict = t();
  els.presets.textContent = "";
  for (const preset of PRESETS) {
    const button = document.createElement("button");
    button.type = "button";
    button.id = `preset-${preset.id}`;
    button.className = `chip${preset.id === activePreset ? " active" : ""}`;
    button.textContent = preset.label[lang] ?? preset.label.zh;
    button.title = `${dict.preset}: ${preset.config.field}`;
    button.addEventListener("click", () => applyPreset(preset.id));
    els.presets.append(button);
  }
}

function applyPreset(id) {
  const preset = presetById(id);
  if (!preset) return;
  activePreset = id;
  config = { ...preset.config };
  syncFormFromConfig();
  renderPresets();
  regenerate();
}

function regenerate() {
  const draft = readForm();
  try {
    result = generate(draft, lang);
    config = { ...result.config };
    els.error.textContent = "";
  } catch (error) {
    els.error.textContent = error.message;
    result = null;
    els.tbody.textContent = "";
    updateSummary();
    return;
  }
  writeStored(STORAGE.config, config);
  renderTable();
  updateSummary();
}

function selectedRows() {
  return result ? result.rows.filter((row) => row.include !== false) : [];
}

function updateSummary() {
  const rows = selectedRows();
  els.count.textContent = String(rows.length);
  els.p0.textContent = `P0 ${rows.filter((row) => row.priority === "P0").length}`;
  els.p1.textContent = `P1 ${rows.filter((row) => row.priority === "P1").length}`;
  els.p2.textContent = `P2 ${rows.filter((row) => row.priority === "P2").length}`;
  const disabled = rows.length === 0;
  for (const button of [els.copyMd, els.copyCsv, els.download, els.compose]) button.disabled = disabled;
}

function renderTable() {
  const dict = UI[lang];
  const emptyLabel = dict.empty;
  els.tbody.textContent = "";
  if (!result) return;

  for (const row of result.rows) {
    const tr = document.createElement("tr");
    if (row.include === false) tr.classList.add("off");

    const tdCheck = document.createElement("td");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = row.include !== false;
    checkbox.setAttribute("aria-label", `${row.id} ${row.category}`);
    checkbox.addEventListener("change", () => {
      row.include = checkbox.checked;
      tr.classList.toggle("off", !checkbox.checked);
      updateSummary();
    });
    tdCheck.append(checkbox);

    const tdId = document.createElement("td");
    tdId.className = "id";
    tdId.textContent = row.id;

    const tdCategory = document.createElement("td");
    tdCategory.textContent = row.category;

    const tdInput = document.createElement("td");
    tdInput.className = "input";
    const code = document.createElement("code");
    if (row.input === "") {
      code.textContent = emptyLabel;
      code.classList.add("empty");
    } else {
      code.textContent = row.input.length > 64 ? `${row.input.slice(0, 61)}…` : row.input;
      code.title = row.input;
    }
    tdInput.append(code);

    const tdExpected = document.createElement("td");
    tdExpected.textContent = row.expected;
    if (row.note) {
      const note = document.createElement("span");
      note.textContent = ` · ${row.note}`;
      note.style.color = "var(--dim)";
      tdExpected.append(note);
    }

    const tdPriority = document.createElement("td");
    const badge = document.createElement("span");
    badge.className = `badge ${row.priority}`;
    badge.textContent = row.priority;
    tdPriority.append(badge);

    tr.append(tdCheck, tdId, tdCategory, tdInput, tdExpected, tdPriority);
    els.tbody.append(tr);
  }
}

async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // 退回 execCommand
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.append(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  } catch {
    return false;
  }
}

async function withMarkdown(action) {
  if (!result) return;
  const markdown = toMarkdown(result);
  await action(markdown);
}

els.generate.addEventListener("click", regenerate);
els.lang.addEventListener("click", () => {
  lang = lang === "zh" ? "en" : "zh";
  writeStored(STORAGE.lang, lang);
  applyStaticText();
  renderPresets();
  if (result) regenerate();
});

for (const node of [els.field, els.min, els.max, els.values, els.pattern]) {
  node.addEventListener("input", () => {
    activePreset = "";
    renderPresets();
    regenerate();
  });
}
for (const node of [els.type, els.decimals]) {
  node.addEventListener("change", () => {
    updateFieldVisibility();
    activePreset = "";
    renderPresets();
    regenerate();
  });
}
els.required.addEventListener("change", regenerate);

els.copyMd.addEventListener("click", async () => {
  await withMarkdown(async (markdown) => {
    const ok = await copyText(markdown);
    setStatus(ok ? t().copied : t().copyFailed, ok ? "ok" : "error");
  });
});

els.copyCsv.addEventListener("click", async () => {
  if (!result) return;
  const ok = await copyText(toCsv(result));
  setStatus(ok ? t().copied : t().copyFailed, ok ? "ok" : "error");
});

els.download.addEventListener("click", () => {
  if (!result) return;
  const name = `boundary-${result.config.field || "field"}.csv`;
  const blob = new Blob([toCsv(result)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  setStatus(t().downloaded.replace("{name}", name));
});

async function composeToChat() {
  if (!result) return { ok: false, reason: "empty" };
  const markdown = toMarkdown(result);
  const bridge = window.TiangongBridge;
  if (bridge?.context) {
    await bridge.compose(markdown);
    return { ok: true, via: "bridge", characters: markdown.length };
  }
  const copied = await copyText(markdown);
  return { ok: copied, via: "clipboard", characters: markdown.length };
}

els.compose.addEventListener("click", async () => {
  const outcome = await composeToChat();
  if (outcome.ok && outcome.via === "bridge") setStatus(t().composed);
  else if (outcome.ok) setStatus(t().composeFallback);
  else setStatus(t().copyFailed, "error");
});

// 供 plugin.js 的 action 调用
window.__tgBoundary = {
  state: () => ({ config, lang, result }),
  matrix: () =>
    result
      ? {
          config: result.config,
          lang: result.lang,
          summary: result.summary,
          rows: result.rows.map((row) => ({ ...row, include: row.include !== false })),
        }
      : null,
  setConfig: (patch) => {
    config = { ...config, ...(patch ?? {}) };
    syncFormFromConfig();
    regenerate();
    return window.__tgBoundary.matrix();
  },
  applyPreset: (id) => {
    const preset = presetById(id);
    if (!preset) throw new Error(`未知预设：${id}`);
    applyPreset(id);
    return window.__tgBoundary.matrix();
  },
  getMarkdown: () => (result ? toMarkdown(result) : ""),
  getCsv: () => (result ? toCsv(result) : ""),
  compose: composeToChat,
};

applyStaticText();
syncFormFromConfig();
renderPresets();
regenerate();

if (!document.documentElement.dataset.theme) {
  document.documentElement.dataset.theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
