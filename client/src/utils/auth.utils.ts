const LOCALSTORAGE_TOKEN_KEY = 'token';

export function getLocalToken(): string | null {
  return localStorage.getItem(LOCALSTORAGE_TOKEN_KEY);
}

export function setLocalToken(token: string) {
  localStorage.setItem(LOCALSTORAGE_TOKEN_KEY, token);
}

export function removeLocalToken() {
  localStorage.removeItem(LOCALSTORAGE_TOKEN_KEY);
}
