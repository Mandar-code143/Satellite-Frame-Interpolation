---
name: Python FastAPI on api-server artifact
description: How to run a Python FastAPI backend via the api-server artifact in this monorepo
---

The api-server artifact's `artifact.toml` dev run command directly invokes uvicorn from `.pythonlibs/bin/uvicorn`. Python packages are installed via `installLanguagePackages` which uses uv and puts them in `.pythonlibs/`.

**Rule:** Use `--reload-dir backend` to avoid uvicorn watching the entire workspace (causes thousands of spurious reloads from node_modules/frontend build output).

**Why:** The default `--reload` watches the CWD recursively, which in this monorepo hits node_modules and vite output constantly.

**How to apply:** Any time you update the uvicorn dev run command, always include `--reload-dir backend` (or whichever subdirectory the Python app lives in).

**torchvision:** Cannot be installed on this platform (no compatible wheel). Do NOT add it. All imports should use `torch` only.

**Entry point:** `backend.app.main:app`
**Binary:** `/home/runner/workspace/.pythonlibs/bin/uvicorn`
**Dev run:** `bash -c 'cd /home/runner/workspace && /home/runner/workspace/.pythonlibs/bin/uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT:-8080} --reload --reload-dir backend'`
