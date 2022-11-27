export const SECONDS_PER_MINUTE = 60;
export const MINUTES_PER_HOUR = 60;
export const SECONDS_PER_HOUR = SECONDS_PER_MINUTE * MINUTES_PER_HOUR;
export const HOURS_PER_DAY = 24;
export const SECONDS_PER_DAY = SECONDS_PER_HOUR * HOURS_PER_DAY;

export default class RateLimiter {
  private readonly intervalMs: number;
  private counters: Record<string, number> = {};

  constructor(
    intervalSeconds: number,
    // max. number of requests within a given interval
    private readonly limit: number,
  ) {
    this.intervalMs = intervalSeconds * 1000;
  }

  tryAddRequestIfWithinLimits(key: string): boolean {
    if (this.counters.hasOwnProperty(key) && this.counters[key] >= this.limit) {
      return false;
    }
    if (this.counters.hasOwnProperty(key)) {
      this.counters[key]++;
    } else {
      this.counters[key] = 1;
    }
    setTimeout(() => {
      if (--this.counters[key] === 0) {
        delete this.counters[key];
      }
    }, this.intervalMs);
    return true;
  }

  removeLastRequestFromHistory(key: string) {
    if (this.counters[key]) {
      this.counters[key]--;
    }
  }
}
