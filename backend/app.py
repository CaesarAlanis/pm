from fastapi import FastAPI
from pydantic import BaseModel
from starlette.responses import JSONResponse

app = FastAPI()


class ChatRequest(BaseModel):
    message: str = ""
    board: dict = {}


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/api/chat")
def chat(payload: ChatRequest):
    message = payload.message.strip()
    if not message:
        return JSONResponse(status_code=400, content={"reply": "Please enter a message."})

    if "add" in message.lower() and "card" in message.lower():
        reply = "I can add a card once the board is connected to the backend."
    else:
        reply = f"Echo: {message}"

    return {"reply": reply}


def main() -> None:
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)


if __name__ == "__main__":
    main()
