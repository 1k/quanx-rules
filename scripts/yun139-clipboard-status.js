/*
 * 移动云盘（139 云盘）：废掉剪切板状态查询的返回值
 *
 * App 启动时向 middle.yun.139.com/openapi/general/getStatus 查询
 * businessType=clipboard 的状态，未同意（status=0）就反复弹授权窗。
 * 本脚本仅对这一问把响应替换为失败结果：App 拿不到「未同意」结论，
 * 不弹窗；全程没有伪造同意、没有写入任何授权记录。
 * 其它 businessType 的同接口查询原样放行。
 */
var body = ($request && $request.body) || "";
if (body.indexOf("clipboard") !== -1) {
  $done({
    body: JSON.stringify({
      resultCode: 500,
      resultMsg: "error",
      resultData: null,
      msgId: "",
      success: false,
      code: "500"
    })
  });
} else {
  $done({});
}
