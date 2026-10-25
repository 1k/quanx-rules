// YunGui pickup code: capture + Safari copy page (self-written, no upstream).
//
// QX rewrite_local:
//   capture (list):
//     ^https://mapi2\.yun-gui\.com/ygmapi/wechat/getNotTakeExpresses url script-response-body https://raw.githubusercontent.com/1k/quanx-rules/main/scripts/yungui-pickup.js
//   capture (detail):
//     ^https://mapi2\.yun-gui\.com/ygmapi/v2/express/getExpressDetail url script-response-body https://raw.githubusercontent.com/1k/quanx-rules/main/scripts/yungui-pickup.js
//   copy page (open in Safari: https://mapi2.yun-gui.com/ygmapi/pickup-code):
//     ^https://mapi2\.yun-gui\.com/ygmapi/pickup-code url script-response-body https://raw.githubusercontent.com/1k/quanx-rules/main/scripts/yungui-pickup.js
//
// Design notes:
// - Only pickup code, express number, site and stored time are read.
//   No phone number, no full response is stored.
// - The list endpoint is authoritative for unpicked parcels: on success the
//   whole stored list is replaced, so after pickup + one more mini-program
//   open, the old code is cleared automatically.
// - The detail endpoint only upserts one item.
// - The copy page shows stored time, expiry (stored + 24h) and status,
//   never the capture time.
// - IMPORTANT (2026-10-25 fix): the final HTML must be pure ASCII.
//   All Chinese in the output is written as numeric HTML entities, and
//   esc() entity-encodes any non-ASCII value coming from the API (e.g.
//   site names). This keeps the page readable even when the response
//   pipeline mangles UTF-8 bytes, which produced mojibake before.
// - Capture never changes the API response body, so the mini program
//   itself is unaffected.

var KEY = "yungui_pickup_codes";
var DAY_MS = 24 * 3600 * 1000;

// HTML-escape + entity-encode every non-ASCII char, so the output
// HTML is pure ASCII and cannot be mojibake-d by a charset conversion.
function esc(s) {
  var str = String(s == null ? "" : s);
  var out = "";
  for (var i = 0; i < str.length; i++) {
    var ch = str.charAt(i);
    var code = str.charCodeAt(i);
    if (ch === "&") out += "&amp;";
    else if (ch === "<") out += "&lt;";
    else if (ch === ">") out += "&gt;";
    else if (ch === '"') out += "&quot;";
    else if (code > 127) out += "&#" + code + ";";
    else out += ch;
  }
  return out;
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

// Stored time to ms. List gives a 13-digit ms timestamp; detail gives
// "2026-10-25 10:56:05" (Beijing time), parsed as UTC+8.
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
  if (!ms) return "&#26410;&#30693;";
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
      '<p class="empty">&#26242;&#26080;&#26410;&#21462;&#20214;&#12290;<br>&#20808;&#25171;&#24320;&#19968;&#27425;&#23567;&#31243;&#24207;&#65292;&#22238;&#26469;&#21047;&#26032;&#26412;&#39029;&#12290;</p>';
  } else {
    for (var i = 0; i < list.length; i++) {
      var it = list[i];
      cards +=
        '<div class="card">' +
        '<div class="code">' + esc(it.code) + "</div>" +
        '<div class="meta">&#36816;&#21333;&#65306;' + esc(it.expressNumber) + "</div>" +
        '<div class="meta">&#26588;&#28857;&#65306;' + esc(it.site) + "</div>" +
        '<div class="meta">&#20837;&#26588;&#65306;' + esc(fmt(it.storedMs)) + "</div>" +
        '<div class="meta">&#21040;&#26399;&#65306;' + esc(fmt(it.storedMs + DAY_MS)) + "</div>" +
        '<div class="status" data-stored="' + it.storedMs + '"></div>' +
        "</div>";
    }
  }
  var html =
    "<!DOCTYPE html><html lang=\"zh-CN\"><head><meta charset=\"utf-8\">" +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    "<title>&#26410;&#21462;&#20214;&#21462;&#20214;&#30721;</title><style>" +
    "body{font-family:-apple-system,Helvetica,Arial,sans-serif;margin:24px 16px;color:#222}" +
    "h1{font-size:20px} .hint{font-size:14px;color:#666;line-height:1.6}" +
    ".card{border:1px solid #ddd;border-radius:12px;padding:16px;margin:16px 0}" +
    ".code{font-size:40px;font-weight:700;letter-spacing:4px;margin:8px 0}" +
    ".meta{font-size:15px;color:#444;line-height:1.7}" +
    ".status{font-size:16px;font-weight:600;margin-top:8px}" +
    ".ok{color:#1a7f37} .exp{color:#cf222e} .empty{font-size:16px;color:#666;line-height:1.8}" +
    "</style></head><body>" +
    "<h1>&#26410;&#21462;&#20214;&#21462;&#20214;&#30721;</h1>" +
    '<p class="hint">&#38271;&#25353;&#21462;&#20214;&#30721;&#21487;&#25335;&#36125;&#12290;&#21462;&#23436;&#20214;&#21518;&#37325;&#36827;&#19968;&#27425;&#23567;&#31243;&#24207;&#65292;&#26087;&#30721;&#20250;&#34987;&#21047;&#25481;&#12290;</p>' +
    cards +
    "<script>" +
    "var DAY=86400000;var els=document.querySelectorAll('.status');" +
    "for(var i=0;i<els.length;i++){" +
    "var s=+els[i].getAttribute('data-stored');" +
    "var left=s+DAY-Date.now();" +
    "if(left<=0){els[i].innerHTML='&#24050;&#36807;&#26399;';els[i].className='status exp';}" +
    "else{var h=Math.floor(left/3600000);var m=Math.floor(left%3600000/60000);" +
    "els[i].innerHTML='&#26410;&#36807;&#26399;&#65292;&#21097;&#20313;'+h+'&#23567;&#26102;'+m+'&#20998;';els[i].className='status ok';}" +
    "}" +
    "<\/script></body></html>";
  $done({ body: html });
}

function main() {
  var url = ($request && $request.url) || "";
  if (url.indexOf("pickup-code") !== -1) {
    renderPage();
    return;
  }
  var body = ($response && $response.body) || "";
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
    // Parse failure: pass through unchanged.
  }
  $done({ body: body });
}

main();
