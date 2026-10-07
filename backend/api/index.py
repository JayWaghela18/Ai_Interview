import sys
import os

# Add the project root (one level up from api) to the sys.path
# This ensures that "from backend.main import x" works
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from fastapi import FastAPI
from backend.main import app as main_app

# Vercel entrypoint
# We mount the main app under /api so that Vercel routes like /api/upload
# resolve correctly without returning 404.
app = FastAPI()
app.mount("/api", main_app)
