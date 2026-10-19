"""
Vercel Serverless Entrypoint for TIRA Belle REST API.
Exposes the FastAPI instance for serverless lambda execution.
"""
import sys
import os
from pathlib import Path

# Ensure project root is in sys.path
root_dir = Path(__file__).resolve().parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from backend.main import app
