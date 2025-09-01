import { AuthError } from '@supabase/supabase-js';

export interface RateLimitInfo {
  isRateLimited: boolean;
  resetTime: number; // Unix timestamp when rate limit resets
  waitTimeMs: number; // Milliseconds to wait
  waitTimeText: string; // Human readable wait time
}

const RATE_LIMIT_STORAGE_KEY = 'supabase_email_rate_limit';

interface StoredRateLimitData {
  resetTime: number;
  errorCount: number;
  lastErrorTime: number;
}

export class RateLimitManager {
  private static instance: RateLimitManager;
  
  static getInstance(): RateLimitManager {
    if (!RateLimitManager.instance) {
      RateLimitManager.instance = new RateLimitManager();
    }
    return RateLimitManager.instance;
  }

  /**
   * Analyzes Supabase auth error to determine if it's rate limited
   * and calculates appropriate wait times
   */
  analyzeRateLimit(error: AuthError | Error): RateLimitInfo {
    const errorMessage = error.message.toLowerCase();
    const now = Date.now();
    
    // Check if this is a rate limit error
    const isRateLimitError = this.isRateLimitError(error);
    
    if (!isRateLimitError) {
      return {
        isRateLimited: false,
        resetTime: now,
        waitTimeMs: 0,
        waitTimeText: ''
      };
    }

    // Get stored rate limit data
    const stored = this.getStoredRateLimitData();
    
    // Calculate wait time based on error patterns and stored data
    const waitTimeMs = this.calculateWaitTime(errorMessage, stored, now);
    const resetTime = now + waitTimeMs;
    
    // Update stored data
    this.updateStoredRateLimitData({
      resetTime,
      errorCount: stored.errorCount + 1,
      lastErrorTime: now
    });

    return {
      isRateLimited: true,
      resetTime,
      waitTimeMs,
      waitTimeText: this.formatWaitTime(waitTimeMs)
    };
  }

  /**
   * Check if we're currently rate limited based on stored data
   */
  isCurrentlyRateLimited(): boolean {
    const stored = this.getStoredRateLimitData();
    return Date.now() < stored.resetTime;
  }

  /**
   * Get remaining wait time if currently rate limited
   */
  getRemainingWaitTime(): RateLimitInfo {
    const stored = this.getStoredRateLimitData();
    const now = Date.now();
    
    if (now >= stored.resetTime) {
      return {
        isRateLimited: false,
        resetTime: now,
        waitTimeMs: 0,
        waitTimeText: ''
      };
    }

    const waitTimeMs = stored.resetTime - now;
    return {
      isRateLimited: true,
      resetTime: stored.resetTime,
      waitTimeMs,
      waitTimeText: this.formatWaitTime(waitTimeMs)
    };
  }

  /**
   * Clear rate limit data (call when rate limit is successfully reset)
   */
  clearRateLimit(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(RATE_LIMIT_STORAGE_KEY);
    }
  }

  private isRateLimitError(error: AuthError | Error): boolean {
    const message = error.message.toLowerCase();
    return (
      message.includes('rate limit') ||
      message.includes('over_email_send_rate_limit') ||
      message.includes('too many') ||
      message.includes('security purposes') ||
      (message.includes('60 seconds') && message.includes('request')) ||
      (message.includes('after') && message.includes('seconds'))
    );
  }

  private calculateWaitTime(errorMessage: string, stored: StoredRateLimitData, now: number): number {
    // If we have a stored reset time that's still in the future, use it
    if (stored.resetTime > now) {
      return stored.resetTime - now;
    }

    // Parse specific time mentions in error message
    const timeMatch = errorMessage.match(/(\d+)\s*seconds?/);
    if (timeMatch) {
      return parseInt(timeMatch[1]) * 1000;
    }

    // Use escalating backoff based on error count
    const baseWaitTime = this.getBaseWaitTime(errorMessage);
    const backoffMultiplier = Math.min(stored.errorCount, 5); // Cap at 5x
    return baseWaitTime * Math.pow(1.5, backoffMultiplier);
  }

  private getBaseWaitTime(errorMessage: string): number {
    // Different base wait times for different error patterns
    if (errorMessage.includes('over_email_send_rate_limit')) {
      // Supabase email rate limit - typically hourly
      return 60 * 60 * 1000; // 1 hour
    }
    
    if (errorMessage.includes('60 seconds')) {
      return 60 * 1000; // 1 minute
    }
    
    if (errorMessage.includes('security purposes')) {
      return 5 * 60 * 1000; // 5 minutes
    }
    
    // Default fallback
    return 2 * 60 * 1000; // 2 minutes
  }

  private formatWaitTime(waitTimeMs: number): string {
    const totalSeconds = Math.ceil(waitTimeMs / 1000);
    
    if (totalSeconds < 60) {
      return `${totalSeconds} second${totalSeconds === 1 ? '' : 's'}`;
    }
    
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    if (minutes < 60) {
      if (seconds === 0) {
        return `${minutes} minute${minutes === 1 ? '' : 's'}`;
      }
      return `${minutes} minute${minutes === 1 ? '' : 's'} and ${seconds} second${seconds === 1 ? '' : 's'}`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (remainingMinutes === 0) {
      return `${hours} hour${hours === 1 ? '' : 's'}`;
    }
    
    return `${hours} hour${hours === 1 ? '' : 's'} and ${remainingMinutes} minute${remainingMinutes === 1 ? '' : 's'}`;
  }

  private getStoredRateLimitData(): StoredRateLimitData {
    if (typeof window === 'undefined') {
      return { resetTime: 0, errorCount: 0, lastErrorTime: 0 };
    }

    try {
      const stored = localStorage.getItem(RATE_LIMIT_STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored) as StoredRateLimitData;
        // Reset error count if it's been more than 24 hours since last error
        if (Date.now() - data.lastErrorTime > 24 * 60 * 60 * 1000) {
          return { ...data, errorCount: 0 };
        }
        return data;
      }
    } catch (error) {
      console.warn('Failed to parse rate limit data from localStorage:', error);
    }

    return { resetTime: 0, errorCount: 0, lastErrorTime: 0 };
  }

  private updateStoredRateLimitData(data: StoredRateLimitData): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(RATE_LIMIT_STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to store rate limit data:', error);
    }
  }
}

// Export singleton instance
export const rateLimitManager = RateLimitManager.getInstance();