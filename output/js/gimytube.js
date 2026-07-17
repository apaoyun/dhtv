var js = {
    class: function () {
        var opt = {
            headers: { "User-Agent": "Mozilla/5.0 (Android TV) AppleWebKit/537.36 Chrome 120" },
            timeout: 10000
        };
        var html = get(api, opt);
        var reg = /sidebar__item\".*?href=\"\/browse\/(\d+)\.html\".*?>([^<>]+)<\/span>/g;
        var arr, list = [];
        while ((arr = reg.exec(html)) != null) {
            var tid = arr[1];
            var tname = arr[2];
            if (!/首頁|排行榜/.test(tname))
                list.push({ type_id: tid, type_name: tname });
        }
        return JSON.stringify({ list: list });
    },
    list: function (tid, pg) {
        var opt = {
            headers: { "User-Agent": "Mozilla/5.0 (Android TV) AppleWebKit/537.36 Chrome 120" },
            timeout: 10000
        };
        var url = api + "/browse/" + tid + ".html?page=" + pg;
        var html = get(url, opt);
        var reg = /<article class=\"card.*?href=\"(\/title\/(\d+)\.html)\".*?img src=\"([^\"]+)\".*?alt=\"([^\"]+)\".*?card__badge\">([^<]+)<\/span.*?card__meta\">([^<]+)<\/p>/g;
        var arr, list = [];
        while ((arr = reg.exec(html)) != null) {
            list.push({
                vod_id: arr[2],
                vod_name: arr[4],
                vod_pic: arr[3],
                vod_remarks: arr[5],
                vod_actor: arr[6]
            });
        }
        var hasNext = /更多 ›/.test(html) ? pg + 1 : 0;
        return JSON.stringify({
            list: list,
            page: pg,
            pagecount: hasNext,
            limit: 18,
            total: 999
        });
    },
    search: function (wd, pg) {
        var opt = {
            headers: { "User-Agent": "Mozilla/5.0 (Android TV) AppleWebKit/537.36 Chrome 120" },
            timeout: 10000
        };
        var url = api + "/search/" + encodeURI(wd) + "-------------.html?page=" + pg;
        var html = get(url, opt);
        var reg = /<article class=\"card.*?href=\"(\/title\/(\d+)\.html)\".*?img src=\"([^\"]+)\".*?alt=\"([^\"]+)\".*?card__badge\">([^<]+)<\/span.*?card__meta\">([^<]+)<\/p>/g;
        var arr, list = [];
        while ((arr = reg.exec(html)) != null) {
            list.push({
                vod_id: arr[2],
                vod_name: arr[4],
                vod_pic: arr[3],
                vod_remarks: arr[5],
                vod_actor: arr[6]
            });
        }
        return JSON.stringify({
            list: list,
            page: pg,
            pagecount: 1,
            limit: 18
        });
    },
    detail: function (vid) {
        var opt = {
            headers: { "User-Agent": "Mozilla/5.0 (Android TV) AppleWebKit/537.36 Chrome 120" },
            timeout: 10000
        };
        var url = api + "/title/" + vid + ".html";
        var html = get(url, opt);
        var vod_name = html.match(/<h1.*?>([^<]+)<\/h1>/);
        vod_name = vod_name ? vod_name[1] : "未知影片";
        var vod_content = html.match(/<div class=\"desc.*?\">([\s\S]*?)<\/div>/);
        vod_content = vod_content ? htmlDecode(vod_content[1]).replace(/<[^>]+>/g, "") : "暫無簡介";
        var playReg = /<a href=\"(https:\/\/v\.gimy\.bot[^\"]+)\">([^<]+)<\/a>/g;
        var arr, playList = [];
        while ((arr = playReg.exec(html)) != null) {
            playList.push({ name: arr[2], url: arr[1] });
        }
        var vodPlayData = [{ from: "主線", url: playList }];
        return JSON.stringify({
            vod_name: vod_name,
            vod_content: vod_content,
            vod_play_data: vodPlayData
        });
    }
};
js
