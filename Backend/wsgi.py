import sys
from pathlib import Path

# Ensure Backend dir is on sys.path so imports work whether Gunicorn
# is started from repo root or from Backend/ directly.
BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

try:
    # Import the Flask app object defined in app.py
    from app import app as application
except Exception:
    # Fallback: try importing as package (if Backend is a package)
    from importlib import import_module
    mod = import_module('Backend.app') if import_module else None
    application = getattr(mod, 'app') if mod is not None else None

# Some hosting platforms (Passenger, older scripts) expect the module to
# expose `app` variable. Expose both names to be compatible.
app = application


if __name__ == "__main__":
    application.run(host="0.0.0.0", port=5001)
