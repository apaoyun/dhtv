export default {
  async fetch(request) {
    const base = "https://gimytube.com";
    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36",
      Referer: base,
      "Accept-Language": "zh-TW,zh;q=0.9"
    };
    const urlObj = new URL(request.url);
    const page = urlObj.searchParams.get("page") || "1";
    const type = urlObj.searchParams.get("type") || "";

    // 网站侧边栏完整分类映射
    const typeMap = {
      top: "/label/top.html",
      tv: "/browse/2.html",
      short: "/browse/36.html",
      movie: "/browse/1.html",
      anime: "/browse/35.html",
      variety: "/browse/29.html",
      mainland: "/browse/13.html",
      kr: "/browse/20.html",
      us: "/browse/16.html",
      jp: "/browse/15.html",
      tw: "/browse/14.html",
      hk: "/browse/21.html",
      oversea: "/browse/31.html",
      doc: "/browse/22.html"
    };

    let targetUrl = base;
    if (type && typeMap[type]) {
      targetUrl = base + typeMap[type] + `?page=${page}`;
    }

    const res = await fetch(targetUrl, { headers });
    const html = await res.text();
    const vodList = [];

    // 遍历所有影片卡片
    const cardReg = /<article class="card[\s\S]*?<\/article>/g;
    let cardMatch;
    while ((cardMatch = cardReg.exec(html)) !== null) {
      const vodData = await parseSingleCard(cardMatch[0], base, headers);
      // 仅保留有播放地址的影片，无分集直接丢弃
      if (vodData && vodData.vod_play_url) {
        vodList.push(vodData);
      }
      await new Promise(s => setTimeout(s, 500));
    }

    const output = {
      site: "GimyTube劇迷",
      list: vodList
    };

    return new Response(JSON.stringify(output, null, 2), {
      headers: {
        "Content-Type": "application/json;charset=utf-8",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
};

// 解析单张卡片基础信息
async function parseSingleCard(cardHtml, base, headers) {
  // 详情链接 /title/数字.html
  const titleLinkMatch = cardHtml.match(/<a href="(\/title\/\d+\.html)"/);
  if (!titleLinkMatch) return null;
  const detailUrl = base + titleLinkMatch[1];

  // 封面图
  const imgMatch = cardHtml.match(/<img src="([^"]+)"/);
  const vod_pic = imgMatch ? imgMatch[1] : "";

  // 片名 card__title
  const nameMatch = cardHtml.match(/<h3 class="card__title">([\s\S]*?)<\/h3>/);
  const vod_name = nameMatch ? nameMatch[1].trim() : "";
  if (!vod_name) return null;

  // 更新备注 card__badge
  const badgeMatch = cardHtml.match(/<span class="card__badge">([^<]+)<\/span>/);
  const vod_remarks = badgeMatch ? badgeMatch[1].trim() : "";

  // 演员简介，清除html标签
  const metaMatch = cardHtml.match(/<p class="card__meta">([\s\S]*?)<\/p>/);
  let vod_content = "暫無簡介";
  if (metaMatch) vod_content = metaMatch[1].replace(/<.*?>/g, "").trim();

  // 获取分集播放线路
  const playStr = await getEpisodeList(detailUrl, base, headers);
  // 无分集直接返回null过滤本条
  if (!playStr) return null;

  return {
    vod_name,
    vod_pic,
    vod_remarks,
    vod_content,
    vod_play_url: playStr
  };
}

// 解析详情页 playlist-grid 分集链接
async function getEpisodeList(detailUrl, base, headers) {
  try {
    const resp = await fetch(detailUrl, { headers });
    const html = await resp.text();
    // 锁定分集容器
    const gridMatch = html.match(/<div class="playlist-grid">[\s\S]*?<\/div>/);
    if (!gridMatch) return "";
    const gridHtml = gridMatch[0];
    // 提取每一集 a标签
    const epReg = /<a href="(\/watch\/[^"]+)">([^<]+)<\/a>/g;
    let epMatch;
    const epArr = [];
    while ((epMatch = epReg.exec(gridHtml)) !== null) {
      const epName = epMatch[2].trim();
      const epUrl = base + epMatch[1];
      epArr.push(`${epName}$${epUrl}`);
    }
    return epArr.length > 0 ? epArr.join("#") : "";
  } catch (err) {
    return "";
  }
}
