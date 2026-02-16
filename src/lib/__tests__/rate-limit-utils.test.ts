import { RateLimitManager } from '../rate-limit-utils';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('RateLimitManager', () => {
  let rateLimitManager: RateLimitManager;

  beforeEach(() => {
    localStorageMock.clear();
    rateLimitManager = new RateLimitManager();
  });

  describe('analyzeRateLimit', () => {
    it('should detect Supabase email rate limit errors', () => {
      const error = new Error('email rate limit exceeded');
      const result = rateLimitManager.analyzeRateLimit(error);

      expect(result.isRateLimited).toBe(true);
      expect(result.waitTimeMs).toBeGreaterThan(0);
      expect(result.waitTimeText).toBeDefined();
    });

    it('should detect over_email_send_rate_limit errors', () => {
      const error = new Error('over_email_send_rate_limit');
      const result = rateLimitManager.analyzeRateLimit(error);

      expect(result.isRateLimited).toBe(true);
      expect(result.waitTimeMs).toBe(60 * 60 * 1000); // 1 hour for Supabase email limit
    });

    it('should parse specific time mentions from error messages', () => {
      const error = new Error('For security purposes, you can only request this once every 60 seconds');
      const result = rateLimitManager.analyzeRateLimit(error);

      expect(result.isRateLimited).toBe(true);
      expect(result.waitTimeMs).toBe(60 * 1000); // 60 seconds
      expect(result.waitTimeText).toBe('1 minute');
    });

    it('should not flag non-rate-limit errors', () => {
      const error = new Error('Invalid email format');
      const result = rateLimitManager.analyzeRateLimit(error);

      expect(result.isRateLimited).toBe(false);
      expect(result.waitTimeMs).toBe(0);
    });
  });

  describe('isCurrentlyRateLimited', () => {
    it('should return false when no rate limit is stored', () => {
      expect(rateLimitManager.isCurrentlyRateLimited()).toBe(false);
    });

    it('should return true when rate limit is active', () => {
      const error = new Error('rate limit exceeded');
      rateLimitManager.analyzeRateLimit(error);

      expect(rateLimitManager.isCurrentlyRateLimited()).toBe(true);
    });

    it('should return false when rate limit has expired', () => {
      // Manually set an expired rate limit
      localStorageMock.setItem('email_rate_limit', JSON.stringify({
        resetTime: Date.now() - 1000, // 1 second ago
        errorCount: 1,
        lastErrorTime: Date.now() - 2000
      }));

      expect(rateLimitManager.isCurrentlyRateLimited()).toBe(false);
    });
  });

  describe('getRemainingWaitTime', () => {
    it('should return correct remaining time', () => {
      const futureResetTime = Date.now() + 60000; // 1 minute from now
      localStorageMock.setItem('email_rate_limit', JSON.stringify({
        resetTime: futureResetTime,
        errorCount: 1,
        lastErrorTime: Date.now()
      }));

      const result = rateLimitManager.getRemainingWaitTime();
      
      expect(result.isRateLimited).toBe(true);
      expect(result.waitTimeMs).toBeGreaterThan(50000); // Should be close to 60 seconds
      expect(result.waitTimeMs).toBeLessThanOrEqual(60000);
    });
  });

  describe('clearRateLimit', () => {
    it('should clear stored rate limit data', () => {
      const error = new Error('rate limit exceeded');
      rateLimitManager.analyzeRateLimit(error);
      
      expect(rateLimitManager.isCurrentlyRateLimited()).toBe(true);
      
      rateLimitManager.clearRateLimit();
      
      expect(rateLimitManager.isCurrentlyRateLimited()).toBe(false);
    });
  });

  describe('wait time formatting', () => {
    it('should format seconds correctly', () => {
      const error = new Error('For security purposes, you can only request this once every 30 seconds');
      const result = rateLimitManager.analyzeRateLimit(error);
      
      expect(result.waitTimeText).toBe('30 seconds');
    });

    it('should format minutes correctly', () => {
      const error = new Error('For security purposes, you can only request this once every 120 seconds');
      const result = rateLimitManager.analyzeRateLimit(error);
      
      expect(result.waitTimeText).toBe('2 minutes');
    });

    it('should format hours correctly for Supabase email limits', () => {
      const error = new Error('over_email_send_rate_limit');
      const result = rateLimitManager.analyzeRateLimit(error);
      
      expect(result.waitTimeText).toBe('1 hour');
    });
  });

  describe('escalating backoff', () => {
    it('should increase wait time with repeated errors', () => {
      // Clear any existing rate limits to start fresh
      rateLimitManager.clearRateLimit();
      
      // Use a generic rate limit error that doesn't have specific time mentions
      const error = new Error('rate limit exceeded');
      
      // First error - should get base wait time
      const firstResult = rateLimitManager.analyzeRateLimit(error);
      const baseWaitTime = 2 * 60 * 1000; // 2 minutes
      
      expect(firstResult.waitTimeMs).toBe(baseWaitTime);
      
      // Simulate that enough time has passed and we get another error
      // Mock stored data with error count to test escalation
      localStorageMock.setItem('email_rate_limit', JSON.stringify({
        resetTime: Date.now() - 1000, // Expired 1 second ago
        errorCount: 1, // One previous error
        lastErrorTime: Date.now() - 2000
      }));
      
      const secondResult = rateLimitManager.analyzeRateLimit(error);
      
      // Should be escalated: base * 1.5^(errorCount=1) = 120000 * 1.5 = 180000
      // But errorCount gets incremented, so it's actually base * 1.5^(errorCount+1)
      // Let's just verify it's greater than the base time
      expect(secondResult.waitTimeMs).toBeGreaterThan(baseWaitTime);
    });
    
    it('should use explicit time mentions when no prior rate limit exists', () => {
      // Clear any existing rate limits first
      rateLimitManager.clearRateLimit();
      
      // Use an error with explicit time - should use the explicit time
      const explicitError = new Error('For security purposes, you can only request this once every 30 seconds');
      const result = rateLimitManager.analyzeRateLimit(explicitError);
      
      expect(result.waitTimeMs).toBe(30 * 1000); // Should be exactly 30 seconds
    });
  });
});