const rateLimitTypes = ['hourly', 'daily', 'ten-minutely'] as const;
type RateLimitType = typeof rateLimitTypes[number];
export type TTLLimits = Partial<Record<RateLimitType, number>>;
type RateLimitHistory = Partial<Record<RateLimitType, number[]>>;
const TTLIntervalsInMilliseconds: Record<RateLimitType, number> = {
  hourly: 1000 * 60 * 60,
  daily: 1000 * 60 * 60 * 24,
  'ten-minutely': 1000 * 60 * 10,
};

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

  private willExceedRateLimit(
    now: number,
    limitType: RateLimitType,
    histories: RateLimitHistory,
  ): boolean {
    const history = histories[limitType];
    if (history === undefined || history.length === 0) {
      return false;
    }
    const limit = this.limits[limitType];
    if (limit === undefined) {
      return false;
    }
    const interval = TTLIntervalsInMilliseconds[limitType];
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
    return rateLimitTypes.some(limitType => this.willExceedRateLimit(now, limitType, histories));
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
    for (const limitType of rateLimitTypes) {
      if (!this.limits.hasOwnProperty(limitType)) {
        continue;
      }
      if (!this.histories[key][limitType]) {
        this.histories[key][limitType] = [];
      }
      if (this.histories[key][limitType].push(now) === 1) {
        // set timeouts to clear the histories so we don't leak memory
        setTimeout(
          () => this.removeStaleEntriesFromHistory(key, limitType),
          // The +1 is to make sure that the first entry can be safely removed
          // by the time the timer expires
          TTLIntervalsInMilliseconds[limitType] + 1
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

  private removeStaleEntriesFromHistory(key: string, limitType: RateLimitType) {
    const interval = TTLIntervalsInMilliseconds[limitType];
    const now = Date.now();
    const history = this.histories[key][limitType];
    const numSamplesToRemove = getFirstSampleIdxWithinSameInterval(now, history, interval);
    history.splice(0, numSamplesToRemove);
    if (history.length === 0) {
      delete this.histories[key][limitType];
      if (Object.keys(this.histories[key]).length == 0) {
        delete this.histories[key];
      }
    } else {
      const timeWhenOldestSampleWillExpire = history[0] + interval + 1;
      setTimeout(
        () => this.removeStaleEntriesFromHistory(key, limitType),
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
