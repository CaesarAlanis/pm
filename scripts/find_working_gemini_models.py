import os
from dotenv import load_dotenv
from google import genai

ENV_LOCAL_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".env.local"))
load_dotenv(dotenv_path=ENV_LOCAL_PATH)

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

print("=== TESTING ALL MODELS AVAILABLE FOR YOUR GEMINI_API_KEY ===")

working_models = []

for model in client.models.list():
    name = model.name
    model_id = name.replace("models/", "")
    try:
        res = client.models.generate_content(
            model=model_id,
            contents="Say OK"
        )
        print(f"[WORKING]: {model_id} -> Output: {res.text.strip()}")
        working_models.append(model_id)
    except Exception as e:
        err_msg = str(e)
        if "RESOURCE_EXHAUSTED" in err_msg or "429" in err_msg:
            print(f"[QUOTA EXHAUSTED]: {model_id}")
        elif "404" in err_msg or "NOT_FOUND" in err_msg:
            print(f"[NOT FOUND]: {model_id}")
        else:
            print(f"[ERROR]: {model_id} -> {err_msg[:100]}")

print("\nSUMMARY OF WORKING MODELS FOR YOUR API KEY:")
print(working_models)
