import { jest } from '@jest/globals';
import RateLimiter, { SECONDS_PER_HOUR } from './rate-limiter';
import { setJestTimeout } from './testing-helpers';

describe('RateLimitsService', () => {
  let rateLimiter: RateLimiter;
  const originalDateNow = Date.now;
  let mockDateNowValue = originalDateNow();
  const timeoutMsForDailyLimit = 1000 * 60 * 60 + 1;

  beforeAll(() => {
    setJestTimeout();
  });
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(global, 'setTimeout');
    Date.now = jest.fn(() => mockDateNowValue);
  });
  afterEach(() => {
    Date.now = originalDateNow;
    jest.restoreAllMocks();
    jest.useRealTimers();
    mockDateNowValue = originalDateNow();
  });
  beforeEach(async () => {
    rateLimiter = new RateLimiter();
  });

  it('should allow requests under the rate limit', () => {
    const limit = 6;
    rateLimiter.setLimits({ [SECONDS_PER_HOUR]: limit });
    const firstMockDateNowValue = mockDateNowValue;
    for (let i = 0; i < limit; i++) {
      expect(rateLimiter.tryAddRequestIfWithinLimits('key')).toBe(true);
      mockDateNowValue += 10;
    }
    expect(setTimeout).toHaveBeenCalledTimes(1);
    expect(setTimeout).toHaveBeenLastCalledWith(
      expect.any(Function),
      timeoutMsForDailyLimit,
    );

    mockDateNowValue = firstMockDateNowValue + timeoutMsForDailyLimit;
    jest.runOnlyPendingTimers();
    // Only the first request should have been removed from the history, so
    // a new timer should have been created
    expect(setTimeout).toHaveBeenCalledTimes(2);
    expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 10);

    expect(rateLimiter.tryAddRequestIfWithinLimits('key')).toBe(true);
    mockDateNowValue += 10;
    // History is not empty, so new timer should not have been created
    expect(setTimeout).toHaveBeenCalledTimes(2);

    for (let i = 0; i < limit; i++) {
      jest.runOnlyPendingTimers();
      if (i < limit - 1) {
        expect(setTimeout).toHaveBeenCalledTimes(3 + i);
        if (i < limit - 2) {
          expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 10);
          mockDateNowValue += 10;
        } else {
          const expected =
            firstMockDateNowValue +
            2 * timeoutMsForDailyLimit -
            mockDateNowValue;
          expect(setTimeout).toHaveBeenLastCalledWith(
            expect.any(Function),
            expected,
          );
          mockDateNowValue += expected;
        }
      } else {
        expect(setTimeout).toHaveBeenCalledTimes(3 + i - 1);
      }
    }

    // At this point the history should be empty
    for (let i = 0; i < limit; i++) {
      expect(rateLimiter.tryAddRequestIfWithinLimits('key')).toBe(true);
      mockDateNowValue += 10;
    }
  });

  it('should not allow requests over the rate limit', () => {
    const limit = 6;
    rateLimiter.setLimits({ [SECONDS_PER_HOUR]: limit });
    const firstMockDateNowValue = mockDateNowValue;
    for (let i = 0; i < limit; i++) {
      expect(rateLimiter.tryAddRequestIfWithinLimits('key')).toBe(true);
      mockDateNowValue += 10;
    }

    expect(rateLimiter.tryAddRequestIfWithinLimits('key')).toBe(false);

    mockDateNowValue = firstMockDateNowValue + timeoutMsForDailyLimit;
    jest.runOnlyPendingTimers();

    // Only one slot should have been freed up
    expect(rateLimiter.tryAddRequestIfWithinLimits('key')).toBe(true);
    mockDateNowValue += 1;
    expect(rateLimiter.tryAddRequestIfWithinLimits('key')).toBe(false);

    mockDateNowValue += 9;
    expect(rateLimiter.tryAddRequestIfWithinLimits('key')).toBe(true);
  });
});
