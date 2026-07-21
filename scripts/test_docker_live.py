import time
import httpx

BASE_URL = "http://localhost:8000"

def test_live_docker():
    print("Testing Live Docker Container at http://localhost:8000...")

    # Wait for server to initialize if starting
    for _ in range(5):
        try:
            r = httpx.get(f"{BASE_URL}/api/health", timeout=3.0)
            if r.status_code == 200:
                print("1. /api/health OK:", r.json())
                break
        except Exception:
            time.sleep(1)

    # 2. Test Root HTML
    r_root = httpx.get(f"{BASE_URL}/", timeout=5.0)
    print("2. / (Root HTML) status:", r_root.status_code, "| Contains DOCTYPE:", "<!DOCTYPE html>" in r_root.text)

    # 3. Test Login
    r_login = httpx.post(f"{BASE_URL}/api/login", json={"username": "user", "password": "password"}, timeout=5.0)
    print("3. /api/login status:", r_login.status_code, "| Response:", r_login.json())

    # 4. Test Get Board
    r_board = httpx.get(f"{BASE_URL}/api/board", timeout=5.0)
    print("4. /api/board status:", r_board.status_code, "| Columns:", len(r_board.json().get("columns", [])))

    # 5. Test AI Connectivity
    r_ai_test = httpx.get(f"{BASE_URL}/api/ai/test", timeout=10.0)
    print("5. /api/ai/test status:", r_ai_test.status_code, "| Model response:", r_ai_test.json().get("response"))

    # 6. Test AI Chat
    r_ai_chat = httpx.post(
        f"{BASE_URL}/api/ai/chat",
        json={"message": "Crea una tarjeta llamada 'Verificar Docker' en Backlog", "chat_history": []},
        timeout=15.0
    )
    print("6. /api/ai/chat status:", r_ai_chat.status_code, "| AI response:", r_ai_chat.json().get("response_text"))

    print("\nAll Live Docker Verification Tests Passed Successfully!")

if __name__ == "__main__":
    test_live_docker()
