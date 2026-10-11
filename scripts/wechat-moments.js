// 微信朋友圈去广告脚本
// 清除时间线返回数据中的广告字段
try {
  let obj = JSON.parse($response.body);
  // 朋友圈广告通常在 advertised_list 或类似字段中
  if (obj.advertised_list) obj.advertised_list = [];
  if (obj.adList) obj.adList = [];
  // 遍历 timeline 中的单条动态，清除广告标记
  if (obj.object_list) {
    obj.object_list = obj.object_list.filter(item => {
      // 广告动态通常带有 weapp 或 ad 相关标记
      let s = JSON.stringify(item);
      return !/advertise/i.test(s);
    });
  }
  $done({ body: JSON.stringify(obj) });
} catch (e) {
  $done({});
}
