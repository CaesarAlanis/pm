import os

import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse, Response

NEXT_BASE_URL = os.getenv("NEXT_BASE_URL", "http://127.0.0.1:3000").rstrip("/")

app = FastAPI(title="Project Management MVP API")


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/hello")
async def hello() -> dict[str, str]:
    return {"message": "hello world", "service": "fastapi"}


@app.get("/demo", response_class=HTMLResponse)
async def demo_page() -> str:
    return """
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>PM MVP Demo</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 2rem; line-height: 1.4; }
      h1 { margin-bottom: 0.5rem; }
      pre { background: #f4f4f4; padding: 1rem; border-radius: 8px; }
      button { padding: 0.5rem 0.75rem; cursor: pointer; }
    </style>
  </head>
  <body>
    <h1>Hello World</h1>
    <p>This page verifies FastAPI is running inside Docker.</p>
    <button id="call-api" type="button">Call /api/hello</button>
    <pre id="result">Click the button to fetch API data.</pre>
    <script>
      const button = document.getElementById("call-api");
      const result = document.getElementById("result");
      button.addEventListener("click", async () => {
        result.textContent = "Loading...";
        try {
          const response = await fetch("/api/hello");
          const body = await response.json();
          result.textContent = JSON.stringify(body, null, 2);
        } catch (error) {
          result.textContent = String(error);
        }
      });
    </script>
  </body>
</html>
"""


async def _proxy_to_next(request: Request, path: str) -> Response:
    target_url = f"{NEXT_BASE_URL}/{path.lstrip('/')}"
    query = request.url.query
    if query:
        target_url = f"{target_url}?{query}"

    headers = dict(request.headers)
    headers.pop("host", None)
    body = await request.body()

    async with httpx.AsyncClient(follow_redirects=False, timeout=60.0) as client:
        upstream = await client.request(
            method=request.method,
            url=target_url,
            headers=headers,
            content=body,
        )

    excluded_headers = {
        "connection",
        "keep-alive",
        "proxy-authenticate",
        "proxy-authorization",
        "te",
        "trailer",
        "transfer-encoding",
        "upgrade",
      "content-encoding",
      "content-length",
    }
    passthrough_headers = {
        key: value
        for key, value in upstream.headers.items()
        if key.lower() not in excluded_headers
    }

    return Response(
        content=upstream.content,
        status_code=upstream.status_code,
        headers=passthrough_headers,
        media_type=upstream.headers.get("content-type"),
    )


@app.api_route(
    "/",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
)
async def proxy_root(request: Request) -> Response:
    return await _proxy_to_next(request, "")


@app.api_route(
    "/{full_path:path}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
)
async def proxy_next(full_path: str, request: Request) -> Response:
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="Not found")
    return await _proxy_to_next(request, full_path)