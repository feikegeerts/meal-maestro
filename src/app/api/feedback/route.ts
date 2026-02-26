import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { db } from "@/db";
import { feedback, rateLimitUser } from "@/db/schema";
import { and, eq, gte, lt, count } from "drizzle-orm";
import { getAppVersion } from "@/lib/version";
import { parseBody, FeedbackBodySchema } from "@/lib/request-schemas";

interface FeedbackResponse {
  success: boolean;
  error?: string;
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuth();

  if (authResult instanceof Response) {
    return authResult;
  }

  const { user } = authResult;

  try {
    // Check rate limiting (5 submissions per hour)
    const rateLimitCheck = await checkRateLimit(user.id);
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Too many feedback submissions. Try again in ${rateLimitCheck.retryAfter} seconds.`,
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Reset": new Date(
              rateLimitCheck.resetTime,
            ).toISOString(),
            "Retry-After": rateLimitCheck.retryAfter.toString(),
          },
        },
      );
    }

    const parsed = parseBody(FeedbackBodySchema, await request.json());
    if (!parsed.success) return parsed.error;

    const { feedbackType, subject, message } = parsed.data;

    // Get additional context
    const { version } = getAppVersion();
    const referer = request.headers.get("referer") || "";

    // Extract locale from Accept-Language header or use default
    const acceptLanguage = request.headers.get("accept-language") || "";
    const locale = acceptLanguage.split(",")[0]?.split("-")[0] || "en";

    // Insert feedback into database
    await db.insert(feedback).values({
      userId: user.id,
      userEmail: user.email || "",
      feedbackType,
      subject: subject.trim(),
      message: message.trim(),
      appVersion: version,
      locale,
      pageUrl: referer,
      status: "open",
    });

    const response: FeedbackResponse = {
      success: true,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error("🔴 [Feedback] API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error while submitting feedback",
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed. Use POST to submit feedback." },
    { status: 405 },
  );
}

// Rate limiting for feedback submissions (5 per hour)
async function checkRateLimit(userId: string): Promise<{
  allowed: boolean;
  retryAfter: number;
  resetTime: number;
}> {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // 1 hour window
  const maxRequests = 5; // 5 feedback submissions per hour
  const windowStart = now - windowMs;

  try {
    // Clean up old entries (older than 24 hours)
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    await db
      .delete(rateLimitUser)
      .where(lt(rateLimitUser.timestamp, BigInt(oneDayAgo)));

    // Get current requests in window
    const [result] = await db
      .select({ count: count() })
      .from(rateLimitUser)
      .where(
        and(
          eq(rateLimitUser.userId, userId),
          eq(rateLimitUser.endpoint, "/api/feedback"),
          gte(rateLimitUser.timestamp, BigInt(windowStart)),
        ),
      );

    const currentCount = result?.count ?? 0;

    if (currentCount >= maxRequests) {
      // Rate limit exceeded
      const resetTime = windowStart + windowMs;
      return {
        allowed: false,
        retryAfter: Math.ceil((resetTime - now) / 1000),
        resetTime,
      };
    }

    // Record this attempt
    await db.insert(rateLimitUser).values({
      userId,
      endpoint: "/api/feedback",
      timestamp: BigInt(now),
    });

    return {
      allowed: true,
      retryAfter: 0,
      resetTime: now + windowMs,
    };
  } catch (error) {
    // If anything fails, allow the request (fail open)
    console.warn(
      "Feedback rate limit check failed, allowing request:",
      error,
    );
    return {
      allowed: true,
      retryAfter: 0,
      resetTime: now + windowMs,
    };
  }
}
