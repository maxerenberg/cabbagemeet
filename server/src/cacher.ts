export default class Cacher {
  private readonly set = new Set<string>();

  has(key: string): boolean {
    return this.set.has(key);
  }

  add(key: string, ttlSeconds: number) {
    this.set.add(key);
    setTimeout(() => {
      this.set.delete(key);
    }, ttlSeconds * 1000);
  }
}
