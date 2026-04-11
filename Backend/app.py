from pathlib import Path
from flask import Flask, send_from_directory, abort, redirect

BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = BASE_DIR / "Frontend"
HTML_DIR = FRONTEND_DIR / "HTML"
PROJECTS_DIR = BASE_DIR / "Projects"

app = Flask(__name__, static_folder=str(FRONTEND_DIR), static_url_path="/static")


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


@app.route("/<path:path>")
def catch_all(path):
	if path.endswith('.html'):
		stem = Path(path).stem
		if stem.lower() == 'index':
			return redirect('/', code=302)
		return redirect(f'/{stem}', code=302)

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
