// TODO: create table in DB for expirable data, have cron job which deletes
// rows periodically

export default class Cacher {
  private readonly set = new Set<string>();

  has(key: string): boolean {
    return this.set.has(key);
  }

  pop(key: string): boolean {
    if (!this.set.has(key)) {
      return false;
    }
    // The timer will still expire later and try to remote a key which
    // no longer exists. That is fine.
    this.set.delete(key);
    return true;
  }

  add(key: string, ttlSeconds: number) {
    this.set.add(key);
    setTimeout(() => {
      this.set.delete(key);
    }, ttlSeconds * 1000);
  }
}
