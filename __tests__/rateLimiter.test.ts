/**
 * rateLimiter.test.ts — Comprehensive tests for the sliding-window rate limiter.
 *
 * The source module has a module-level `setInterval(...).unref()` for bucket
 * sweeping. We use `jest.useFakeTimers()` to control time, and isolate each
 * test by re-importing the module so the internal `tracker` Map starts fresh.
 */

beforeEach(() => {
  jest.useFakeTimers();
  jest.resetModules(); // ensure a fresh tracker Map for each test
});

afterEach(() => {
  jest.useRealTimers();
});

describe('Rate Limiter — isRateLimited()', () => {
  test('allows the first 10 requests from the same IP (not rate-limited)', () => {
    const { isRateLimited } = require('../src/utils/rateLimiter');
    const ip = '10.0.0.1';

    for (let i = 0; i < 10; i++) {
      expect(isRateLimited(ip)).toBe(false);
    }
  });

  test('blocks the 11th request from the same IP (rate-limited)', () => {
    const { isRateLimited } = require('../src/utils/rateLimiter');
    const ip = '10.0.0.2';

    for (let i = 0; i < 10; i++) {
      isRateLimited(ip);
    }
    expect(isRateLimited(ip)).toBe(true);
  });

  test('continues blocking additional requests beyond the 11th', () => {
    const { isRateLimited } = require('../src/utils/rateLimiter');
    const ip = '10.0.0.3';

    for (let i = 0; i < 10; i++) {
      isRateLimited(ip);
    }
    // 11th, 12th, 13th should all be blocked
    expect(isRateLimited(ip)).toBe(true);
    expect(isRateLimited(ip)).toBe(true);
    expect(isRateLimited(ip)).toBe(true);
  });

  test('resets counter after the 60-second window expires', () => {
    const { isRateLimited } = require('../src/utils/rateLimiter');
    const ip = '10.0.0.4';

    // Exhaust the limit
    for (let i = 0; i < 10; i++) {
      isRateLimited(ip);
    }
    expect(isRateLimited(ip)).toBe(true);

    // Advance time past the 60s window
    jest.advanceTimersByTime(60_001);

    // After window expires, all old timestamps are outside the window
    expect(isRateLimited(ip)).toBe(false);
  });

  test('allows a burst, waits for partial window slide, then allows more', () => {
    const { isRateLimited } = require('../src/utils/rateLimiter');
    const ip = '10.0.0.5';

    // Use 5 requests
    for (let i = 0; i < 5; i++) {
      expect(isRateLimited(ip)).toBe(false);
    }

    // Advance 30 seconds
    jest.advanceTimersByTime(30_000);

    // Use 5 more (total of 10 in the current 60s window)
    for (let i = 0; i < 5; i++) {
      expect(isRateLimited(ip)).toBe(false);
    }

    // 11th should be blocked
    expect(isRateLimited(ip)).toBe(true);

    // Advance another 31 seconds — the first 5 timestamps (from t=0) fall out of window
    jest.advanceTimersByTime(31_000);

    // Now only 5 timestamps remain (from t=30s), so 5 more should be allowed
    for (let i = 0; i < 5; i++) {
      expect(isRateLimited(ip)).toBe(false);
    }
    // 11th again
    expect(isRateLimited(ip)).toBe(true);
  });

  test('multiple IPs have completely independent rate limits', () => {
    const { isRateLimited } = require('../src/utils/rateLimiter');
    const ipA = '10.0.0.10';
    const ipB = '10.0.0.11';
    const ipC = '10.0.0.12';

    // Exhaust ipA
    for (let i = 0; i < 10; i++) {
      isRateLimited(ipA);
    }
    expect(isRateLimited(ipA)).toBe(true);

    // ipB and ipC should be completely unaffected
    expect(isRateLimited(ipB)).toBe(false); // 1st request
    expect(isRateLimited(ipC)).toBe(false); // 1st request

    // Send 8 more requests to ipB (total 9)
    for (let i = 0; i < 8; i++) {
      isRateLimited(ipB);
    }
    expect(isRateLimited(ipB)).toBe(false); // 10th request
    expect(isRateLimited(ipB)).toBe(true); // 11th request

    // ipC still has 9 left
    expect(isRateLimited(ipC)).toBe(false);
  });

  test('new IP is never rate-limited on first request', () => {
    const { isRateLimited } = require('../src/utils/rateLimiter');
    expect(isRateLimited('brand-new-ip')).toBe(false);
  });
});
