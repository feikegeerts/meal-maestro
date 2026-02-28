import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { RecipeChatService } from "@/lib/recipe-chat-service";
import { ChatResponseFormatter } from "@/lib/chat-response-formatter";
import { OpenAITimeoutError } from "@/lib/openai-service";
import { MonthlySpendLimitError, usageLimitService } from "@/lib/usage-limit-service";
import { parseBody, ChatBodySchema } from "@/lib/request-schemas";
import { checkAIRateLimit } from "@/lib/ai-rate-limit";

export async function POST(request: NextRequest) {
  const authResult = await requireAuth();

  if (authResult instanceof Response) {
    return authResult;
  }

  const { user } = authResult;

  const rateLimit = await checkAIRateLimit(user.id, "chat");
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: `Rate limit exceeded. Try again in ${rateLimit.retryAfter} seconds.` },
      {
        status: 429,
        headers: {
          "X-RateLimit-Reset": new Date(rateLimit.resetTime).toISOString(),
          "Retry-After": rateLimit.retryAfter.toString(),
        },
      },
    );
  }

  let detectedLocale: string | undefined;

  try {
    const parsed = parseBody(ChatBodySchema, await request.json());
    if (!parsed.success) return parsed.error;

    const { message, conversation_history, images, context, locale } = parsed.data;

    if ((!message || message.trim().length === 0) && (!images || images.length === 0)) {
      return NextResponse.json(
        { error: "Message or image is required" },
        { status: 400 }
      );
    }

    // Detect user locale
    const userLocale = RecipeChatService.detectLocale(request, locale);
    detectedLocale = userLocale;

    // Create chat service and process message
    const chatService = new RecipeChatService(user.id, userLocale);
    const result = await chatService.processMessage({
      message,
      conversation_history,
      images,
      context,
      locale: userLocale
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Chat API error:", error);

    // Handle timeout errors specifically
    if (error instanceof OpenAITimeoutError) {
      return NextResponse.json(
        {
          error: "Request timeout",
          message: error.message,
          code: "TIMEOUT_ERROR",
          isRetryable: true
        },
        {
          status: 422, // Unprocessable Entity - won't trigger browser auto-retry
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
    }

    if (error instanceof MonthlySpendLimitError) {
      const localeForFormatting = detectedLocale === 'nl' ? 'nl-NL' : 'en-US';
      const now = new Date();
      const resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const resetLabel = resetDate.toLocaleDateString(localeForFormatting, {
        month: 'long',
        day: 'numeric',
      });

      const message = detectedLocale === 'nl'
        ? `Je hebt de AI-limiet voor deze maand bereikt. De limiet wordt op ${resetLabel} automatisch vernieuwd.`
        : `You've reached this month's AI usage limit. It resets on ${resetLabel}.`;

      return NextResponse.json(
        {
          error: message,
          message,
          code: error.code,
        },
        { status: 402 }
      );
    }

    if (error instanceof Error) {
      const responseFormatter = new ChatResponseFormatter(detectedLocale ?? 'en');
      const errorResponse = await responseFormatter.formatErrorResponse(error);

      if (errorResponse.status === 429) {
        await usageLimitService.recordRateLimitViolation(user.id, '/api/recipes/chat');
      }
      return NextResponse.json(
        { error: errorResponse.error },
        { status: errorResponse.status }
      );
    }

    return NextResponse.json(
      { error: "Internal server error while processing chat request" },
      { status: 500 }
    );
  }
}
