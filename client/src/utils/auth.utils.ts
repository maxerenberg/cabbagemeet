const LOCALSTORAGE_TOKEN_KEY = 'token';
const SESSIONSTORAGE_NONCE_KEY = 'nonce';

export function getLocalToken(): string | null {
  return localStorage.getItem(LOCALSTORAGE_TOKEN_KEY);
}

export function setLocalToken(token: string) {
  localStorage.setItem(LOCALSTORAGE_TOKEN_KEY, token);
}

export function removeLocalToken() {
  localStorage.removeItem(LOCALSTORAGE_TOKEN_KEY);
}

export async function createAndStoreSessionNonce(): Promise<string> {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  const nonce = await encodeBase64Url(array);
  sessionStorage.setItem(SESSIONSTORAGE_NONCE_KEY, nonce);
  return nonce;
}

export function getSessionNonce(): string | null {
  return sessionStorage.getItem(SESSIONSTORAGE_NONCE_KEY);
}

export function removeSessionNonce() {
  sessionStorage.removeItem(SESSIONSTORAGE_NONCE_KEY);
}

// Copied from https://github.com/blakeembrey/universal-base64url/blob/master/src/index.ts
async function encodeBase64Url(data: Uint8Array): Promise<string> {
  return (await encodeBase64(data))
    .replace(/\//g, '_')
    .replace(/\+/g, '-')
    .replace(/=+$/g, '');
}

// Copied from https://stackoverflow.com/a/66046176
async function encodeBase64(data: Uint8Array): Promise<string> {
  const dataURL = await new Promise<string>(resolve => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(new Blob([data]));
  });
  /*
    The result looks like
    "data:application/octet-stream;base64,<your base64 data>"
  */
  return dataURL.split(",", 2)[1];
}
