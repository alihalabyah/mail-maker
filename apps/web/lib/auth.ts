import Cookies from "js-cookie";

const TOKEN_KEY = "mm_access_token";

export function getToken(): string | undefined {
  return Cookies.get(TOKEN_KEY);
}

export function setToken(token: string): void {
  Cookies.set(TOKEN_KEY, token, { expires: 7, sameSite: "strict" });
}

export function clearToken(): void {
  Cookies.remove(TOKEN_KEY);
}

export function isAuthenticated(): boolean {
  return !!getToken();
}
