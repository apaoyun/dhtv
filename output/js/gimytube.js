function csp_gimytube() {
    let self = this;
    self.host = "https://gimytube.com";
    self.headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0.0.0 Safari/537.36",
        "Referer": self.host,
        "Accept-Language": "en-US,en;q=0.9"
    };

    // 分类列表
    self.category = async function(pg) {
        let res = request(`${self.host}/movies?page=${pg}`, self.headers);
        let items = xpath(res, "//div[contains(@class,'film-item')]");
        let arr = [];
        for (let item of items) {
            arr.push({
                name: trim(xpath(item, ".//h3[contains(@class,'film-title')]/a/text()")[0] || ""),
                pic: xpath(item, ".//img/@data-lazy-src")[0] || "",
                url: xpath(item, ".//a/@href")[0] || ""
            });
        }
        return arr;
    };

    // 搜索列表
    self.search = async function(wd, pg) {
        let kw = urlEncode(wd);
        let res = request(`${self.host}/search?q=${kw}&page=${pg}`, self.headers);
        let items = xpath(res, "//div[contains(@class,'film-item')]");
        let arr = [];
        for (let item of items) {
            arr.push({
                name: trim(xpath(item, ".//h3[contains(@class,'film-title')]/a/text()")[0] || ""),
                pic: xpath(item, ".//img/@data-lazy-src")[0] || "",
                url: xpath(item, ".//a/@href")[0] || ""
            });
        }
        return arr;
    };

    // 详情页
    self.detail = async function(url) {
        let res = request(self.host + url, self.headers);
        let videoKey = xpath(res, "//div.player-box/@data-video")[0] || url;
        return {
            desc: trim(xpath(res, "//div[contains(@class,'film-desc')]/text()")[0] || "暂无简介"),
            urls: [
                {
                    name: "正片播放",
                    url: videoKey
                }
            ]
        };
    };

    // 解析播放地址
    self.play = async function(url) {
        let html = request(self.host + url, self.headers);
        let m3u8 = "";
        // 第一层 直接匹配sources
        let s1 = match(html, /sources\s*:\s*\[\{"file":"(.*?)"/, 1);
        if (s1) m3u8 = s1;
        // 第二层 loadPlayer函数
        if (!m3u8) {
            let pcfg = match(html, /loadPlayer\((.*?)\)/, 1);
            if (pcfg) m3u8 = match(pcfg, /"file":"(.*?)"/, 1);
        }
        // 第三层 iframe兜底
        if (!m3u8) {
            let iframe = match(html, /<iframe.*?src="(https.*?)"/, 1);
            if (iframe) {
                let iframeHtml = request(iframe, self.headers);
                m3u8 = match(iframeHtml, /file:"(https.*?\.m3u8)"/, 1);
            }
        }
        return {
            url: m3u8,
            header: self.headers
        };
    };
}
