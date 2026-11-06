/*!
 * tiangong-bridge.js — 天工插件视图 SDK（协议版本 1）
 *
 * 规范副本：chatgpt-next-web/public/plugin-sdk/tiangong-bridge.js
 * 插件作者拷贝此文件到自己的站点使用；协议变更先改规范副本，各拷贝须保持逐字一致。
 *
 * 用法：
 *   const ctx = await TiangongBridge.connect();   // 不在天工中运行时 3 秒后返回 null
 *   TiangongBridge.onAction("listBuilds", async (input) => ({ ... }));
 *   await TiangongBridge.compose("要预填到对话框的文本");
 *   const cred = await TiangongBridge.getSecret("basic"); // {username,password} | {token} | null
 *   TiangongBridge.notify("已复制");
 *   // 宿主返回的错误带 err.code（JSON-RPC 错误码），如 -32003 表示无权限
 *   TiangongBridge.onThemeChange((theme) => ...);
 */
(function (global) {
  "use strict";

  var PROTOCOL_VERSION = 1;
  var CONNECT_TIMEOUT_MS = 3000;
  var REQUEST_TIMEOUT_MS = 30000;

  var nativeHost = global.__TIANGONG_NATIVE__;
  if (!nativeHost || nativeHost.transportVersion !== 1) nativeHost = null;
  var hostOrigin = null; // native 握手完成标记；真实来源由原生宿主校验
  var nextId = 1;
  var pending = {};
  var actionHandlers = {};
  var themeListeners = [];
  var initListeners = [];
  var context = null;
  var connectPromise = null;
  var connecting = false;

  function post(msg) {
    if (!nativeHost) return;
    // 原生邮箱不授予权限；宿主按真实安装、来源和文档代次校验消息。
    nativeHost.send(msg);
  }

  function request(method, params, timeoutMs) {
    return new Promise(function (resolve, reject) {
      if (!nativeHost) {
        reject(new Error("未运行在天工中"));
        return;
      }
      var id = "v" + nextId++;
      var timer = setTimeout(function () {
        delete pending[id];
        reject(new Error(method + " 超时"));
      }, timeoutMs || REQUEST_TIMEOUT_MS);
      pending[id] = { resolve: resolve, reject: reject, timer: timer };
      post({ jsonrpc: "2.0", id: id, method: method, params: params || {} });
    });
  }

  function respond(id, result, error) {
    var msg = { jsonrpc: "2.0", id: id };
    if (error) msg.error = error;
    else msg.result = result === undefined ? null : result;
    post(msg);
  }

  function handleHostRequest(msg) {
    if (msg.method !== "actions/call") {
      respond(msg.id, null, { code: -32601, message: "Method not found: " + msg.method });
      return;
    }
    var name = msg.params && msg.params.name;
    var handler = actionHandlers[name];
    if (!handler) {
      respond(msg.id, null, { code: -32601, message: "视图未注册动作处理器: " + name });
      return;
    }
    Promise.resolve()
      .then(function () {
        return handler((msg.params && msg.params.input) || {});
      })
      .then(
        function (result) {
          respond(msg.id, result);
        },
        function (err) {
          respond(msg.id, null, {
            code: -32000,
            message: (err && err.message) || String(err),
          });
        },
      );
  }

  function onMessage(msg) {
    if (!nativeHost) return;
    if (!msg || msg.jsonrpc !== "2.0") return;

    // 响应
    if (msg.id !== undefined && !msg.method) {
      var p = pending[msg.id];
      if (!p) return;
      delete pending[msg.id];
      clearTimeout(p.timer);
      if (msg.error) {
        var err = new Error(msg.error.message || "宿主返回错误");
        err.code = msg.error.code; // -32003 无权限 / -32602 参数错误 / -32601 未知方法
        p.reject(err);
      } else p.resolve(msg.result);
      return;
    }

    if (msg.method === "ui/initialize") {
      // 只接受 connect() 等待期内的首次握手：超时后页面已按「未在天工中」处理，
      // 迟到的握手若被接受，SDK 会处于页面不知情的半连接状态
      if (hostOrigin || !connecting) return;
      hostOrigin = "native";
      context = msg.params || {};
      initListeners.forEach(function (fn) {
        fn(context);
      });
      return;
    }
    if (!hostOrigin) return; // 握手前不处理其他消息

    if (msg.method === "ui/themeChanged") {
      var theme = msg.params && msg.params.theme;
      if (context) context.theme = theme;
      themeListeners.forEach(function (fn) {
        fn(theme);
      });
      return;
    }
    if (msg.id !== undefined && msg.method) handleHostRequest(msg);
  }

  if (nativeHost) nativeHost.subscribe(onMessage);

  var Bridge = {
    protocolVersion: PROTOCOL_VERSION,

    /** 与宿主握手。返回上下文；不在天工中运行时 3 秒后返回 null。 */
    connect: function () {
      if (connectPromise) return connectPromise;
      connectPromise = new Promise(function (resolve) {
        if (!nativeHost) {
          resolve(null);
          return;
        }
        var done = false;
        connecting = true;
        var timer = setTimeout(function () {
          if (!done) {
            done = true;
            connecting = false;
            resolve(null);
          }
        }, CONNECT_TIMEOUT_MS);
        initListeners.push(function (ctx) {
          if (done) return;
          done = true;
          connecting = false;
          clearTimeout(timer);
          resolve(ctx);
        });
        post({
          jsonrpc: "2.0",
          method: "ui/ready",
          params: {
            protocolVersion: PROTOCOL_VERSION,
            actions: Object.keys(actionHandlers),
          },
        });
      });
      return connectPromise;
    },

    get context() {
      return context;
    },

    /** 注册 agent 可调用的动作处理器（动作清单以 manifest 为准）。 */
    onAction: function (name, handler) {
      actionHandlers[name] = handler;
    },

    /** 向所在会话输入框追加文本，不发送。需要 chat.compose 权限。 */
    compose: function (text) {
      return request("chat/compose", { text: String(text) });
    },

    /** 读取 manifest 中本视图引用的插件凭据；未填写返回 null。 */
    getSecret: function (id) {
      return request("secrets/get", { id: id });
    },

    /** 在宿主显示一条提示（≤200 字）。 */
    notify: function (message) {
      return request("ui/notify", { message: String(message) });
    },

    onThemeChange: function (fn) {
      themeListeners.push(fn);
    },
  };

  global.TiangongBridge = Bridge;
})(typeof window !== "undefined" ? window : this);
