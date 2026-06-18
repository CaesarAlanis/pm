FROM node:20-alpine AS frontend-build

WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend ./
RUN npm run build

FROM python:3.12-slim

WORKDIR /app

RUN pip install --no-cache-dir uv

COPY backend/requirements.txt /app/backend/requirements.txt
RUN uv pip install --system -r /app/backend/requirements.txt

COPY backend /app/backend
COPY --from=frontend-build /app/frontend/out /app/backend/app/static

WORKDIR /app/backend

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
