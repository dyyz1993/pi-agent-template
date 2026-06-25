/**
 * 小红书 DOM 提取表达式
 *
 * 作为 eval 表达式注入浏览器执行，返回 JSON 字符串。
 * 多重 selector 兜底 → 通用 <img>/<a> 退化，保证不空手。
 */

export const XHS_EXTRACT_EXPR = `JSON.stringify((function(){
  var notes = [];

  // 策略 1：小红书新版 feed 卡片
  var cards = document.querySelectorAll('section.note-item, div.note-item, .feeds-page section, .note-item');
  cards.forEach(function(card){
    try {
      var a = card.querySelector('a.cover, a[href*="/explore/"], a[href*="/discovery/item/"], a[href*="/search_result/"]');
      var img = card.querySelector('img');
      var titleEl = card.querySelector('.title, .footer .title, .desc, .note-text, h3');
      var authorEl = card.querySelector('.author-wrapper .name, .author .name, .user-nickname, .name');
      var likeEl = card.querySelector('.like-wrapper .count, .like-wrapper .like-text, .count, .like-text');
      var title = titleEl ? titleEl.textContent.trim() : (img ? (img.alt||'').trim() : '');
      var href = a ? a.href : '';
      var cover = img ? (img.src||img.getAttribute('data-src')||'') : '';
      if (!cover) {
        var bg = card.querySelector('[style*="background-image"]');
        if (bg) { var m = bg.style.backgroundImage.match(/url\\(["']?(.+?)["']?\\)/); if (m) cover = m[1]; }
      }
      if (href || cover) {
        notes.push({ title: title||'(无标题)', author: authorEl?authorEl.textContent.trim():'', noteUrl: href, coverUrl: cover, likes: likeEl?likeEl.textContent.trim():'' });
      }
    } catch(e){}
  });

  // 策略 2：搜索结果/瀑布流通用
  if (notes.length === 0) {
    document.querySelectorAll('a[href*="/explore/"], a[href*="/discovery/item/"], a[href*="/search_result/"]').forEach(function(a){
      try {
        var img = a.querySelector('img') || (a.parentElement && a.parentElement.querySelector('img'));
        var title = img ? (img.alt||'').trim() : a.textContent.trim().slice(0,40);
        var cover = img ? (img.src||img.getAttribute('data-src')||'') : '';
        if (a.href) notes.push({ title: title||'(无标题)', author:'', noteUrl: a.href, coverUrl: cover, likes:'' });
      } catch(e){}
    });
  }

  // 策略 3：通用退化
  if (notes.length === 0) {
    document.querySelectorAll('img').forEach(function(img){
      try {
        var src = img.src || img.getAttribute('data-src') || '';
        if (!src || src.indexOf('data:')===0 || img.width<80) return;
        var link = img.closest('a');
        notes.push({ title: (img.alt||'').trim().slice(0,40)||'(无标题)', author:'', noteUrl: link?link.href:location.href, coverUrl: src, likes:'' });
      } catch(e){}
    });
  }

  // 去重
  var seen = {}; var uniq = [];
  notes.forEach(function(n){
    var key = n.noteUrl || n.coverUrl;
    if (key && !seen[key]) { seen[key]=1; uniq.push(n); }
  });

  return { notes: uniq, pageUrl: location.href, pageTitle: document.title, count: uniq.length };
})())`;

export const XHS_SCROLL_EXPR = `JSON.stringify((function(){
  var before = document.body.scrollHeight;
  window.scrollBy(0, 1200);
  return { scrolled: true, heightBefore: before, heightAfter: document.body.scrollHeight };
})())`;
