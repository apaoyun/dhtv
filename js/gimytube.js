var rule = {
    title: 'GimyTube剧迷',
    host: 'https://gimytube.com',
    url: '/browse/fyclass.html',
    searchUrl: '/search/-------------.html?wd=**',
    searchable: 2,
    quickSearch: 0,
    filterable: 0,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Android Mobile)',
        'Referer': 'https://gimytube.com/'
    },
    // 将你提供的 classes 转换为字符串
    class_name: '电影&电视剧&短剧&动漫&综艺&陆剧&韩剧&美剧&日剧&台剧&港剧&海外剧&纪录片&排行榜',
    class_url: '1&2&36&35&29&13&20&16&15&14&21&31&22&label/top',
    
    // 列表解析
    play_parse: true,
    lazy: "js:input = {parse:1,url:input,js:''}",
    limit: 6,
    
    // 首页与列表页规则
    double: true,
    推荐: '.card',
    一级: '.card;h3.card__title&&Text;img&&src;.card__badge&&Text;a&&href',
    
    // 详情页规则
    二级: {
        "title": "h1&&Text",
        "img": ".card__thumb img&&src",
        "desc": "p.card__meta&&Text",
        "content": ".plot&&Text", // 假设存在详情简介标签
        "tabs": ".play-tab span",
        "lists": ".play-list:eq(#id) a"
    },
    
    // 搜索规则
    搜索: '.card;h3.card__title&&Text;img&&src;.card__badge&&Text;a&&href'
};
