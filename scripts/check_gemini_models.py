import os
from dotenv import load_dotenv
from google import genai

ENV_LOCAL_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".env.local"))
load_dotenv(dotenv_path=ENV_LOCAL_PATH)

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

try:
    print("Listing available Gemini models:")
    for model in client.models.list():
        if "gemini" in model.name.lower():
            print(" -", model.name)
except Exception as e:
    print("Error listing models:", e)
