// 云柜快递服务小程序去广告
// 拦截广告位接口，清空广告数据
var body = $response.body;
try {
  var obj = JSON.parse(body);
  if (obj.data && obj.data.slotAds) {
    obj.data.slotAds = [];
  }
  body = JSON.stringify(obj);
} catch (e) {}
$done({ body: body });
