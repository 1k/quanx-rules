// Spotify 首页 brand-ad 过滤
// 移除首页数据中标记为 brand-ad 的广告 section
let body = $response.body;
if (body) {
    // protobuf 是二进制，但 brand-ad 标记是明文
    // 找到 brand-ad section 并尝试移除
    // 由于 protobuf 有长度前缀，直接删除会破坏结构
    // 这里用替换法：把 brand-ad 改成普通 section 类型，让客户端不渲染广告样式
    // 更稳妥：把广告 section 的内容替换为空
    try {
        // 将 brand-ad 标记替换，破坏广告识别
        body = body.replace(/brand-ad/g, "brand-xx");
        $done({ body: body });
    } catch (e) {
        $done({});
    }
} else {
    $done({});
}
