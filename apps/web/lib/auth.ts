const TOKEN_KEY = "mm_access_token";

export function getToken(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${TOKEN_KEY}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

export function setToken(token: string): void {
  const expires = new Date(Date.now() + 7 * 864e5).toUTCString();
  document.cookie = `${TOKEN_KEY}=${encodeURIComponent(token)}; expires=${expires}; path=/; samesite=strict`;
}

export function clearToken(): void {
  document.cookie = `${TOKEN_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; samesite=strict`;
}

export function isAuthenticated(): boolean {
  return !!getToken();
}
