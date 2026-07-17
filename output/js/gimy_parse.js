function parse(url) {
    var header = {
        "User-Agent": "Mozilla/5.0 (Android TV) Chrome",
        "Referer": "https://gimytube.com",
        "Origin": "https://gimytube.com"
    };
    var opt = { headers: header, timeout: 6000 };
    var html = get(url, opt);
    if (!html) return '';
    // 直接匹配明文m3u8
    var directM3u8 = html.match(/https?:\/\/[^"']+\.m3u8[^"']*/);
    if (directM3u8 && directM3u8[0]) return directM3u8[0];
    // 匹配base64加密play_data
    var playDataMatch = html.match(/play_data\s*[:=]\s*["']([A-Za-z0-9+/=]+)["']/);
    if (playDataMatch && playDataMatch[1]) {
        var decodeStr = base64.decode(playDataMatch[1]);
        var m3u8Url = decodeStr.match(/https?:\/\/[^\s"]+\.m3u8/);
        if (m3u8Url) return m3u8Url[0];
    }
    return '';
}
