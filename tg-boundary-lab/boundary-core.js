// 边界值 / 测试数据生成核心（纯逻辑，无 DOM、无网络，可直接单测）。
// 输入一份字段规则，输出可直接粘贴进用例库或 CSV 的边界值矩阵。

export const TYPES = ["number", "decimal", "date", "string", "enum"];

// 输出语言：外部开发者用英文，内部用中文，可切换。
export const LABELS = {
  zh: {
    headers: { id: "用例", category: "类别", input: "输入", expected: "预期", priority: "优先级", note: "备注" },
    cat: {
      belowMin: "低于下限",
      atMin: "等于下限",
      aboveMin: "下限 + 1",
      belowMax: "上限 - 1",
      atMax: "等于上限",
      aboveMax: "高于上限",
      zero: "零值",
      negative: "负值",
      empty: "空值",
      nonNumeric: "非数字",
      floatOnInt: "小数（整数字段）",
      huge: "超大值",
      extraPrecision: "超出小数位",
      scientific: "科学计数法",
      beforeMin: "早于下限",
      afterMax: "晚于上限",
      invalidDate: "非法日期",
      wrongFormat: "非 ISO 格式",
      belowMinLength: "长度不足",
      atMinLength: "等于最小长度",
      atMaxLength: "等于最大长度",
      aboveMaxLength: "超出最大长度",
      whitespace: "纯空格",
      specialChars: "特殊字符 / 注入串",
      unicode: "中文与 emoji",
      patternInvalid: "不符合格式规则",
      pattern: "不匹配格式规则",
      validValue: "合法枚举值",
      unknownEnum: "枚举外取值",
      caseVariant: "大小写变体",
      padded: "首尾带空格",
      atLimit: "等于上限",
      overLimit: "超出上限",
    },
    accept: "接受",
    reject: "拒绝",
    empty: "(空)",
    reason: {
      belowMin: "低于最小值",
      aboveMax: "高于最大值",
      nonNumeric: "不是数字",
      floatOnInt: "整数字段不接受小数",
      extraPrecision: "小数位超过限制",
      huge: "可能溢出或精度丢失",
      negative: "不允许负数",
      required: "必填字段不能为空",
      optional: "非必填，可接受空值",
      invalidDate: "日期不存在",
      wrongFormat: "需为 YYYY-MM-DD",
      tooShort: "长度小于最小值",
      tooLong: "长度大于最大值",
      whitespace: "应 trim 后校验必填",
      escape: "需转义输出，不应执行",
      valid: "在取值范围内",
      notInList: "不在枚举列表中",
      caseSensitive: "枚举区分大小写",
      shouldTrim: "应 trim 后比对",
      boundary: "边界内",
      zero: "边界内零值",
      scientific: "确认解析器是否支持",
      overLimit: "超过字节上限",
      unknown: "需人工确认",
    },
  },
  en: {
    headers: { id: "ID", category: "Category", input: "Input", expected: "Expected", priority: "Priority", note: "Note" },
    cat: {
      belowMin: "Below min",
      atMin: "At min",
      aboveMin: "Min + 1",
      belowMax: "Max - 1",
      atMax: "At max",
      aboveMax: "Above max",
      zero: "Zero",
      negative: "Negative",
      empty: "Empty",
      nonNumeric: "Not a number",
      floatOnInt: "Decimal on integer field",
      huge: "Huge value",
      extraPrecision: "Extra decimal places",
      scientific: "Scientific notation",
      beforeMin: "Before min",
      afterMax: "After max",
      invalidDate: "Invalid date",
      wrongFormat: "Non-ISO format",
      belowMinLength: "Too short",
      atMinLength: "At min length",
      atMaxLength: "At max length",
      aboveMaxLength: "Too long",
      whitespace: "Whitespace only",
      specialChars: "Special chars / injection",
      unicode: "Unicode & emoji",
      patternInvalid: "Pattern mismatch",
      pattern: "does not match pattern",
      validValue: "Valid enum value",
      unknownEnum: "Value outside enum",
      caseVariant: "Case variant",
      padded: "Padded with spaces",
      atLimit: "At limit",
      overLimit: "Over limit",
    },
    accept: "accept",
    reject: "reject",
    empty: "(empty)",
    reason: {
      belowMin: "below min",
      aboveMax: "above max",
      nonNumeric: "not a number",
      floatOnInt: "integer field rejects decimals",
      extraPrecision: "too many decimal places",
      huge: "possible overflow / precision loss",
      negative: "negative not allowed",
      required: "required field cannot be empty",
      optional: "optional field accepts empty",
      invalidDate: "date does not exist",
      wrongFormat: "expected YYYY-MM-DD",
      tooShort: "shorter than min length",
      tooLong: "longer than max length",
      whitespace: "should be trimmed before required check",
      escape: "must be escaped, not executed",
      valid: "within allowed range",
      notInList: "not in enum list",
      caseSensitive: "enum is case-sensitive",
      shouldTrim: "compare after trim",
      boundary: "within boundary",
      zero: "zero within range",
      scientific: "confirm parser support",
      overLimit: "exceeds byte limit",
      unknown: "manual confirmation needed",
    },
  },
};

export const PRESETS = [
  {
    id: "amount",
    label: { zh: "金额（两位小数）", en: "Amount (2dp)" },
    config: { field: "amount", type: "decimal", min: 0.01, max: 99999.99, decimals: 2, required: true, values: [] },
  },
  {
    id: "integer",
    label: { zh: "整数区间", en: "Integer range" },
    config: { field: "quantity", type: "number", min: 1, max: 999, decimals: 0, required: true, values: [] },
  },
  {
    id: "filesize",
    label: { zh: "文件大小", en: "File size" },
    config: { field: "file_size", type: "number", min: 0, max: 104857600, decimals: 0, required: true, unit: "bytes", values: [] },
  },
  {
    id: "date",
    label: { zh: "日期区间", en: "Date range" },
    config: { field: "start_date", type: "date", min: "2026-01-01", max: "2026-12-31", required: true, values: [] },
  },
  {
    id: "string",
    label: { zh: "字符串长度", en: "String length" },
    config: { field: "nickname", type: "string", min: 2, max: 20, required: true, values: [] },
  },
  {
    id: "id",
    label: { zh: "ID（格式校验）", en: "ID (pattern)" },
    config: {
      field: "user_id",
      type: "string",
      min: 8,
      max: 32,
      required: true,
      pattern: "^[A-Za-z0-9_-]+$",
      values: [],
    },
  },
  {
    id: "enum",
    label: { zh: "枚举", en: "Enum" },
    config: {
      field: "status",
      type: "enum",
      min: null,
      max: null,
      required: true,
      values: ["draft", "active", "archived"],
    },
  },
];

export const DEFAULT_CONFIG = PRESETS[0].config;

export function presetById(id) {
  return PRESETS.find((preset) => preset.id === id) ?? null;
}

function normalizeConfig(raw) {
  const config = { ...DEFAULT_CONFIG, ...(raw ?? {}) };
  const type = TYPES.includes(config.type) ? config.type : "number";
  const normalized = {
    field: String(config.field || "field").trim() || "field",
    type,
    min: config.min === null || config.min === undefined || config.min === "" ? null : config.min,
    max: config.max === null || config.max === undefined || config.max === "" ? null : config.max,
    decimals: Number.isInteger(Number(config.decimals)) ? Math.min(6, Math.max(0, Number(config.decimals))) : 0,
    required: Boolean(config.required),
    unit: typeof config.unit === "string" ? config.unit.trim() : "",
    pattern: typeof config.pattern === "string" ? config.pattern.trim() : "",
    values: Array.isArray(config.values)
      ? config.values.map((value) => String(value).trim()).filter(Boolean)
      : String(config.values ?? "")
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
  };

  if (type !== "enum") normalized.values = [];

  if (type === "enum") {
    if (!normalized.values.length) throw new Error("枚举类型至少需要一个取值");
  } else if (type === "date") {
    if (!isIsoDate(normalized.min) || !isIsoDate(normalized.max)) throw new Error("日期区间需要 YYYY-MM-DD 格式的下限与上限");
    if (normalized.min > normalized.max) throw new Error("下限不能晚于上限");
  } else {
    const min = Number(normalized.min);
    const max = Number(normalized.max);
    if (!Number.isFinite(min) || !Number.isFinite(max)) throw new Error("数值类型需要合法的下限与上限");
    if (min > max) throw new Error("下限不能大于上限");
    if (type === "string" && min < 0) throw new Error("字符串长度下限不能为负");
    if (type === "string" && (min !== Math.floor(min) || max !== Math.floor(max))) throw new Error("字符串长度必须是整数");
    normalized.min = min;
    normalized.max = max;
    if (type !== "string") normalized.decimals = Math.min(6, Math.max(0, normalized.decimals));
  }
  return normalized;
}

export function isIsoDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

export function shiftDate(iso, days) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function fixed(value, decimals) {
  return Number(value).toFixed(decimals);
}

function trimFloat(value) {
  const text = String(value);
  return text.includes(".") ? text.replace(/0+$/, "").replace(/\.$/, "") : text;
}

export function generate(rawConfig, lang = "zh") {
  const config = normalizeConfig(rawConfig);
  const L = LABELS[lang] ?? LABELS.zh;
  const rows = [];
  const seen = new Set();

  const add = (catKey, input, accepted, reasonKey, priority, note = "") => {
    const key = `${catKey}|${String(input)}`;
    if (seen.has(key)) return;
    seen.add(key);
    const verdict = accepted ? L.accept : L.reject;
    const reason = reasonKey ? ` · ${L.reason[reasonKey] ?? reasonKey}` : "";
    rows.push({
      id: `TC-${String(rows.length + 1).padStart(2, "0")}`,
      category: L.cat[catKey] ?? catKey,
      catKey,
      input: String(input),
      expected: `${verdict}${reason}`,
      priority,
      note,
    });
  };

  const { type, min, max, decimals, required, values, unit, pattern } = config;

  if (type === "number" || type === "decimal") {
    const step = type === "decimal" ? 1 / 10 ** decimals : 1;
    const fmt = (value) => (type === "decimal" ? fixed(value, decimals) : String(Math.round(value)));

    if (min !== 0) add("belowMin", fmt(min - step), false, "belowMin", "P0", unit);
    if (min >= 0) add("negative", "-1", false, "negative", "P1", unit);
    add("atMin", fmt(min), true, "boundary", "P0", unit);
    if (min + step <= max) add("aboveMin", fmt(min + step), true, "boundary", "P1", unit);
    if (max - step >= min) add("belowMax", fmt(max - step), true, "boundary", "P1", unit);
    add("atMax", fmt(max), true, "boundary", "P0", unit);
    add("aboveMax", fmt(max + step), false, "aboveMax", "P0", unit);
    if (min < 0 && max > 0) add("zero", fmt(0), true, "zero", "P1", unit);
    if (min > 0) add("zero", "0", false, "belowMin", "P1", unit);
    add("empty", "", !required, required ? "required" : "optional", "P1", unit);
    add("nonNumeric", "abc", false, "nonNumeric", "P1", unit);
    if (type === "number") {
      add("floatOnInt", fmt(min) + ".5", false, "floatOnInt", "P1", unit);
      add("huge", "1e15", false, "huge", "P2", unit);
    } else {
      add("extraPrecision", `${fixed(min, decimals)}0`, false, "extraPrecision", "P0", unit);
      add("scientific", "1e3", false, "scientific", "P2", unit);
    }
  }

  if (type === "date") {
    add("beforeMin", shiftDate(min, -1), false, "belowMin", "P0");
    add("atMin", min, true, "boundary", "P0");
    add("belowMax", shiftDate(max, -1), true, "boundary", "P1");
    add("atMax", max, true, "boundary", "P0");
    add("afterMax", shiftDate(max, 1), false, "aboveMax", "P0");
    add("invalidDate", "2026-02-30", false, "invalidDate", "P1");
    add("wrongFormat", "31/12/2026", false, "wrongFormat", "P1");
    add("empty", "", !required, required ? "required" : "optional", "P1");
  }

  if (type === "string") {
    const repeat = (n) => "a".repeat(Math.max(0, n));
    if (min > 0) add("belowMinLength", repeat(min - 1), false, "tooShort", "P0");
    add("atMinLength", repeat(min), true, "boundary", "P0");
    add("atMaxLength", repeat(max), true, "boundary", "P0");
    add("aboveMaxLength", repeat(max + 1), false, "tooLong", "P0");
    if (max - min > 1) add("aboveMin", repeat(min + 1), true, "boundary", "P2");
    add("empty", "", !required, required ? "required" : "optional", "P1");
    add("whitespace", "   ", false, "whitespace", "P1");
    add("specialChars", "<script>alert(1)</script>", true, "escape", "P1");
    add("unicode", "张三·😀", true, "valid", "P2");
    if (pattern) {
      add("patternInvalid", "!!!bad id!!!", false, "pattern", "P0");
      add("validValue", "valid_id-01", true, "valid", "P1");
    }
  }

  if (type === "enum") {
    for (const value of values.slice(0, 8)) add("validValue", value, true, "valid", "P0");
    add("empty", "", !required, required ? "required" : "optional", "P1");
    add("unknownEnum", "unknown_value", false, "notInList", "P0");
    const upper = values[0] ? values[0].toUpperCase() : "VALUE";
    if (upper !== values[0]) add("caseVariant", upper, false, "caseSensitive", "P1");
    add("padded", ` ${values[0] ?? "value"} `, false, "shouldTrim", "P2");
  }

  const summary = {
    total: rows.length,
    p0: rows.filter((row) => row.priority === "P0").length,
    p1: rows.filter((row) => row.priority === "P1").length,
    p2: rows.filter((row) => row.priority === "P2").length,
  };

  return { config, rows, summary, lang: LABELS[lang] ? lang : "zh" };
}

export function toMarkdown(result, { selectedOnly = true } = {}) {
  const { config, rows, lang } = result;
  const L = LABELS[lang] ?? LABELS.zh;
  const list = selectedOnly ? rows.filter((row) => row.include !== false) : rows;
  const header = `| ${L.headers.id} | ${L.headers.category} | \`${config.field}\` ${L.headers.input} | ${L.headers.expected} | ${L.headers.priority} |`;
  const divider = "| --- | --- | --- | --- | --- |";
  const body = list.map((row) => {
    const input = row.input === "" ? L.empty : row.input.replace(/\|/g, "\\|").replace(/\n/g, " ");
    const note = row.note ? ` ${row.note}` : "";
    return `| ${row.id} | ${row.category} | \`${input}\` | ${row.expected}${note ? ` (${note.trim()})` : ""} | ${row.priority} |`;
  });
  return [`### ${config.field} · ${config.type}`, "", header, divider, ...body].join("\n");
}

function csvCell(value) {
  const text = String(value).replace(/"/g, '""');
  return /[",\n]/.test(text) ? `"${text}"` : text;
}

export function toCsv(result, { selectedOnly = true, bom = true } = {}) {
  const { config, rows, lang } = result;
  const L = LABELS[lang] ?? LABELS.zh;
  const list = selectedOnly ? rows.filter((row) => row.include !== false) : rows;
  const head = [L.headers.id, L.headers.category, config.field, L.headers.expected, L.headers.priority, L.headers.note];
  const lines = [head.map(csvCell).join(",")];
  for (const row of list) {
    lines.push([row.id, row.category, row.input, row.expected, row.priority, row.note].map(csvCell).join(","));
  }
  return `${bom ? "\uFEFF" : ""}${lines.join("\r\n")}`;
}
