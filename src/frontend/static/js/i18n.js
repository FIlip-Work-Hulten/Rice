(function(){
  // Simple frontend i18n loader
  function detectLangFromPath(){
    const p = window.location.pathname.split('/').filter(Boolean);
    if(p[0] === 'en' || p[0] === 'jp' || p[0] === 'ja' || p[0] === 'sv') return p[0] === 'ja' ? 'jp' : p[0];
    return null;
  }

  function getLocaleUrl(lang){
    // Prefer language-prefixed path first (works when site is served under /en/ or /jp/),
    // then fall back to root-level Locales folder.
    return ['/static/locales/' + lang + '.json', '/' + lang + '/Locales/' + lang + '.json', '/Locales/' + lang + '.json'];
  }

  async function loadLocale(lang){
    try{
      const urls = getLocaleUrl(lang);
      for(const u of urls){
        try{
          const res = await fetch(u);
          if(res.ok) return await res.json();
        }catch(e){ /* try next */ }
      }
      throw new Error('Locale fetch failed for all candidates');
    }catch(e){
      console.warn('i18n: failed to load', lang, e);
      return null;
    }
  }

  function applyTranslations(locale){
    if(!locale) return;
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const val = locale[key];
      if(typeof val === 'string'){
        // prefer replacing textContent, but keep children for non-empty
        el.textContent = val;
      }
    });
    // alt text translations for images
    document.querySelectorAll('[data-i18n-alt]').forEach(el => {
      const key = el.getAttribute('data-i18n-alt');
      const val = locale[key];
      if(typeof val === 'string') el.setAttribute('alt', val);
    });
    // allow setting innerHTML when needed
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      const key = el.getAttribute('data-i18n-html');
      const val = locale[key];
      if(typeof val === 'string') el.innerHTML = val;
    });
    if(locale['title']) document.title = locale['title'];
  }

  function getPageSlug(){
    // return canonical page slug: home -> '', about -> about, projects -> projects, cv -> cv
    const p = window.location.pathname.split('/').filter(Boolean);
    if(p[0] === 'en' || p[0] === 'jp' || p[0] === 'ja' || p[0] === 'sv') p.shift();
    const slug = p[0] || '';
    return slug;
  }

  function setLanguage(lang){
    const slug = getPageSlug();
    window.location.href = '/' + lang + (slug ? ('/' + slug) : '/');
  }

  async function init(){
    const detected = detectLangFromPath() || localStorage.getItem('lang') || 'en';
    window.currentLang = detected;
    localStorage.setItem('lang', detected);
    const locale = await loadLocale(detected);
    applyTranslations(locale);
    // update lang switch control if present
    const sel = document.getElementById('lang-switch');
    if(sel) sel.value = detected;
  }

  // Expose API
  window.i18nInit = init;
  window.setLanguage = function(lang){ localStorage.setItem('lang', lang); setLanguage(lang); };
  window.i18nGetLang = function(){ return window.currentLang || detectLangFromPath() || 'en'; };
})();
