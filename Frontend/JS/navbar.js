(function(){
  function makeNavbar(){
    return `
      <div class="navbar">
        <section>
          <img id="lang-icon" class="language icon" src="/img/gb.png" alt="language">
          <button class="navbar-button" data-page="" data-i18n="nav.home">Home</button>
          <button class="navbar-button" data-page="about" data-i18n="nav.about">About</button>
          <button class="navbar-button" data-page="projects" data-i18n="nav.projects">Projects</button>
          <button class="navbar-button" data-page="cv" data-i18n="nav.cv">CV</button>
          <select id="lang-switch" aria-label="Language switch" class="language-switcher"> 
          <option value="en"> 
            EN
          </option> <option value="jp"> 
            JP
          </option> 
          </select>
        </section>
      </div>
    `;
  }

  function attachHandlers(root){
    root.querySelectorAll('.navbar-button').forEach(btn=>{
      btn.addEventListener('click', function(e){
        const page = btn.getAttribute('data-page') || '';
        if(window.navigateTo) window.navigateTo(page);
        else window.location.href = '/' + page;
      });
    });
    const sel = root.querySelector('#lang-switch');
    const icon = root.querySelector('#lang-icon');
    if(sel){
      sel.addEventListener('change', function(){
        if(window.setLanguage) window.setLanguage(sel.value);
        else window.location.href = '/' + sel.value;
        // update icon immediately for visual feedback
        if(icon) updateIcon(sel.value);
      });
      // sync current language
      if(window.i18nGetLang) sel.value = window.i18nGetLang();
      if(icon) updateIcon(sel.value);
    }
    
    function updateIcon(lang){
      if(!icon) return;
      const l = (lang === 'ja') ? 'jp' : (lang || (window.i18nGetLang?window.i18nGetLang():'en'));
      if(l === 'en') icon.src = '/img/gb.png';
      else icon.src = '/img/jp.png';
      icon.alt = l === 'en' ? 'English' : '日本語';
    }
  }

  document.addEventListener('DOMContentLoaded', function(){
    const placeholder = document.getElementById('navbar-root');
    if(placeholder){
      placeholder.innerHTML = makeNavbar();
      attachHandlers(placeholder);
      // ensure i18n and routing scripts are available; if not, try to load
      if(typeof i18nInit === 'function'){
        i18nInit();
        // after i18n init, ensure icon matches current language
        if(window.i18nGetLang){
          const iconEl = placeholder.querySelector('#lang-icon');
          if(iconEl){
            const lang = window.i18nGetLang();
            iconEl.src = (lang === 'en') ? '/img/gb.png' : '/img/jp.png';
            iconEl.alt = (lang === 'en') ? 'English' : '日本語';
          }
        }
      }
    }
  });
})();
