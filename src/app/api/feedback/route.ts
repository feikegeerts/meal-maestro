import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { createClient } from "@supabase/supabase-js";
import { getAppVersion } from "@/lib/version";

interface FeedbackRequest {
  feedbackType: string;
  subject: string;
  message: string;
}

interface FeedbackResponse {
  success: boolean;
  error?: string;
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuth();

  if (authResult instanceof Response) {
    return authResult;
  }

  const { user, client: supabase } = authResult;

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
              rateLimitCheck.resetTime
            ).toISOString(),
            "Retry-After": rateLimitCheck.retryAfter.toString(),
          },
        }
      );
    }

    const body: FeedbackRequest = await request.json();
    const { feedbackType, subject, message } = body;

    // Validate required fields
    if (!feedbackType || !subject || !message) {
      return NextResponse.json(
        {
          success: false,
          error: "Feedback type, subject, and message are required",
        },
        { status: 400 }
      );
    }

    // Validate feedback type
    const validTypes = [
      "bug_report",
      "feature_request",
      "general_feedback",
      "praise",
    ];
    if (!validTypes.includes(feedbackType)) {
      return NextResponse.json(
        { success: false, error: "Invalid feedback type" },
        { status: 400 }
      );
    }

    // Validate field lengths
    if (subject.trim().length === 0 || subject.length > 200) {
      return NextResponse.json(
        {
          success: false,
          error: "Subject must be between 1 and 200 characters",
        },
        { status: 400 }
      );
    }

    if (message.trim().length === 0 || message.length > 2000) {
      return NextResponse.json(
        {
          success: false,
          error: "Message must be between 1 and 2000 characters",
        },
        { status: 400 }
      );
    }

    // Get additional context
    const { version } = getAppVersion();
    const referer = request.headers.get("referer") || "";

    // Extract locale from Accept-Language header or use default
    const acceptLanguage = request.headers.get("accept-language") || "";
    const locale = acceptLanguage.split(",")[0]?.split("-")[0] || "en";

    // Insert feedback into database
    const { error } = await supabase.from("feedback").insert([
      {
        user_id: user.id,
        user_email: user.email || "",
        feedback_type: feedbackType,
        subject: subject.trim(),
        message: message.trim(),
        app_version: version,
        locale: locale,
        page_url: referer,
        status: "open",
      },
    ]);

    if (error) {
      console.error("Error creating feedback:", error);
      return NextResponse.json(
        { success: false, error: "Failed to submit feedback" },
        { status: 500 }
      );
    }

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
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed. Use POST to submit feedback." },
    { status: 405 }
  );
}

// Rate limiting for feedback submissions (5 per hour)
async function checkRateLimit(userId: string): Promise<{
  allowed: boolean;
  retryAfter: number;
  resetTime: number;
}> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // 1 hour window
  const maxRequests = 5; // 5 feedback submissions per hour
  const windowStart = now - windowMs;

  try {
    // Clean up old entries (older than 24 hours)
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    await supabase.from("rate_limit_user").delete().lt("timestamp", oneDayAgo);

    // Get current requests in window
    const { data: attempts, error } = await supabase
      .from("rate_limit_user")
      .select("timestamp")
      .eq("user_id", userId)
      .eq("endpoint", "/api/feedback")
      .gte("timestamp", windowStart)
      .order("timestamp", { ascending: false });

    if (error) {
      // If database fails, allow request (fail open for availability)
      console.warn(
        "Feedback rate limit check failed, allowing request:",
        error
      );
      return {
        allowed: true,
        retryAfter: 0,
        resetTime: now + windowMs,
      };
    }

    const currentCount = attempts?.length || 0;

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
    await supabase.from("rate_limit_user").insert({
      user_id: userId,
      endpoint: "/api/feedback",
      timestamp: now,
    });

    return {
      allowed: true,
      retryAfter: 0,
      resetTime: now + windowMs,
    };
  } catch (error) {
    // If anything fails, allow the request (fail open)
    console.warn("Feedback rate limit check failed, allowing request:", error);
    return {
      allowed: true,
      retryAfter: 0,
      resetTime: now + windowMs,
    };
  }
}
