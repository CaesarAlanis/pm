FROM node:20-alpine AS frontend-build

WORKDIR /app/frontend
ENV NEXT_TELEMETRY_DISABLED=1
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

FROM python:3.12-slim

WORKDIR /app

RUN python -m pip install --upgrade pip && \
    python -m pip install uv

COPY backend/pyproject.toml backend/ .
RUN uv sync --no-install-project

COPY backend backend
COPY --from=frontend-build /app/frontend/out ./backend/static

EXPOSE 8000
CMD ["uv", "run", "--no-project", "uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
