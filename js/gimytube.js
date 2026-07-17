var rule = {
    title: 'GimyTube',
    host: 'https://gimytube.com',
    homeUrl: '/',
    url: '/fyclass/fypage.html',
    searchUrl: '/search?q=**&page=fypage',
    searchable: 2,
    quickSearch: 0,
    filterable: 0,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Referer': 'https://gimytube.com/',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8'
    },
    // 主頁分類解析
    class_name: '電視劇&電影&動漫&綜藝',
    class_url: '2&1&35&29',
    // 列表解析邏輯 (請根據實際網頁的卡片節點調整)
    play_parse: true,
    lazy: "",
    limit: 6,
    推荐: '.grid .card; .card__title&&Text; img&&src; .card__badge&&Text; a&&href',
    一级: '.grid .card; .card__title&&Text; img&&src; .card__badge&&Text; a&&href',
    二级: {
        title: 'h1&&Text',
        img: '.st-cover&&src',
        desc: '.st-info&&Text',
        content: '.st-content&&Text',
        tabs: '.nav-tabs a',
        lists: '.st-playlist:eq(#id) a'
    },
    // 搜索解析
    搜索: '.search__result .card; .card__title&&Text; img&&src; .card__badge&&Text; a&&href'
};
