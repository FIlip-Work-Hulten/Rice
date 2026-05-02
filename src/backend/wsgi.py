import sys
from pathlib import Path

# Ensure src/backend is on sys.path so imports work
BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

try:
    # Import the Flask app object defined in app.py
    from app import app as application
except Exception:
    # Fallback: try importing as package
    from importlib import import_module

    mod = import_module("src.backend.app") if import_module else None
    application = getattr(mod, "app") if mod is not None else None

# Expose both names for compatibility
app = application


if __name__ == "__main__":
    application.run(host="0.0.0.0", port=5001)
