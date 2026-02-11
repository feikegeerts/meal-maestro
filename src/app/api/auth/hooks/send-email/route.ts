import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "standardwebhooks";
import { ConfigurationService } from "../../../../../lib/email/services/configuration-service";
import { EmailService } from "../../../../../lib/email/email-service";

interface SupabaseAuthHookPayload {
  user: {
    id: string;
    email: string;
    user_metadata?: Record<string, unknown>;
    aud: string;
    role: string;
    phone: string;
    app_metadata: Record<string, unknown>;
    identities: Array<unknown>;
    created_at: string;
    updated_at: string;
    is_anonymous: boolean;
  };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to?: string;
    email_action_type: string;
    site_url: string;
    token_new?: string;
    token_hash_new?: string;
  };
}

// Using official standardwebhooks library for proper Supabase compatibility

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const environment = process.env.NODE_ENV;
  const vercelEnv = process.env.VERCEL_ENV;

  // Get request info for logging
  const userAgent = request.headers.get("user-agent") || "unknown";
  const clientIP = request.headers.get("x-forwarded-for") || "unknown";

  // Standard Webhooks specification headers
  const webhookId = request.headers.get("webhook-id");
  const webhookTimestamp = request.headers.get("webhook-timestamp");
  const webhookSignature = request.headers.get("webhook-signature");

  // Log security-relevant information
  console.log(
    `🔐 Auth hook request [${environment}/${vercelEnv}] from IP: ${clientIP}, User-Agent: ${userAgent}`
  );

  let webhookSecret: string;
  try {
    const configService = ConfigurationService.getInstance();
    const webhookConfig = configService.getWebhookConfig();
    webhookSecret = webhookConfig.secret;
  } catch (error) {
    console.error("❌ Webhook configuration error:", error);
    return NextResponse.json(
      { error: "Webhook configuration error" },
      { status: 500 }
    );
  }

  // Get the raw body for signature verification
  const body = await request.text();

  // Verify webhook signature using official standardwebhooks library
  // Ensure all required headers are present and not null
  if (!webhookId || !webhookTimestamp || !webhookSignature) {
    console.error(`❌ Missing required webhook headers from IP: ${clientIP}`, {
      hasId: !!webhookId,
      hasTimestamp: !!webhookTimestamp,
      hasSignature: !!webhookSignature,
    });
    return NextResponse.json(
      {
        error:
          "Missing required webhook headers (webhook-id, webhook-timestamp, webhook-signature)",
      },
      { status: 401 }
    );
  }

  const headers = {
    "webhook-id": webhookId,
    "webhook-timestamp": webhookTimestamp,
    "webhook-signature": webhookSignature,
  };

  try {
    const wh = new Webhook(webhookSecret);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _verifiedPayload = wh.verify(
      body,
      headers
    ) as SupabaseAuthHookPayload;

    console.log(
      `✅ Webhook signature verified successfully using standardwebhooks library`
    );
  } catch (error) {
    console.error(
      `❌ Webhook signature verification failed from IP: ${clientIP}:`,
      error
    );
    return NextResponse.json(
      { error: "Invalid webhook signature" },
      { status: 401 }
    );
  }

  try {
    const payload: SupabaseAuthHookPayload = JSON.parse(body);

    // Map email_action_type to our email types
    const emailActionType = payload.email_data.email_action_type;
    let emailType: string;

    switch (emailActionType) {
      case "signup":
        emailType = "confirm_signup";
        break;
      case "magiclink":
        emailType = "magic_link";
        break;
      case "recovery":
        emailType = "magic_link"; // Use magic link template for recovery
        break;
      default:
        console.log(`⚠️ Unsupported email action type: ${emailActionType}`);
        return NextResponse.json({
          message: "Email action type not handled by custom hook",
        });
    }

    console.log(
      `🎯 Processing ${emailActionType} → ${emailType} for ${payload.user.email}`
    );

    const emailService = new EmailService();
    const userEmail = payload.user.email;

    // Build confirmation URL
    const confirmationUrl = buildConfirmationUrl(payload);

    // Extract Accept-Language header if present
    const acceptLanguageHeader =
      request.headers.get("accept-language") || undefined;

    // Extract page locale from user metadata pageUrl (e.g., /nl/login -> 'nl', /en/login -> 'en')
    const pageUrl = payload.user.user_metadata?.pageUrl as string;
    let pageLocale: string | undefined;
    if (pageUrl) {
      const pageUrlMatch = pageUrl.match(/\/([a-z]{2})\/[^/]*$/);
      if (
        pageUrlMatch &&
        (pageUrlMatch[1] === "nl" || pageUrlMatch[1] === "en")
      ) {
        pageLocale = pageUrlMatch[1];
      }
    }

    const languageContext = {
      userMetadata: payload.user.user_metadata,
      pageLocale,
      acceptLanguageHeader,
    };

    let result;

    switch (emailType) {
      case "magic_link":
        result = await emailService.sendMagicLinkEmail(
          userEmail,
          confirmationUrl,
          languageContext
        );
        break;

      case "confirm_signup":
        result = await emailService.sendConfirmSignupEmail(
          userEmail,
          confirmationUrl,
          languageContext
        );
        break;

      default:
        return NextResponse.json(
          { error: `Unsupported email type: ${emailType}` },
          { status: 400 }
        );
    }

    const processingTime = Date.now() - startTime;

    if (result.success) {
      console.log(
        `✅ ${emailType} email sent to ${userEmail} (${result.messageId})`
      );
      return NextResponse.json({
        message: `${emailType} email sent successfully`,
        messageId: result.messageId,
        processingTimeMs: processingTime,
      });
    } else {
      console.error(
        `❌ Failed to send ${emailType} email to ${userEmail}:`,
        result.error
      );
      return NextResponse.json(
        {
          error: result.error,
          processingTimeMs: processingTime,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`❌ Auth hook error after ${processingTime}ms:`, error);

    // Log additional context for debugging
    if (error instanceof SyntaxError) {
      console.error("❌ Invalid JSON payload received");
    }

    return NextResponse.json(
      {
        error: "Internal server error",
        processingTimeMs: processingTime,
      },
      { status: 500 }
    );
  }
}

function buildConfirmationUrl(payload: SupabaseAuthHookPayload): string {
  const { email_data } = payload;

  // Use originUrl from user metadata if available, otherwise fallback to environment detection
  const originUrl = payload.user.user_metadata?.originUrl as string;
  const isLocalRequest = originUrl?.includes("localhost");

  const baseUrl = isLocalRequest
    ? originUrl // Use the exact origin URL passed from client
    : process.env.NODE_ENV === "production"
    ? "https://meal-maestro.com"
    : process.env.VERCEL_ENV === "preview"
    ? "https://preview.meal-maestro.com"
    : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

  // Build the callback URL with appropriate parameters
  const url = new URL("/auth/callback", baseUrl);

  // Extract locale from pageUrl if available and add to callback URL
  const pageUrl = payload.user.user_metadata?.pageUrl as string;
  let detectedLocale = "en"; // default fallback
  if (pageUrl) {
    const pageUrlMatch = pageUrl.match(/\/([a-z]{2})\/[^/]*$/);
    if (
      pageUrlMatch &&
      (pageUrlMatch[1] === "nl" || pageUrlMatch[1] === "en")
    ) {
      detectedLocale = pageUrlMatch[1];
    }
  }

  switch (email_data.email_action_type) {
    case "magiclink":
      url.searchParams.set("token_hash", email_data.token_hash);
      url.searchParams.set("type", "magiclink");
      break;

    case "signup":
      url.searchParams.set("token_hash", email_data.token_hash);
      url.searchParams.set("type", "signup");
      break;

    case "recovery":
      url.searchParams.set("token_hash", email_data.token_hash);
      url.searchParams.set("type", "recovery");
      break;

    default:
      url.searchParams.set("token_hash", email_data.token_hash);
      url.searchParams.set("type", email_data.email_action_type);
      break;
  }

  // Add locale parameter for proper redirect
  url.searchParams.set("locale", detectedLocale);

  // Don't add redirect_to - it causes infinite loops when pointing to callback URL
  // Magic links will always redirect to the recipes page after successful auth

  return url.toString();
}

// Health check endpoint for testing hook configuration
export async function GET() {
  let webhookSecretConfigured: boolean;
  try {
    const configService = ConfigurationService.getInstance();
    configService.getWebhookConfig();
    webhookSecretConfigured = true;
  } catch {
    webhookSecretConfigured = false;
  }

  return NextResponse.json({
    message: "Supabase Send Email Hook endpoint is active",
    supportedEmailActionTypes: ["signup", "magiclink", "recovery"],
    webhookSecretConfigured,
    timestamp: new Date().toISOString(),
  });
}
