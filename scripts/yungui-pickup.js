// 云柜取件码：抓码 + Safari 复制页（自写，无上游）
//
// 用法（QuantumultX rewrite_local）：
//   抓码（列表）：
//     ^https://mapi2\.yun-gui\.com/ygmapi/wechat/getNotTakeExpresses url script-response-body https://raw.githubusercontent.com/1k/quanx-rules/main/scripts/yungui-pickup.js
//   抓码（详情）：
//     ^https://mapi2\.yun-gui\.com/ygmapi/v2/express/getExpressDetail url script-response-body https://raw.githubusercontent.com/1k/quanx-rules/main/scripts/yungui-pickup.js
//   复制页（Safari 打开 https://mapi2.yun-gui.com/ygmapi/pickup-code）：
//     ^https://mapi2\.yun-gui\.com/ygmapi/pickup-code url script-response-header https://raw.githubusercontent.com/1k/quanx-rules/main/scripts/yungui-pickup.js
//     ^https://mapi2\.yun-gui\.com/ygmapi/pickup-code url script-response-body https://raw.githubusercontent.com/1k/quanx-rules/main/scripts/yungui-pickup.js
//
// 设计：
// - 只取取件码、运单号、柜点、入柜时间四样，不碰手机号，不记整段响应。
// - 列表接口是未取件权威：返回成功时整批替换存档，取完件后重进小程序，
//   列表变空，旧码自动被刷掉。
// - 详情接口只做单条合并，不清空其他条目。
// - 复制页不显示抓取时间，只显示入柜时间、到期时间（入柜 + 24 小时）、
//   状态（未过期显示剩余时间，已过期标红）。
// - 抓码不改动接口响应原文，小程序正常显示不受影响。

var KEY = "yungui_pickup_codes";
var DAY_MS = 24 * 3600 * 1000;

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function load() {
  try {
    var raw = $prefs.valueForKey(KEY);
    if (!raw) return [];
    var list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch (e) {
    return [];
  }
}

function save(list) {
  try {
    $prefs.setValueForKey(JSON.stringify(list), KEY);
  } catch (e) {}
}

// 入柜时间统一转成毫秒时间戳。列表给的是 13 位毫秒时间戳，
// 详情给的是 "2026-10-25 10:56:05"（北京时间），按 UTC+8 解析。
function toMs(v) {
  if (typeof v === "number" && v > 0) {
    return v < 1e12 ? v * 1000 : v;
  }
  if (typeof v === "string") {
    var m = v.match(/(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
    if (m) {
      return (
        Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]) -
        8 * 3600 * 1000
      );
    }
    var n = parseInt(v, 10);
    if (!isNaN(n) && n > 0) return n < 1e12 ? n * 1000 : n;
  }
  return 0;
}

function fmt(ms) {
  if (!ms) return "未知";
  try {
    return new Date(ms).toLocaleString("zh-CN", {
      timeZone: "Asia/Shanghai",
      hour12: false,
    });
  } catch (e) {
    return new Date(ms).toLocaleString();
  }
}

function renderPage() {
  var list = load().slice();
  list.sort(function (a, b) {
    return a.storedMs + DAY_MS - (b.storedMs + DAY_MS);
  });
  var cards = "";
  if (list.length === 0) {
    cards =
      '<p class="empty">暂无未取件。<br>先打开一次小程序，回来刷新本页。</p>';
  } else {
    for (var i = 0; i < list.length; i++) {
      var it = list[i];
      cards +=
        '<div class="card">' +
        '<div class="code">' + esc(it.code) + '</div>' +
        '<div class="meta">运单：' + esc(it.expressNumber) + '</div>' +
        '<div class="meta">柜点：' + esc(it.site) + '</div>' +
        '<div class="meta">入柜：' + esc(fmt(it.storedMs)) + '</div>' +
        '<div class="meta">到期：' + esc(fmt(it.storedMs + DAY_MS)) + '</div>' +
        '<div class="status" data-stored="' + it.storedMs + '"></div>' +
        "</div>";
    }
  }
  var html =
    "<!DOCTYPE html><html lang=\"zh-CN\"><head><meta charset=\"utf-8\">" +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    "<title>取件码</title><style>" +
    "body{font-family:-apple-system,Helvetica,Arial,sans-serif;margin:24px 16px;color:#222}" +
    "h1{font-size:20px} .hint{font-size:14px;color:#666;line-height:1.6}" +
    ".card{border:1px solid #ddd;border-radius:12px;padding:16px;margin:16px 0}" +
    ".code{font-size:40px;font-weight:700;letter-spacing:4px;margin:8px 0}" +
    ".meta{font-size:15px;color:#444;line-height:1.7}" +
    ".status{font-size:16px;font-weight:600;margin-top:8px}" +
    ".ok{color:#1a7f37} .exp{color:#cf222e} .empty{font-size:16px;color:#666;line-height:1.8}" +
    "</style></head><body>" +
    "<h1>未取件取件码</h1>" +
    '<p class="hint">长按取件码可拷贝。取完件后重进一次小程序，旧码会被刷掉。</p>' +
    cards +
    "<script>" +
    "var DAY=86400000;var els=document.querySelectorAll('.status');" +
    "for(var i=0;i<els.length;i++){" +
    "var s=+els[i].getAttribute('data-stored');" +
    "var left=s+DAY-Date.now();" +
    "if(left<=0){els[i].textContent='已过期';els[i].className='status exp';}" +
    "else{var h=Math.floor(left/3600000);var m=Math.floor(left%3600000/60000);" +
    "els[i].textContent='未过期，剩余'+h+'小时'+m+'分';els[i].className='status ok';}" +
    "}" +
    "<\/script></body></html>";
  $done({ body: html });
}

function main() {
  var url = ($request && $request.url) || "";
  // script-response-header 阶段：只有响应头，没有响应体，
  // 在这里把复制页的 Content-Type 换成 HTML，Safari 才会按页面渲染。
  if (typeof $response === "undefined" || typeof $response.body === "undefined") {
    try {
      var headers = $response.headers || {};
      headers["Content-Type"] = "text/html; charset=utf-8";
      $done({ headers: headers });
    } catch (e) {
      $done({});
    }
    return;
  }
  if (url.indexOf("pickup-code") !== -1) {
    renderPage();
    return;
  }
  var body = $response.body || "";
  try {
    var json = JSON.parse(body);
    if (json && json.status === "00" && json.data) {
      if (url.indexOf("getNotTakeExpresses") !== -1 && Array.isArray(json.data.rows)) {
        var fresh = [];
        for (var i = 0; i < json.data.rows.length; i++) {
          var r = json.data.rows[i];
          var code = r.checknumber || r.checkNumber;
          if (!code) continue;
          fresh.push({
            code: String(code),
            expressNumber: String(r.expcode || r.expressNumber || ""),
            site: String(r.deviceName || r.address || ""),
            storedMs: toMs(r.storedtime != null ? r.storedtime : r.createtime),
          });
        }
        save(fresh);
      } else if (url.indexOf("getExpressDetail") !== -1) {
        var d = json.data;
        var dcode = d.checkNumber || d.checknumber;
        if (dcode) {
          var list = load();
          var exp = String(d.expressNumber || "");
          var next = [];
          for (var j = 0; j < list.length; j++) {
            if (list[j].expressNumber !== exp) next.push(list[j]);
          }
          next.push({
            code: String(dcode),
            expressNumber: exp,
            site: String(d.detailAddress || ""),
            storedMs: toMs(d.storeTime),
          });
          save(next);
        }
      }
    }
  } catch (e) {
    // 解析失败时不改动任何东西，原样放行。
  }
  $done({ body: body });
}

main();
