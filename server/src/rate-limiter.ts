export const SECONDS_PER_MINUTE = 60;
export const MINUTES_PER_HOUR = 60;
export const SECONDS_PER_HOUR = SECONDS_PER_MINUTE * MINUTES_PER_HOUR;
export const HOURS_PER_DAY = 24;
export const SECONDS_PER_DAY = SECONDS_PER_HOUR * HOURS_PER_DAY;
// map of interval length (seconds) to limit (number of allowed requests)
export type TTLLimits = Record<number, number>;
// Map of interval length (seconds) to request history (timestamps)
// The keys should be exactly the same as TTLLimits
type RateLimitHistory = Record<number, number[]>;

/**
 * Returns the index of the first element of `orderedHistory` which is at most
 * `interval` seconds from `now`. If no such element exists, the length of
 * `orderedHistory` is returned.
 * @param now The number of second since the Unix epoch
 * @param orderedHistory An ordered array of Unix epoch timestamps
 * @param interval An interval in seconds
 */
function getFirstSampleIdxWithinSameInterval(now: number, orderedHistory: number[], interval: number): number {
  for (let i = 0; i < orderedHistory.length; i++) {
    if (now - orderedHistory[i] <= interval) {
      return i;
    }
  }
  return orderedHistory.length;
}

export default class RateLimiter {
  private limits: TTLLimits = {};
  private histories: Record<string, RateLimitHistory> = {};
  private callbacks: Record<string, (() => void)[]> = {};

  setLimits(limits: TTLLimits) {
    this.limits = limits;
  }

  notifyWhenSlotIsFree(key: string, cb: () => void) {
    if (!this.callbacks[key]) {
      this.callbacks[key] = [];
    }
    this.callbacks[key].push(cb);
  }

  private getAllIntervalSeconds(): number[] {
    return Object.keys(this.limits).map(s => +s);
  }

  private willExceedRateLimit(
    now: number,
    intervalSeconds: number,
    histories: RateLimitHistory,
  ): boolean {
    const history = histories[intervalSeconds];
    if (history === undefined || history.length === 0) {
      return false;
    }
    const limit = this.limits[intervalSeconds];
    if (limit === undefined) {
      return false;
    }
    const interval = intervalSeconds * 1000;  // milliseconds
    const firstSampleIdxWithinSameInterval = getFirstSampleIdxWithinSameInterval(now, history, interval);
    const numSamplesInInterval = history.length - firstSampleIdxWithinSameInterval;
    // Add 1 because we are about to add a new sample
    return numSamplesInInterval + 1 > limit;
  }

  private willExceedSomeRateLimit(
    now: number,
    histories: RateLimitHistory | undefined,
  ): boolean {
    if (histories === undefined) {
      return false;
    }
    return this.getAllIntervalSeconds().some(
      intervalSeconds => this.willExceedRateLimit(now, intervalSeconds, histories)
    );
  }

  tryAddRequestIfWithinLimits(key: string): boolean {
    const now = Date.now();
    if (this.willExceedSomeRateLimit(now, this.histories[key])) {
      return false;
    }
    // update histories
    if (!this.histories[key]) {
      this.histories[key] = {};
    }
    for (const intervalSeconds of this.getAllIntervalSeconds()) {
      if (!this.histories[key][intervalSeconds]) {
        this.histories[key][intervalSeconds] = [];
      }
      if (this.histories[key][intervalSeconds].push(now) === 1) {
        // set timeouts to clear the histories so we don't leak memory
        setTimeout(
          () => this.removeStaleEntriesFromHistory(key, intervalSeconds),
          // The +1 is to make sure that the first entry can be safely removed
          // by the time the timer expires
          intervalSeconds * 1000 + 1
        );
      }
    }
    return true;
  }

  addOrDeferRequest(key: string, cb: () => void) {
    if (this.tryAddRequestIfWithinLimits(key)) {
      cb();
      return;
    }
    this.notifyWhenSlotIsFree(key, () => {
      this.addOrDeferRequest(key, cb);
    })
  }

  private removeStaleEntriesFromHistory(key: string, intervalSeconds: number) {
    const interval = intervalSeconds * 1000;  // milliseconds
    const now = Date.now();
    const history = this.histories[key][intervalSeconds];
    const numSamplesToRemove = getFirstSampleIdxWithinSameInterval(now, history, interval);
    history.splice(0, numSamplesToRemove);
    if (history.length === 0) {
      delete this.histories[key][intervalSeconds];
      if (Object.keys(this.histories[key]).length == 0) {
        delete this.histories[key];
      }
    } else {
      const timeWhenOldestSampleWillExpire = history[0] + interval + 1;
      setTimeout(
        () => this.removeStaleEntriesFromHistory(key, intervalSeconds),
        timeWhenOldestSampleWillExpire - now
      );
    }
    if (this.callbacks[key]) {
      // The callbacks will presumably try to add data to the history array.
      // Keep on executing the callbacks until we can't anymore.
      for (let i = 0; i < this.callbacks[key].length; i++) {
        if (!this.willExceedSomeRateLimit(now, this.histories[key])) {
          this.callbacks[key][i]();
        } else {
          this.callbacks[key].splice(0, i);
          if (this.callbacks[key].length === 0) {
            delete this.callbacks[key];
          }
          break;
        }
      }
    }
  }
}
