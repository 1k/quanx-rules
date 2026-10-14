// Spotify 首页 brand-ad 卡片去除 — casita/v1/home/default protobuf 感知移除
// 原理：home/default 顶层 field 1 内含 31 个重复 field 1 的 section，
// 其中第 2 个的 URI 以 |brand-ad 结尾。整段丢弃并重算长度，
// 其余 30 个 section 原样保留。不是字符串替换，不破坏 protobuf 结构。
// 托管：用户自有仓库 1k/quanx-rules/scripts/spotify-home-noads.js（mirror-first，不引第三方源）
function varintRead(buf, pos) {
  var res = 0, shift = 0;
  while (true) {
    var b = buf[pos++];
    res += (b & 0x7f) * Math.pow(2, shift);
    if (!(b & 0x80)) break;
    shift += 7;
  }
  return [res, pos];
}
function varintWrite(n) {
  var out = [];
  while (true) {
    var b = n % 128;
    n = Math.floor(n / 128);
    if (n === 0) { out.push(b); break; }
    out.push(b + 128);
  }
  return out;
}
function tagBytes(field, wt) { return varintWrite(field * 8 + wt); }
// 解析一层 protobuf，返回 [{field, wt, raw(完整原始字节), val(字节数组或数值)}]
function parseLayer(buf) {
  var fields = [], pos = 0;
  while (pos < buf.length) {
    var start = pos, t = varintRead(buf, pos); pos = t[1];
    var tag = t[0], field = Math.floor(tag / 8), wt = tag % 8;
    var val, end;
    if (wt === 0) { var v = varintRead(buf, pos); val = v[0]; pos = v[1]; end = pos; }
    else if (wt === 2) { var l = varintRead(buf, pos); pos = l[1]; var len = l[0]; val = buf.slice(pos, pos + len); pos += len; end = pos; }
    else if (wt === 5) { val = buf.slice(pos, pos + 4); pos += 4; end = pos; }
    else if (wt === 1) { val = buf.slice(pos, pos + 8); pos += 8; end = pos; }
    else { break; } // 未知 wire type：放弃改写，原样返回
    fields.push({ field: field, wt: wt, raw: buf.slice(start, end), val: val });
  }
  return fields;
}
function containsBrandAd(bytes) {
  var needle = [124, 98, 114, 97, 110, 100, 45, 97, 100]; // "|brand-ad"
  outer: for (var i = 0; i + needle.length <= bytes.length; i++) {
    for (var j = 0; j < needle.length; j++) if (bytes[i + j] !== needle[j]) continue outer;
    return true;
  }
  return false;
}
function stripBrandAd(buf) {
  var top = parseLayer(buf);
  var changed = false;
  var out = [];
  for (var i = 0; i < top.length; i++) {
    var f = top[i];
    if (f.field === 1 && f.wt === 2) {
      var sections = parseLayer(f.val);
      var kept = [];
      for (var k = 0; k < sections.length; k++) {
        if (sections[k].field === 1 && sections[k].wt === 2 && containsBrandAd(sections[k].val)) { changed = true; continue; }
        kept.push(sections[k]);
      }
      if (changed) {
        var inner = [];
        for (var k = 0; k < kept.length; k++) for (var b = 0; b < kept[k].raw.length; b++) inner.push(kept[k].raw[b]);
        var tb = tagBytes(1, 2).concat(varintWrite(inner.length)).concat(inner);
        for (var b = 0; b < tb.length; b++) out.push(tb[b]);
        continue;
      }
    }
    for (var b = 0; b < f.raw.length; b++) out.push(f.raw[b]);
  }
  return changed ? out : null;
}
(function () {
  var body = $response.body;
  var buf = [];
  for (var i = 0; i < body.length; i++) buf.push(body.charCodeAt(i) & 0xff);
  var stripped = stripBrandAd(buf);
  if (!stripped) { $done({}); return; }
  var s = "";
  for (var i = 0; i < stripped.length; i++) s += String.fromCharCode(stripped[i]);
  $done({ body: s });
})();
