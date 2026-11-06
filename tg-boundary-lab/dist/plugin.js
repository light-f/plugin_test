// 天工插件 SDK 接入：把生成能力暴露给 Agent。
// 规则：action 必须在 connect() 之前注册。
(function () {
  const bridge = window.TiangongBridge;
  if (!bridge) return;

  function api() {
    if (!window.__tgBoundary) throw new Error("页面尚未就绪，请稍后重试");
    return window.__tgBoundary;
  }

  bridge.onAction("getMatrix", async () => {
    const matrix = api().matrix();
    if (!matrix) throw new Error("还没有生成结果，请先调用 setConfig 或 applyPreset");
    return matrix;
  });

  bridge.onAction("setConfig", async (input) => {
    const patch = input && typeof input === "object" ? input : {};
    const allowed = ["field", "type", "min", "max", "decimals", "required", "values", "pattern"];
    const clean = {};
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(patch, key)) clean[key] = patch[key];
    }
    if (!Object.keys(clean).length) throw new Error("没有可应用的字段，请至少传 field/type/min/max 之一");
    return api().setConfig(clean);
  });

  bridge.onAction("applyPreset", async (input) => {
    const name = input && typeof input === "object" ? input.preset : input;
    if (!name) throw new Error("缺少 preset，例如 amount / integer / filesize / date / string / id / enum");
    return api().applyPreset(String(name));
  });

  bridge.onAction("composeCases", async () => {
    const outcome = await api().compose();
    return { composed: outcome.ok, via: outcome.via, characters: outcome.characters ?? 0 };
  });

  bridge.onAction("getCsv", async () => ({ csv: api().getCsv() }));

  async function initialize() {
    const context = await bridge.connect();
    if (!context) return;
    if (context.theme) document.documentElement.dataset.theme = context.theme;
    bridge.onThemeChange((theme) => {
      if (theme) document.documentElement.dataset.theme = theme;
    });
  }

  initialize().catch(() => {
    // 未连接时页面仍可独立使用，不打断本地计算。
  });
})();
