# Use official Python 3.11 slim image
FROM python:3.11-slim

# Install uv package manager
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Set working directory
WORKDIR /app

# Copy dependency definition and readme
COPY backend/pyproject.toml backend/README.md /app/backend/

# Install dependencies using uv
WORKDIR /app/backend
RUN uv pip install --system -r pyproject.toml || uv pip install --system .

# Copy application files
WORKDIR /app
COPY backend /app/backend
COPY frontend/out /app/frontend/out

# Expose port 8000
EXPOSE 8000

# Set environment variables
ENV PYTHONUNBUFFERED=1

# Run FastAPI app
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
