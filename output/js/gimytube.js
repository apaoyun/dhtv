function csp_gimytube() {
    let self = this;
    self.host = "https://gimytube.com";
    self.headers = {
        "User-Agent": "Mozilla/5.0 Mobile Chrome",
        "Referer": self.host
    };

    // 首页分类
    self.category = async function(pg) {
        let res = request(`${self.host}/movies?page=${pg}`, self.headers);
        let list = xpath(res, "//div[contains(@class,'movie-item')]");
        let arr = [];
        for(let item of list){
            arr.push({
                name: trim(xpath(item, "//h3/a/text()")[0]),
                pic: xpath(item, "//img/@data-src")[0],
                url: xpath(item, "//a/@href")[0]
            })
        }
        return arr;
    }

    // 搜索
    self.search = async function(wd, pg) {
        let res = request(`${self.host}/search?q=${urlEncode(wd)}&page=${pg}`, self.headers);
        let list = xpath(res, "//div[contains(@class,'movie-item')]");
        let arr = [];
        for(let item of list){
            arr.push({
                name: trim(xpath(item, "//h3/a/text()")[0]),
                pic: xpath(item, "//img/@data-src")[0],
                url: xpath(item, "//a/@href")[0]
            })
        }
        return arr;
    }

    // 详情分集
    self.detail = async function(url) {
        let res = request(self.host + url, self.headers);
        let eps = xpath(res, "//div.play-source/a");
        let episodes = [];
        for(let ep of eps){
            episodes.push({
                name: trim(xpath(ep, "./text()")[0]),
                url: xpath(ep, "./@href")[0]
            })
        }
        return {
            desc: trim(xpath(res, "//div[@class='desc']/text()")[0] || ""),
            urls: episodes
        }
    }

    // 解析播放源
    self.play = async function(url) {
        let html = request(self.host + url, self.headers);
        let playJson = match(html, /var playerConfig = (.*?);/, 1);
        let videoUrl = "";
        if(playJson){
            videoUrl = match(playJson, /src:\"(.*?)\"/, 1);
        }else{
            videoUrl = match(html, /file:\"(https.*?\.m3u8)\"/, 1);
        }
        return {
            url: videoUrl,
            header: self.headers
        }
    }
}
