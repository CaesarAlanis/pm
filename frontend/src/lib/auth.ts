export const AUTH_TOKEN_KEY = "pm_auth_token";

export const getStoredToken = () => {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem(AUTH_TOKEN_KEY);
};

export const storeToken = (token: string) => {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(AUTH_TOKEN_KEY, token);
};

export const clearToken = () => {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(AUTH_TOKEN_KEY);
};

type LoginResult = {
  access_token: string;
  token_type: string;
};

export const login = async (
  username: string,
  password: string
): Promise<LoginResult> => {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    throw new Error("Invalid username or password.");
  }

  return (await response.json()) as LoginResult;
};

export const verifySession = async (token: string): Promise<boolean> => {
  const response = await fetch("/api/auth/session", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.ok;
};