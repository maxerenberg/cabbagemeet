export function assert(condition: any, message?: string): asserts condition {
  if (!condition) {
    throw new Error(message ?? 'Assertion failed');
  }
}

export function assertIsNever(x: never): never {
  throw new Error();
}

export function scrollUpIntoViewIfNeeded(elem: HTMLElement, scrollMarginTop: number) {
  const rect = elem.getBoundingClientRect();
  if (rect.top < scrollMarginTop) {
    const offset = scrollMarginTop - rect.top;
    window.scrollBy(0, -offset);
  }
}
