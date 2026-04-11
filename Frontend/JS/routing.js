// Simple routing helpers aware of language prefix
function detectLangFromPath(){
	const p = window.location.pathname.split('/').filter(Boolean);
	if(p[0] === 'en' || p[0] === 'jp' || p[0] === 'ja') return p[0] === 'ja' ? 'jp' : p[0];
	return null;
}

function buildPath(page, lang){
	// page: '', 'about', 'projects', 'cv'
	const slug = page && page !== 'index' ? page : '';
	if(lang) return '/' + lang + (slug ? ('/' + slug) : '/');
	return '/' + (slug ? slug : '');
}

function navigateTo(page){
	const lang = window.i18nGetLang ? window.i18nGetLang() : detectLangFromPath();
	const path = buildPath(page, lang);
	window.location.href = path;
}

// Expose helpers for inline use
window.navigateTo = navigateTo;
window.buildPath = buildPath;

function buildProjectPath(slug, lang){
	const l = lang || (window.i18nGetLang ? window.i18nGetLang() : detectLangFromPath());
	if(l) return '/' + l + '/projects/' + slug;
	return '/projects/' + slug;
}

function navigateToProject(slug){
	const lang = window.i18nGetLang ? window.i18nGetLang() : detectLangFromPath();
	const path = buildProjectPath(slug, lang);
	window.location.href = path;
}

window.navigateToProject = navigateToProject;
window.buildProjectPath = buildProjectPath;

