# ─── Stage 1: build the static frontend ─────────────────────────────────
# Next.js static export (output: "export"). The build reads the library JSON
# straight from data/assays/, so no running API is needed at build time.
FROM node:20-alpine AS client
WORKDIR /app

# Install deps first (cached unless the lockfile changes).
COPY apps/web/package.json apps/web/package-lock.json apps/web/
RUN cd apps/web && npm ci

# The library content is read from data/ at build (see apps/web/lib/data.ts),
# so it must be present at the layout the build expects (../../data/assays).
COPY data/ data/
COPY packages/ packages/
COPY apps/web/ apps/web/

RUN cd apps/web && npm run build   # emits apps/web/out

# ─── Stage 2: FastAPI runtime that serves the SPA + API ─────────────────
FROM python:3.13-slim AS server
WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

COPY services/api/requirements.txt ./requirements.txt
RUN pip install -r requirements.txt

# Server code + the library data + schema (the API validates and serves them).
COPY services/api/app/ ./app/
COPY data/ ./data/
COPY packages/ ./packages/

# The built static frontend, served from "/" by FastAPI.
COPY --from=client /app/apps/web/out ./static

# Point the app at the in-container paths (defaults assume the repo layout).
ENV BIOSENSORS_CHASSIS_DIR=/app/data/chassis \
    BIOSENSORS_DESIGN_DIR=/app/data/biosensors \
    BIOSENSORS_PARTS_DIR=/app/data/parts \
    BIOSENSORS_LEGACY_DIR=/app/data/legacy-assays \
    BIOSENSORS_SCHEMA_DIR=/app/packages/schema \
    BIOSENSORS_STATIC_DIR=/app/static

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
