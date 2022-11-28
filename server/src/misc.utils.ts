export function assert(condition: any, message?: string): asserts condition {
  if (!condition) {
    throw new Error(message ?? 'Assertion failed');
  }
}

export function assertIsNever(x: never): never {
  throw new Error();
}

export function encodeQueryParams(params: Record<string, string>): string {
  return Object.entries(params)
    .map(([key, value]) => key + '=' + encodeURIComponent(value))
    .join('&');
}

export function stripTrailingSlash(s: string): string {
  if (s.endsWith('/')) {
    return s.substring(0, s.length - 1);
  }
  return s;
}

export function sleep(millis: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve();
    }, millis);
  });
}
