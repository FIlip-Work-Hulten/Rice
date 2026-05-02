// md-loader.js — simple markdown loader using marked + DOMPurify
(function () {
  async function renderMD(container) {
    const mdPath = container.dataset.md;
    if (!mdPath) return;
    try {
      const res = await fetch(mdPath);
      if (!res.ok) throw new Error(res.statusText);
      const md = await res.text();
      // If the fetched file is HTML, inject sanitized directly; otherwise parse markdown
      const isHtml = mdPath.trim().toLowerCase().endsWith('.html') || /<[^>]+>/.test(md.slice(0, 200));
      let html;
      if (isHtml) {
        html = md;
      } else {
        html = (typeof marked === 'function') ? marked.parse(md) : md;
      }
      const safe = (window.DOMPurify && DOMPurify.sanitize) ? DOMPurify.sanitize(html) : html;
      container.innerHTML = safe;
    } catch (err) {
      container.textContent = 'Failed to load content: ' + err.message;
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    // find single container or all elements with data-md
    const targets = document.querySelectorAll('[data-md]');
    targets.forEach((el) => renderMD(el));
  });
})();
