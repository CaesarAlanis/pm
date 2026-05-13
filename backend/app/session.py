import secrets

_sessions: dict[str, str] = {}

CREDENTIALS = {"user": "password"}


def create_session(username: str) -> str:
    token = secrets.token_hex(32)
    _sessions[token] = username
    return token


def get_user(token: str) -> str | None:
    return _sessions.get(token)


def delete_session(token: str) -> None:
    _sessions.pop(token, None)
