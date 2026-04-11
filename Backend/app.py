from pathlib import Path
from flask import Flask, send_from_directory, abort, redirect

BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = BASE_DIR / "Frontend"
HTML_DIR = FRONTEND_DIR / "HTML"
# Projects live under Frontend/Projects in this repo layout.
PROJECTS_DIR = FRONTEND_DIR / "Projects"

app = Flask(__name__, static_folder=str(FRONTEND_DIR), static_url_path="/static")

ALLOWED_LANGS = {'en', 'jp', 'ja'}


def _send_html_from_candidates(filename):
	candidates = [HTML_DIR / filename, PROJECTS_DIR / filename]
	for p in candidates:
		if p.exists():
			return send_from_directory(str(p.parent), p.name)
	return None


@app.route("/")
def index():
	resp = _send_html_from_candidates("index.html")
	if resp:
		return resp
	abort(404)


@app.route("/about")
def about():
	resp = _send_html_from_candidates("about.html")
	if resp:
		return resp
	abort(404)


@app.route("/projects")
def projects():
	resp = _send_html_from_candidates("projects.html")
	if resp:
		return resp
	abort(404)


@app.route("/cv")
def cv():
	resp = _send_html_from_candidates("CV.html") or _send_html_from_candidates("cv.html")
	if resp:
		return resp
	abort(404)


@app.route("/projects/<slug>")
def project_slug(slug):
	# Try several filename variants to map clean slugs to HTML files.
	candidates = [f"{slug}.html", f"{slug.capitalize()}.html"]
	for fn in candidates:
		for base in (PROJECTS_DIR, HTML_DIR):
			p = base / fn
			if p.exists():
				return send_from_directory(str(base), fn)
	abort(404)


# Language-prefixed routes: /en/..., /jp/...
def _is_lang_ok(lang):
	return lang in ALLOWED_LANGS


@app.route('/<lang>/')
def index_lang(lang):
	if not _is_lang_ok(lang):
		abort(404)
	return index()


@app.route('/<lang>/about')
def about_lang(lang):
	if not _is_lang_ok(lang):
		abort(404)
	return about()


@app.route('/<lang>/projects')
def projects_lang(lang):
	if not _is_lang_ok(lang):
		abort(404)
	return projects()


@app.route('/<lang>/cv')
def cv_lang(lang):
	if not _is_lang_ok(lang):
		abort(404)
	return cv()


@app.route('/<lang>/projects/<slug>')
def project_slug_lang(lang, slug):
	if not _is_lang_ok(lang):
		abort(404)
	return project_slug(slug)


@app.route('/<lang>/<path:path>')
def catch_all_lang(lang, path):
	if not _is_lang_ok(lang):
		abort(404)
	# Delegate to the existing catch-all logic but strip the language prefix
	return catch_all(path)


# Serve static asset folders explicitly so relative links work under language prefixes
@app.route('/CSS/<path:filename>')
def css_static(filename):
	p = FRONTEND_DIR / 'CSS' / filename
	if p.exists():
		return send_from_directory(str(FRONTEND_DIR / 'CSS'), filename)
	abort(404)


@app.route('/JS/<path:filename>')
def js_static(filename):
	p = FRONTEND_DIR / 'JS' / filename
	if p.exists():
		return send_from_directory(str(FRONTEND_DIR / 'JS'), filename)
	abort(404)


@app.route('/img/<path:filename>')
def img_static(filename):
	p = FRONTEND_DIR / 'img' / filename
	if p.exists():
		return send_from_directory(str(FRONTEND_DIR / 'img'), filename)
	abort(404)


@app.route('/Locales/<path:filename>')
def locales_static(filename):
	p = FRONTEND_DIR / 'Locales' / filename
	if p.exists():
		return send_from_directory(str(FRONTEND_DIR / 'Locales'), filename)
	abort(404)


@app.route("/<path:path>")
def catch_all(path):
	if path.endswith('.html'):
		fn = Path(path).name
		# If the HTML file exists under Frontend/HTML, map to clean /<page>
		if (HTML_DIR / fn).exists():
			stem = Path(fn).stem
			if stem.lower() == 'index':
				return redirect('/', code=302)
			return redirect(f'/{stem.lower()}', code=302)

		# If the HTML file exists under Frontend/Projects, map to /projects/<slug>
		if (PROJECTS_DIR / fn).exists():
			stem = Path(fn).stem
			return redirect(f'/projects/{stem.lower()}', code=302)

		# If the file exists under Frontend with a subpath (e.g. Frontend/Projects/...)
		p = FRONTEND_DIR / path
		if p.exists():
			rel = p.relative_to(FRONTEND_DIR)
			return send_from_directory(str(FRONTEND_DIR), str(rel))

		# Fall through to asset handlers / clean URL matching below.

		# If not found under Frontend, fall through to the normal handlers.

	if "." in path:
		asset_candidates = [FRONTEND_DIR / path,
							FRONTEND_DIR / 'JS' / path,
							FRONTEND_DIR / 'CSS' / path,
							FRONTEND_DIR / 'img' / path,
							FRONTEND_DIR / 'images' / path]
		if path.startswith('Frontend/'):
			stripped = path[len('Frontend/'):]
			asset_candidates.insert(0, FRONTEND_DIR / stripped)

		for asset in asset_candidates:
			if asset.exists():
				rel = asset.relative_to(FRONTEND_DIR)
				return send_from_directory(str(FRONTEND_DIR), str(rel))

		abort(404)

	candidates = [f"{path}.html", f"{path.capitalize()}.html"]
	for fn in candidates:
		for base in (HTML_DIR, PROJECTS_DIR):
			p = base / fn
			if p.exists():
				return send_from_directory(str(base), fn)

	resp = _send_html_from_candidates("index.html")
	if resp:
		return resp
	abort(404)


if __name__ == "__main__":
	app.run(host="0.0.0.0", port=5001, debug=True)
