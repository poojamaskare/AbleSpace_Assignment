const TOKEN_KEY = "pyramid-token";

/**
 * The JWT lives in localStorage and travels in an Authorization header rather
 * than an httpOnly cookie. Deliberate: the frontend and API deploy to different
 * origins (Vercel / Render), and cross-site cookies need SameSite=None which
 * several browsers block by default — a demo that silently fails to log in is
 * worse than the XSS exposure of a guest-only token. Noted in the README.
 */
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}
