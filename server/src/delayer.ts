export default class Delayer {
  private cbIdentifiers = new Set<string>();

  private push(cb: () => void, delayMs: number, identifier: string) {
    setTimeout(() => {
      this.cbIdentifiers.delete(identifier);
      cb();
    }, delayMs);
    this.cbIdentifiers.add(identifier);
  }

  private has(identifier: string): boolean {
    return this.cbIdentifiers.has(identifier);
  }

  pushIfNotPresent(cb: () => void, delayMs: number, identifier: string) {
    if (this.has(identifier)) {
      return;
    }
    this.push(cb, delayMs, identifier);
  }
}
