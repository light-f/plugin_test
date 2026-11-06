import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_CONFIG,
  LABELS,
  PRESETS,
  generate,
  isIsoDate,
  presetById,
  shiftDate,
  toCsv,
  toMarkdown,
} from "../boundary-core.js";

const findRow = (result, catKey, input) => result.rows.find((row) => row.catKey === catKey && row.input === String(input));

test("金额预设：两位小数的上下界与精度越界都被覆盖", () => {
  const result = generate(presetById("amount").config, "zh");
  assert.equal(findRow(result, "atMin", "0.01").expected.startsWith("接受"), true);
  assert.match(findRow(result, "belowMin", "0.00").expected, /拒绝/);
  assert.match(findRow(result, "atMax", "99999.99").expected, /接受/);
  assert.match(findRow(result, "aboveMax", "100000.00").expected, /拒绝/);
  assert.match(findRow(result, "extraPrecision", "0.010").expected, /拒绝/);
  assert.match(findRow(result, "empty", "").expected, /拒绝/);
  assert.match(findRow(result, "nonNumeric", "abc").expected, /拒绝/);
});

test("整数区间：小数字段与小数值、零值都判为非法", () => {
  const result = generate(presetById("integer").config, "en");
  const floatRow = findRow(result, "floatOnInt", "1.5");
  assert.ok(floatRow, "应生成整数字段的小数用例");
  assert.match(floatRow.expected, /^reject/);
  assert.match(findRow(result, "zero", "0").expected, /^reject/);
  assert.match(findRow(result, "atMin", "1").expected, /^accept/);
  assert.match(findRow(result, "atMax", "999").expected, /^accept/);
});

test("数值区间：负数在非负区间下才算越界", () => {
  const positive = generate({ field: "n", type: "number", min: 0, max: 10, required: true }, "zh");
  assert.ok(findRow(positive, "negative", "-1"), "下限为 0 时应生成负值用例");
  assert.match(findRow(positive, "negative", "-1").expected, /拒绝/);

  const signed = generate({ field: "n", type: "number", min: -10, max: 10, required: true }, "zh");
  assert.equal(findRow(signed, "negative", "-1"), undefined, "允许负数时不应生成 -1 拒绝用例");
  assert.match(findRow(signed, "zero", "0").expected, /接受/);
});

test("日期：跨月减一天正确，非法日期与非 ISO 格式被拒绝", () => {
  assert.equal(shiftDate("2026-03-01", -1), "2026-02-28");
  assert.equal(shiftDate("2026-12-31", 1), "2027-01-01");
  assert.equal(shiftDate("2024-03-01", -1), "2024-02-29", "闰年应正确");

  const result = generate({ field: "d", type: "date", min: "2026-03-01", max: "2026-03-31", required: true }, "zh");
  assert.equal(findRow(result, "beforeMin", "2026-02-28").catKey, "beforeMin");
  assert.match(findRow(result, "beforeMin", "2026-02-28").expected, /拒绝/);
  assert.match(findRow(result, "afterMax", "2026-04-01").expected, /拒绝/);
  assert.match(findRow(result, "invalidDate", "2026-02-30").expected, /拒绝/);
  assert.match(findRow(result, "wrongFormat", "31/12/2026").expected, /拒绝/);
  assert.equal(findRow(result, "atMin", "2026-03-01").expected.startsWith("接受"), true);
});

test("字符串：长度边界按字符数精确生成", () => {
  const result = generate({ field: "s", type: "string", min: 2, max: 5, required: true }, "zh");
  assert.equal(findRow(result, "belowMinLength", "a").input.length, 1);
  assert.equal(findRow(result, "atMinLength", "aa").input.length, 2);
  assert.equal(findRow(result, "atMaxLength", "aaaaa").input.length, 5);
  assert.equal(findRow(result, "aboveMaxLength", "aaaaaa").input.length, 6);
  assert.match(findRow(result, "belowMinLength", "a").expected, /拒绝/);
  assert.match(findRow(result, "aboveMaxLength", "aaaaaa").expected, /拒绝/);
  assert.match(findRow(result, "whitespace", "   ").expected, /拒绝/);
  assert.match(findRow(result, "specialChars", "<script>alert(1)</script>").expected, /转义/);
  assert.match(findRow(result, "unicode", "张三·😀").expected, /接受/);
});

test("ID 预设：格式规则同时给出非法串与合法样例", () => {
  const result = generate(presetById("id").config, "zh");
  assert.match(findRow(result, "patternInvalid", "!!!bad id!!!").expected, /拒绝/);
  assert.match(findRow(result, "validValue", "valid_id-01").expected, /接受/);
});

test("枚举：每个取值各一条，并覆盖枚举外、大小写、首尾空格", () => {
  const result = generate({ field: "status", type: "enum", values: ["draft", "active", "archived"], required: true }, "en");
  for (const value of ["draft", "active", "archived"]) {
    const row = result.rows.find((item) => item.catKey === "validValue" && item.input === value);
    assert.ok(row, `${value} 应有一条合法用例`);
    assert.match(row.expected, /^accept/);
  }
  assert.match(findRow(result, "unknownEnum", "unknown_value").expected, /^reject/);
  assert.match(findRow(result, "caseVariant", "DRAFT").expected, /^reject/);
  assert.match(findRow(result, "padded", " draft ").expected, /^reject/);
  assert.match(findRow(result, "empty", "").expected, /^reject/);
});

test("非必填字段：空值应被判为可接受", () => {
  const result = generate({ field: "note", type: "string", min: 1, max: 10, required: false }, "zh");
  assert.match(findRow(result, "empty", "").expected, /接受/);
});

test("结果不含重复的类别 + 输入组合，摘要数量自洽", () => {
  for (const preset of PRESETS) {
    const result = generate(preset.config, "zh");
    const keys = result.rows.map((row) => `${row.catKey}|${row.input}`);
    assert.equal(new Set(keys).size, keys.length, `${preset.id} 不应出现重复用例`);
    assert.equal(result.summary.total, result.rows.length);
    assert.equal(result.summary.p0 + result.summary.p1 + result.summary.p2, result.rows.length);
    assert.ok(result.rows.every((row) => row.id.startsWith("TC-")), "每条用例应有编号");
  }
});

test("中英文输出：表头与判定文案随语言切换", () => {
  const zh = generate(presetById("integer").config, "zh");
  const en = generate(presetById("integer").config, "en");
  assert.equal(zh.lang, "zh");
  assert.equal(en.lang, "en");
  assert.match(zh.rows[0].expected, /接受|拒绝/);
  assert.match(en.rows[0].expected, /accept|reject/);
  assert.equal(LABELS.zh.headers.input, "输入");
  assert.equal(LABELS.en.headers.input, "Input");
});

test("非法配置被拒绝：区间倒置、枚举为空、日期格式错误、长度为负", () => {
  assert.throws(() => generate({ field: "n", type: "number", min: 10, max: 1 }), /下限不能大于上限/);
  assert.throws(() => generate({ field: "e", type: "enum", values: [] }), /枚举类型至少需要一个取值/);
  assert.throws(() => generate({ field: "d", type: "date", min: "2026/01/01", max: "2026-12-31" }), /YYYY-MM-DD/);
  assert.throws(() => generate({ field: "s", type: "string", min: -1, max: 5 }), /不能为负/);
  assert.throws(() => generate({ field: "d", type: "date", min: "2026-05-01", max: "2026-04-01" }), /下限不能晚于上限/);
});

test("日期合法性判断：存在性校验而不是仅正则", () => {
  assert.equal(isIsoDate("2026-02-28"), true);
  assert.equal(isIsoDate("2026-02-30"), false);
  assert.equal(isIsoDate("2026-13-01"), false);
  assert.equal(isIsoDate("2026-2-1"), false);
});

test("Markdown 导出：包含表头，竖线被转义，取消勾选的用例被排除", () => {
  const result = generate(presetById("string").config, "zh");
  const md = toMarkdown(result);
  assert.match(md, /### nickname · string/);
  assert.match(md, /\| 用例 \| 类别 \|/);

  const special = result.rows.find((row) => row.catKey === "specialChars");
  special.input = "a|b";
  special.include = true;
  assert.match(toMarkdown(result), /a\\\|b/);

  result.rows[0].include = false;
  assert.equal(toMarkdown(result).includes(result.rows[0].id), false, "取消勾选的行不应出现在导出里");
});

test("CSV 导出：带 BOM、逗号与引号正确转义", () => {
  const result = generate(presetById("string").config, "en");
  const csv = toCsv(result);
  assert.equal(csv.charCodeAt(0), 0xfeff, "应以 BOM 开头，便于 Excel 打开");
  assert.match(csv, /^﻿ID,Category,nickname,Expected,Priority,Note/);

  const row = result.rows.find((item) => item.catKey === "specialChars");
  const escaped = toCsv({ ...result, rows: [{ ...row, input: 'a,b"c' }] });
  assert.match(escaped, /"a,b""c"/, "包含逗号与引号的输入应被正确转义");
});

test("默认配置可直接生成，预设都能定位", () => {
  const result = generate(DEFAULT_CONFIG, "en");
  assert.ok(result.rows.length >= 8);
  for (const preset of PRESETS) {
    assert.equal(presetById(preset.id).id, preset.id);
  }
  assert.equal(presetById("missing"), null);
});
