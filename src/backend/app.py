from pathlib import Path
from flask import Flask, send_from_directory, abort, redirect
import sys

# BASE_DIR points to repo/src
BASE_DIR = Path(__file__).resolve().parent.parent
# frontend root detection: prefer `src/frontend`, fall back to repo `Frontend`
candidate_frontend = BASE_DIR / "frontend"
legacy_frontend = BASE_DIR.parent / "Frontend"
if candidate_frontend.exists():
    FRONTEND_DIR = candidate_frontend
else:
    FRONTEND_DIR = legacy_frontend

HTML_DIR = FRONTEND_DIR / "html"
PROJECTS_DIR = FRONTEND_DIR / "projects"
# static dir: if a 'static' folder exists under frontend use it, otherwise use the frontend root (legacy layout)
STATIC_DIR = FRONTEND_DIR / "static" if (FRONTEND_DIR / "static").exists() else FRONTEND_DIR

# Ensure backend package root is on sys.path for imports
BACKEND_ROOT = Path(__file__).resolve().parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

app = Flask(__name__, static_folder=str(STATIC_DIR), static_url_path="/static")

# Register minesweeper API blueprint if available
try:
    from proj.minesweeper.minesweeper import minesweeper_bp

    app.register_blueprint(minesweeper_bp, url_prefix="/api/minesweeper")
except Exception:
    # If import fails (during development or tests), continue without API
    pass

ALLOWED_LANGS = {"en", "jp", "ja"}


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


@app.route("/<lang>/")
def index_lang(lang):
    if not _is_lang_ok(lang):
        abort(404)
    return index()


@app.route("/<lang>/about")
def about_lang(lang):
    if not _is_lang_ok(lang):
        abort(404)
    return about()


@app.route("/<lang>/projects")
def projects_lang(lang):
    if not _is_lang_ok(lang):
        abort(404)
    return projects()


@app.route("/<lang>/cv")
def cv_lang(lang):
    if not _is_lang_ok(lang):
        abort(404)
    return cv()


@app.route("/<lang>/projects/<slug>")
def project_slug_lang(lang, slug):
    if not _is_lang_ok(lang):
        abort(404)
    return project_slug(slug)


@app.route('/<lang>/<path:path>')
def catch_all_lang(lang, path):
    if not _is_lang_ok(lang):
        abort(404)
    return catch_all(path)


# Compatibility asset routes mapping to new static layout
@app.route('/CSS/<path:filename>')
def css_static(filename):
    # support both `css` and legacy `CSS` folder names
    for folder in ('css', 'CSS'):
        p = STATIC_DIR / folder / filename
        if p.exists():
            return send_from_directory(str(STATIC_DIR / folder), filename)
    abort(404)


@app.route('/JS/<path:filename>')
def js_static(filename):
    for folder in ('js', 'JS'):
        p = STATIC_DIR / folder / filename
        if p.exists():
            return send_from_directory(str(STATIC_DIR / folder), filename)
    abort(404)


@app.route('/img/<path:filename>')
def img_static(filename):
    for folder in ('img', 'images'):
        p = STATIC_DIR / folder / filename
        if p.exists():
            return send_from_directory(str(STATIC_DIR / folder), filename)
    abort(404)


@app.route('/Locales/<path:filename>')
def locales_static(filename):
    for folder in ('locales', 'Locales'):
        p = STATIC_DIR / folder / filename
        if p.exists():
            return send_from_directory(str(STATIC_DIR / folder), filename)
    abort(404)


@app.route("/<path:path>")
def catch_all(path):
    # Asset resolution first (static folder)
    if "." in path:
        asset_candidates = [
            STATIC_DIR / path,
            STATIC_DIR / 'js' / path,
            STATIC_DIR / 'css' / path,
            STATIC_DIR / 'img' / path,
            STATIC_DIR / 'images' / path,
        ]
        for asset in asset_candidates:
            if asset.exists():
                rel = asset.relative_to(STATIC_DIR)
                return send_from_directory(str(STATIC_DIR), str(rel))
        # allow legacy Frontend/ prefix
        legacy = FRONTEND_DIR / path
        if legacy.exists():
            rel = legacy.relative_to(FRONTEND_DIR)
            return send_from_directory(str(FRONTEND_DIR), str(rel))
        abort(404)

    # map clean paths to html/projects
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
