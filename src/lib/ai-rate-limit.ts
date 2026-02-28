import { db } from "@/db";
import { rateLimitUser } from "@/db/schema";
import { and, eq, gte, lt, count } from "drizzle-orm";

export const AI_RATE_LIMITS = {
  chat: { maxRequests: 20, windowMs: 60 * 1000 },
  nutrition: { maxRequests: 10, windowMs: 60 * 1000 },
} as const;

export type AIRateLimitEndpoint = keyof typeof AI_RATE_LIMITS;

export interface RateLimitResult {
  allowed: boolean;
  retryAfter: number; // seconds
  resetTime: number; // Unix ms
}

export async function checkAIRateLimit(
  userId: string,
  endpoint: AIRateLimitEndpoint,
): Promise<RateLimitResult> {
  const { maxRequests, windowMs } = AI_RATE_LIMITS[endpoint];
  const now = Date.now();
  const windowStart = now - windowMs;

  try {
    // Clean up entries older than 1 hour
    const oneHourAgo = now - 60 * 60 * 1000;
    await db
      .delete(rateLimitUser)
      .where(lt(rateLimitUser.timestamp, BigInt(oneHourAgo)));

    const [result] = await db
      .select({ count: count() })
      .from(rateLimitUser)
      .where(
        and(
          eq(rateLimitUser.userId, userId),
          eq(rateLimitUser.endpoint, `/api/recipes/${endpoint}`),
          gte(rateLimitUser.timestamp, BigInt(windowStart)),
        ),
      );

    const currentCount = result?.count ?? 0;

    if (currentCount >= maxRequests) {
      const resetTime = windowStart + windowMs;
      return {
        allowed: false,
        retryAfter: Math.ceil((resetTime - now) / 1000),
        resetTime,
      };
    }

    await db.insert(rateLimitUser).values({
      userId,
      endpoint: `/api/recipes/${endpoint}`,
      timestamp: BigInt(now),
    });

    return {
      allowed: true,
      retryAfter: 0,
      resetTime: now + windowMs,
    };
  } catch (error) {
    // Fail open — a DB outage shouldn't block users
    console.warn(
      `[AI rate limit] Check failed for ${endpoint}, allowing request:`,
      error,
    );
    return {
      allowed: true,
      retryAfter: 0,
      resetTime: now + windowMs,
    };
  }
}
