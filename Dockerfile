FROM node:20-bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
      python3 \
      python3-pip \
      curl \
      ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN python3 -m pip install --no-cache-dir --break-system-packages uv

WORKDIR /app

COPY backend/pyproject.toml /app/backend/pyproject.toml
RUN cd /app/backend && uv sync --no-dev

COPY frontend/package.json /app/frontend/package.json
COPY frontend/package-lock.json /app/frontend/package-lock.json
RUN cd /app/frontend && npm ci

COPY backend /app/backend
COPY frontend /app/frontend
COPY scripts /app/scripts

RUN cd /app/frontend && npm run build
RUN chmod +x /app/scripts/*.sh

ENV FASTAPI_HOST=0.0.0.0
ENV FASTAPI_PORT=8000
ENV NEXT_HOST=127.0.0.1
ENV NEXT_PORT=3000
ENV NEXT_BASE_URL=http://127.0.0.1:3000

EXPOSE 8000

CMD ["/app/scripts/run-container.sh"]