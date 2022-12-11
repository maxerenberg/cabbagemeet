// TODO: replace with Redis

export default class Cacher<T = true> {
  private readonly map = new Map<string, T>();

  has(key: string): boolean {
    return this.map.has(key);
  }

  get(key: string): T | undefined {
    return this.map.get(key);
  }

  pop(key: string): boolean {
    // The timer will still expire later and try to remote a key which
    // no longer exists. That is fine.
    return this.map.delete(key);
  }

  getAndPop(key: string): T | undefined {
    const value = this.map.get(key);
    this.map.delete(key);
    return value;
  }

  add(key: string, value: T, ttlSeconds: number) {
    this.map.set(key, value);
    setTimeout(() => {
      this.map.delete(key);
    }, ttlSeconds * 1000);
  }
}
