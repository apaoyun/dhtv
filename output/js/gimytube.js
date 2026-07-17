var js = {
    class: function () {
        try {
            var api = "https://gimytube.com";
            var opt = {
                headers: { "User-Agent": "Mozilla/5.0 (Android TV) AppleWebKit/537.36 Chrome 120" },
                timeout: 10000
            };
            var html = get(api, opt);
            // 匹配侧边栏所有分类链接
            var reg = /sidebar__item[\s\S]*?href=\"\/browse\/(\d+)\.html\"[\s\S]*?>([^<>]+)<\/span>/g;
            var arr, list = [];
            while ((arr = reg.exec(html)) != null) {
                var tid = arr[1].trim();
                var tname = arr[2].trim();
                // 过滤首页、排行榜
                if (!/首頁|首页|排行榜/.test(tname) && tid && tname) {
                    list.push({ type_id: tid, type_name: tname });
                }
            }
            return JSON.stringify({ list: list });
        } catch (e) {
            return JSON.stringify({ list: [] });
        }
    },
    list: function (tid, pg) {
        try {
            pg = parseInt(pg) || 1;
            var api = "https://gimytube.com";
            var opt = {
                headers: { "User-Agent": "Mozilla/5.0 (Android TV) AppleWebKit/537.36 Chrome 120" },
                timeout: 10000
            };
            var url = api + "/browse/" + tid + ".html?page=" + pg;
            var html = get(url, opt);
            // 兼容所有 card card--c* 卡片，完全匹配页面结构
            var reg = /<article class=\"card card--c[\d]\"[\s\S]*?href=\"\/title\/(\d+)\.html\"[\s\S]*?img src=\"([^\"]+)\"[\s\S]*?alt=\"([^\"]+)\"[\s\S]*?card__badge\">([^<]+)<\/span[\s\S]*?card__meta\">([^<]+)<\/p>/g;
            var arr, list = [];
            while ((arr = reg.exec(html)) != null) {
                list.push({
                    vod_id: arr[1].trim(),
                    vod_name: arr[3].trim(),
                    vod_pic: arr[2].trim(),
                    vod_remarks: arr[4].trim(),
                    vod_actor: arr[5].trim()
                });
            }
            // 判断下一页
            var hasNext = /更多 ›/.test(html) ? pg + 1 : 0;
            return JSON.stringify({
                list: list,
                page: pg,
                pagecount: hasNext,
                limit: 18,
                total: 9999
            });
        } catch (e) {
            return JSON.stringify({ list: [], page: 1, pagecount: 0, limit: 18, total: 0 });
        }
    },
    search: function (wd, pg) {
        try {
            pg = parseInt(pg) || 1;
            var api = "https://gimytube.com";
            var opt = {
                headers: { "User-Agent": "Mozilla/5.0 (Android TV) AppleWebKit/537.36 Chrome 120" },
                timeout: 10000
            };
            // 官网标准搜索链接，修复原多余横线错误
            var url = api + "/search/" + encodeURIComponent(wd) + ".html?page=" + pg;
            var html = get(url, opt);
            var reg = /<article class=\"card card--c[\d]\"[\s\S]*?href=\"\/title\/(\d+)\.html\"[\s\S]*?img src=\"([^\"]+)\"[\s\S]*?alt=\"([^\"]+)\"[\s\S]*?card__badge\">([^<]+)<\/span[\s\S]*?card__meta\">([^<]+)<\/p>/g;
            var arr, list = [];
            while ((arr = reg.exec(html)) != null) {
                list.push({
                    vod_id: arr[1].trim(),
                    vod_name: arr[3].trim(),
                    vod_pic: arr[2].trim(),
                    vod_remarks: arr[4].trim(),
                    vod_actor: arr[5].trim()
                });
            }
            var hasNext = /更多 ›/.test(html) ? pg + 1 : 0;
            return JSON.stringify({
                list: list,
                page: pg,
                pagecount: hasNext,
                limit: 18,
                total: 9999
            });
        } catch (e) {
            return JSON.stringify({ list: [], page: 1, pagecount: 0, limit: 18, total: 0 });
        }
    },
    detail: function (vid) {
        try {
            var api = "https://gimytube.com";
            var opt = {
                headers: { "User-Agent": "Mozilla/5.0 (Android TV) AppleWebKit/537.36 Chrome 120" },
                timeout: 10000
            };
            var url = api + "/title/" + vid + ".html";
            var html = get(url, opt);

            // 影片标题
            var vod_name = html.match(/<h1[\s\S]*?>([^<]+)<\/h1>/);
            vod_name = vod_name ? vod_name[1].trim() : "未知影片";

            // 简介处理
            var vod_content = html.match(/<div class=\"desc[\s\S]*?\">([\s\S]*?)<\/div>/);
            vod_content = vod_content ? htmlDecode(vod_content[1]) : "暫無簡介";
            vod_content = vod_content.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

            // 抓取v.gimy.bot播放地址
            var playReg = /<a href=\"(https:\/\/v\.gimy\.bot[^\"]+)\">([^<]+)<\/a>/g;
            var arr, playList = [];
            while ((arr = playReg.exec(html)) != null) {
                let name = arr[2].trim();
                let playUrl = arr[1].trim();
                if (name && playUrl) playList.push({ name: name, url: playUrl });
            }
            var vodPlayData = [{ from: "主線", url: playList }];

            return JSON.stringify({
                vod_name: vod_name,
                vod_content: vod_content,
                vod_play_data: vodPlayData
            });
        } catch (e) {
            return JSON.stringify({
                vod_name: "讀取失敗",
                vod_content: "頁面獲取異常",
                vod_play_data: []
            });
        }
    }
};

// HTML實體解碼，處理繁體頁面轉義字符
function htmlDecode(str) {
    if (!str) return "";
    return str.replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, "\"")
        .replace(/&#39;/g, "'");
}
