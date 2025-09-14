import { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

interface QueuedRequest {
  resolve: (session: Session | null) => void;
  reject: (error: Error) => void;
}

export class TokenManager {
  private static instance: TokenManager | null = null;
  private refreshPromise: Promise<Session | null> | null = null;
  private lastRefreshAttempt: number = 0;
  private requestQueue: QueuedRequest[] = [];
  private readonly REFRESH_COOLDOWN = 5000; // 5 seconds
  private readonly MAX_RETRIES = 3;

  // Basic monitoring
  private refreshAttempts = 0;
  private refreshSuccesses = 0;
  private refreshFailures = 0;

  private constructor() {}

  // Error sanitization for production
  private sanitizeError(error: unknown): string {
    if (process.env.NODE_ENV === 'production') {
      // Return generic error messages in production
      if (error instanceof Error) {
        if (error.message.includes('Already Used')) {
          return 'Token refresh conflict resolved';
        }
        if (error.message.includes('refresh_token')) {
          return 'Authentication session expired';
        }
        if (error.message.includes('network') || error.message.includes('fetch')) {
          return 'Network connectivity issue';
        }
      }
      return 'Authentication error occurred';
    }

    // Full error details in development
    return error instanceof Error ? error.message : String(error);
  }

  // Basic monitoring methods
  getAuthStats() {
    return {
      refreshAttempts: this.refreshAttempts,
      refreshSuccesses: this.refreshSuccesses,
      refreshFailures: this.refreshFailures,
      successRate: this.refreshAttempts > 0 ? (this.refreshSuccesses / this.refreshAttempts) : 0,
      lastRefreshAttempt: this.lastRefreshAttempt
    };
  }

  // Injected delay function for testing
  private delayFn: (ms: number) => Promise<void> = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  static getInstance(): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager();
    }
    return TokenManager.instance;
  }

  // For testing: inject a delay function
  setDelayFunction(delayFn: (ms: number) => Promise<void>): void {
    this.delayFn = delayFn;
  }

  async getValidSession(): Promise<Session | null> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        return null;
      }

      // Check if token needs refresh (within 5 minutes of expiry)
      const expiresAt = session.expires_at;
      const currentTime = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = expiresAt ? expiresAt - currentTime : 0;

      if (timeUntilExpiry <= 300) {
        return await this.refreshSession();
      }

      return session;
    } catch (error) {
      console.error("Error getting session:", error);
      return null;
    }
  }

  async refreshSession(): Promise<Session | null> {
    // If refresh is in progress, queue this request
    if (this.refreshPromise) {
      return new Promise((resolve, reject) => {
        this.requestQueue.push({ resolve, reject });
      });
    }

    // Check cooldown
    const now = Date.now();
    if (now - this.lastRefreshAttempt < this.REFRESH_COOLDOWN) {
      console.debug("Token refresh cooldown active, using existing session");
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    }

    this.lastRefreshAttempt = now;

    // Start refresh operation
    this.refreshPromise = this.performRefresh();

    try {
      const session = await this.refreshPromise;
      this.processQueue(session, null);
      return session;
    } catch (error) {
      this.processQueue(null, error as Error);
      throw error;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async performRefresh(): Promise<Session | null> {
    let lastError: Error | null = null;
    this.refreshAttempts++;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        console.debug(`Token refresh attempt ${attempt}/${this.MAX_RETRIES}`);

        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

        if (refreshData.session && !refreshError) {
          console.debug("Token refresh successful");
          this.refreshSuccesses++;

          // Sync tokens with server
          await this.syncTokensWithServer(refreshData.session);
          return refreshData.session;
        }

        // Handle "Already Used" error gracefully
        if (refreshError?.message?.includes("Already Used")) {
          console.debug("Refresh token already used - checking for valid session");

          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          if (session && !sessionError) {
            console.debug("Found valid session after 'Already Used' error");
            this.refreshSuccesses++;
            await this.syncTokensWithServer(session);
            return session;
          }
        }

        lastError = new Error(refreshError?.message || "Token refresh failed");

        // Log detailed error in development, sanitized in production
        if (process.env.NODE_ENV === 'development') {
          console.error(`Token refresh attempt ${attempt} failed:`, lastError.message);
        }

        // Wait before retry (exponential backoff)
        if (attempt < this.MAX_RETRIES) {
          const delay = Math.pow(2, attempt - 1) * 1000;
          await this.delayFn(delay);
        }
      } catch (error) {
        lastError = error as Error;
        if (process.env.NODE_ENV === 'development') {
          console.error(`Token refresh attempt ${attempt} exception:`, error);
        }
      }
    }

    this.refreshFailures++;
    const sanitizedErrorMessage = this.sanitizeError(lastError);
    throw new Error(sanitizedErrorMessage);
  }

  private async syncTokensWithServer(session: Session): Promise<void> {
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch("/api/auth/set-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
            expires_in: session.expires_in,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        if (!result.success) {
          throw new Error("Token sync failed on server");
        }

        console.debug('Token sync with server completed successfully');
        return;
      } catch (error) {
        console.error(`Failed to sync tokens with server (attempt ${attempt}/${maxRetries}):`, error);

        if (attempt === maxRetries) {
          console.error("All token sync attempts failed. Session may become invalid for server-side operations.");
          return;
        }

        // Exponential backoff
        const delay = Math.pow(2, attempt - 1) * 1000;
        await this.delayFn(delay);
      }
    }
  }

  private processQueue(session: Session | null, error: Error | null): void {
    const queue = [...this.requestQueue];
    this.requestQueue = [];

    queue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error);
      } else {
        resolve(session);
      }
    });
  }

  // For testing purposes
  static resetInstance(): void {
    TokenManager.instance = null;
  }
}

export const tokenManager = TokenManager.getInstance();