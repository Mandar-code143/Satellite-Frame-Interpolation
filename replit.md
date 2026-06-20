# ISRO Satellite Frame Interpolation Command Center

A cinematic full-stack mission control app for interpolating missing frames in ISRO satellite NetCDF datasets using ML (RIFE model, fallback blend mode when no weights).

## Run & Operate

- Frontend (React+Vite): `pnpm --filter @workspace/satellite-ui run dev`
- Backend (Python FastAPI): `.pythonlibs/bin/uvicorn backend.app.main:app --host 0.0.0.0 --port 8080 --reload --reload-dir backend`
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind + Framer Motion + Canvas 2D (animated globe)
- API: Python FastAPI + uvicorn (run via api-server artifact on port 8080)
- State: Zustand
- ML: PyTorch (CPU, fallback blend when no RIFE weights)
- Science: xarray, NetCDF4, numpy, Pillow, OpenCV, scipy, scikit-image

## Where things live

- `artifacts/satellite-ui/` — React+Vite frontend (pages: home, inspect, workspace, results)
- `artifacts/api-server/` — artifact config only; the actual server is `backend/`
- `backend/` — Python FastAPI app (workspace root)
  - `backend/app/main.py` — FastAPI entry point
  - `backend/app/api/routes/` — health, inspect, jobs, interpolate, outputs
  - `backend/app/services/` — netcdf_service, preprocessing, model_adapter, job_manager
  - `backend/models/rife_checkpoint.pth` — drop RIFE weights here to enable ML mode
- `lib/api-spec/openapi.yaml` — API contract (source of truth)
- `lib/api-zod/` — generated Zod schemas
- `lib/api-client-react/` — generated React Query hooks

## Architecture decisions

- Python FastAPI replaces the Node.js api-server for all `/api/*` routes; the artifact.toml dev run command starts uvicorn directly.
- `torchvision` is unavailable on this platform — excluded from install; RIFE model uses torch + custom loading only.
- The 3D globe uses a Canvas 2D animated renderer (no WebGL) because the Replit preview iframe cannot create WebGL contexts.
- All ML processing falls back to scipy linear blend interpolation when no model checkpoint is present.
- `--reload-dir backend` on uvicorn prevents the reloader from watching node_modules and frontend build output.

## Product

- Upload NetCDF satellite datasets and inspect variables/metadata
- Select a variable and run frame interpolation (ML or fallback blend)
- View async job status and download interpolated output frames
- Demo mode available without uploading a file

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- `torchvision` cannot be installed on this platform — do NOT add it.
- WebGL is unavailable in the Replit preview iframe — use Canvas 2D or CSS for any visual effects.
- uvicorn must use `--reload-dir backend` to avoid watching the entire workspace (causes thousands of spurious reloads).
- Model weights go in `backend/models/rife_checkpoint.pth`; without them the app runs in FALLBACK MODE (scipy blend).
- Python libs installed via uv into `.pythonlibs/`; binary at `.pythonlibs/bin/uvicorn`.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
