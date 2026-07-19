import { isRateLimited } from '../src/utils/rateLimiter';

describe('Rate Limiter Utility Tests', () => {
  test('allows up to 10 requests within sliding window', () => {
    const ip = '192.168.1.1';
    for (let i = 0; i < 10; i++) {
      expect(isRateLimited(ip)).toBe(false);
    }
  });

  test('blocks the 11th request', () => {
    const ip = '192.168.1.2';
    for (let i = 0; i < 10; i++) {
      isRateLimited(ip);
    }
    expect(isRateLimited(ip)).toBe(true);
  });

  test('keeps rate limits isolated by IP address', () => {
    const ipA = '192.168.1.3';
    const ipB = '192.168.1.4';

    for (let i = 0; i < 10; i++) {
      isRateLimited(ipA);
    }
    expect(isRateLimited(ipA)).toBe(true);
    expect(isRateLimited(ipB)).toBe(false);
  });
});
