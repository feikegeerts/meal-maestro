import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { ConfigurationService } from '../../../../../lib/email/services/configuration-service';
import { EmailService } from '../../../../../lib/email/email-service';

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

// For development testing, you can use a test secret: 'test-webhook-secret-123'
// Make sure to configure the real secret in production

function verifyStandardWebhook(
  body: string, 
  webhookId: string,
  webhookTimestamp: string,
  webhookSignature: string,
  secret: string
): boolean {
  try {
    // TEMPORARY DEBUG LOGGING - Remove after fixing production issue
    const isProduction = process.env.NODE_ENV === 'production';
    const debugMode = isProduction; // Enable debug for production diagnosis
    
    if (debugMode) {
      console.log('🔍 [WEBHOOK DEBUG] Starting signature verification');
      console.log(`🔍 [WEBHOOK DEBUG] Environment: ${process.env.NODE_ENV}/${process.env.VERCEL_ENV}`);
      console.log(`🔍 [WEBHOOK DEBUG] Webhook ID: ${webhookId}`);
      console.log(`🔍 [WEBHOOK DEBUG] Webhook Timestamp: ${webhookTimestamp}`);
      console.log(`🔍 [WEBHOOK DEBUG] Received Signature: ${webhookSignature}`);
      console.log(`🔍 [WEBHOOK DEBUG] Body length: ${body.length} chars`);
      console.log(`🔍 [WEBHOOK DEBUG] Secret configured: ${secret ? 'YES' : 'NO'}`);
      console.log(`🔍 [WEBHOOK DEBUG] Secret length: ${secret.length} chars`);
      console.log(`🔍 [WEBHOOK DEBUG] Secret prefix: ${secret.substring(0, 4)}...`);
    }
    
    // Standard Webhooks format: webhookId.timestamp.body
    const signedPayload = `${webhookId}.${webhookTimestamp}.${body}`;
    
    if (debugMode) {
      console.log(`🔍 [WEBHOOK DEBUG] Signed payload length: ${signedPayload.length} chars`);
      console.log(`🔍 [WEBHOOK DEBUG] Signed payload prefix: ${signedPayload.substring(0, 100)}...`);
      console.log(`🔍 [WEBHOOK DEBUG] Full signed payload: ${signedPayload}`);
    }
    
    // Generate expected signature using HMAC-SHA256
    if (debugMode) {
      console.log(`🔍 [WEBHOOK DEBUG] HMAC secret being used (length ${secret.length}): ${secret.substring(0, 8)}...${secret.substring(secret.length - 8)}`);
      console.log(`🔍 [WEBHOOK DEBUG] HMAC secret full: ${secret}`);
    }
    
    const expectedSignature = createHmac('sha256', secret)
      .update(signedPayload, 'utf8')
      .digest('base64');
    
    if (debugMode) {
      console.log(`🔍 [WEBHOOK DEBUG] Expected signature: ${expectedSignature}`);
    }
    
    // Extract signature from v1,base64signature format
    if (!webhookSignature.startsWith('v1,')) {
      console.error('❌ [WEBHOOK DEBUG] Invalid signature format - must start with v1,');
      if (debugMode) {
        console.log(`🔍 [WEBHOOK DEBUG] Signature format check failed. Received: ${webhookSignature.substring(0, 10)}...`);
      }
      return false;
    }
    
    const signature = webhookSignature.substring(3); // Remove 'v1,'
    
    if (debugMode) {
      console.log(`🔍 [WEBHOOK DEBUG] Extracted signature: ${signature}`);
      console.log(`🔍 [WEBHOOK DEBUG] Signatures match: ${signature === expectedSignature ? 'YES' : 'NO'}`);
    }
    
    // Use timing-safe comparison to prevent timing attacks
    const sigBuffer = Buffer.from(signature, 'base64');
    const expectedBuffer = Buffer.from(expectedSignature, 'base64');
    
    // Ensure buffers are same length before comparison
    if (sigBuffer.length !== expectedBuffer.length) {
      console.error(`❌ [WEBHOOK DEBUG] Signature length mismatch: received ${sigBuffer.length}, expected ${expectedBuffer.length}`);
      return false;
    }
    
    const isValid = timingSafeEqual(sigBuffer, expectedBuffer);
    
    if (debugMode) {
      console.log(`🔍 [WEBHOOK DEBUG] Timing-safe comparison result: ${isValid ? 'VALID' : 'INVALID'}`);
    }
    
    return isValid;
  } catch (error) {
    console.error('❌ [WEBHOOK DEBUG] Standard webhook verification error:', error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const environment = process.env.NODE_ENV;
  const vercelEnv = process.env.VERCEL_ENV;
  
  // Get request info for logging
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const clientIP = request.headers.get('x-forwarded-for') || 'unknown';
  
  // Standard Webhooks specification headers
  const webhookId = request.headers.get('webhook-id');
  const webhookTimestamp = request.headers.get('webhook-timestamp');
  const webhookSignature = request.headers.get('webhook-signature');
  
  // Log security-relevant information
  console.log(`🔐 Auth hook request [${environment}/${vercelEnv}] from IP: ${clientIP}, User-Agent: ${userAgent}`);
  
  // TEMPORARY DEBUG LOGGING - Remove after fixing production issue
  const debugMode = environment === 'production';
  
  let webhookSecret: string;
  try {
    if (debugMode) {
      console.log('🔍 [WEBHOOK DEBUG] Loading webhook configuration...');
      console.log(`🔍 [WEBHOOK DEBUG] SUPABASE_WEBHOOK_SECRET exists: ${!!process.env.SUPABASE_WEBHOOK_SECRET}`);
      console.log(`🔍 [WEBHOOK DEBUG] Raw secret starts with: ${process.env.SUPABASE_WEBHOOK_SECRET?.substring(0, 4)}...`);
    }
    
    const configService = ConfigurationService.getInstance();
    const webhookConfig = configService.getWebhookConfig();
    webhookSecret = webhookConfig.secret;
    
    if (debugMode) {
      console.log(`🔍 [WEBHOOK DEBUG] Processed webhook secret loaded successfully, length: ${webhookSecret.length}`);
      console.log(`🔍 [WEBHOOK DEBUG] Processed webhook secret starts with: ${webhookSecret.substring(0, 4)}...`);
    }
  } catch (error) {
    console.error('❌ Webhook configuration error:', error);
    if (debugMode) {
      console.log('🔍 [WEBHOOK DEBUG] Available env vars:', Object.keys(process.env).filter(key => key.includes('WEBHOOK')));
    }
    return NextResponse.json(
      { error: 'Webhook configuration error' },
      { status: 500 }
    );
  }

  // Get the raw body for signature verification
  const body = await request.text();
  
  if (debugMode) {
    console.log(`🔍 [WEBHOOK DEBUG] Full webhook body: ${body}`);
  }
  
  // Always verify webhook signature for security (Standard Webhooks spec)
  if (!webhookId || !webhookTimestamp || !webhookSignature) {
    console.error(`❌ Missing required webhook headers from IP: ${clientIP}`, {
      hasId: !!webhookId,
      hasTimestamp: !!webhookTimestamp,
      hasSignature: !!webhookSignature
    });
    return NextResponse.json(
      { error: 'Missing required webhook headers (webhook-id, webhook-timestamp, webhook-signature)' },
      { status: 401 }
    );
  }

  // Verify webhook signature
  if (!verifyStandardWebhook(body, webhookId, webhookTimestamp, webhookSignature, webhookSecret)) {
    console.error(`❌ Invalid webhook signature from IP: ${clientIP}`);
    return NextResponse.json(
      { error: 'Invalid webhook signature' },
      { status: 401 }
    );
  }

  try {
    const payload: SupabaseAuthHookPayload = JSON.parse(body);
    
    // Map email_action_type to our email types
    const emailActionType = payload.email_data.email_action_type;
    let emailType: string;
    
    switch (emailActionType) {
      case 'signup':
        emailType = 'confirm_signup';
        break;
      case 'magiclink':
        emailType = 'magic_link';
        break;
      case 'recovery':
        emailType = 'magic_link'; // Use magic link template for recovery
        break;
      default:
        console.log(`⚠️ Unsupported email action type: ${emailActionType}`);
        return NextResponse.json({ message: 'Email action type not handled by custom hook' });
    }
    
    console.log(`🎯 Processing ${emailActionType} → ${emailType} for ${payload.user.email}`);

    const emailService = new EmailService();
    const userEmail = payload.user.email;
    
    // Build confirmation URL
    const confirmationUrl = buildConfirmationUrl(payload);
    
    // Extract Accept-Language header if present
    const acceptLanguageHeader = request.headers.get('accept-language') || undefined;
    
    const languageContext = {
      userMetadata: payload.user.user_metadata,
      acceptLanguageHeader
    };

    let result;
    
    switch (emailType) {
      case 'magic_link':
        result = await emailService.sendMagicLinkEmail(userEmail, confirmationUrl, languageContext);
        break;
        
      case 'confirm_signup':
        result = await emailService.sendConfirmSignupEmail(userEmail, confirmationUrl, languageContext);
        break;
        
      default:
        return NextResponse.json(
          { error: `Unsupported email type: ${emailType}` },
          { status: 400 }
        );
    }

    const processingTime = Date.now() - startTime;

    if (result.success) {
      console.log(`✅ ${emailType} email sent to ${userEmail} (${result.messageId})`);
      return NextResponse.json({
        message: `${emailType} email sent successfully`,
        messageId: result.messageId,
        processingTimeMs: processingTime
      });
    } else {
      console.error(`❌ Failed to send ${emailType} email to ${userEmail}:`, result.error);
      return NextResponse.json(
        { 
          error: result.error,
          processingTimeMs: processingTime
        },
        { status: 500 }
      );
    }

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`❌ Auth hook error after ${processingTime}ms:`, error);
    
    // Log additional context for debugging
    if (error instanceof SyntaxError) {
      console.error('❌ Invalid JSON payload received');
    }
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        processingTimeMs: processingTime
      },
      { status: 500 }
    );
  }
}

function buildConfirmationUrl(payload: SupabaseAuthHookPayload): string {
  const { email_data } = payload;
  const baseUrl = email_data.site_url;
  
  // Build the callback URL with appropriate parameters
  const url = new URL('/auth/callback', baseUrl);
  
  switch (email_data.email_action_type) {
    case 'magiclink':
      url.searchParams.set('token_hash', email_data.token_hash);
      url.searchParams.set('type', 'magiclink');
      break;
      
    case 'signup':
      url.searchParams.set('token_hash', email_data.token_hash);
      url.searchParams.set('type', 'signup');
      break;
      
    case 'recovery':
      url.searchParams.set('token_hash', email_data.token_hash);
      url.searchParams.set('type', 'recovery');
      break;
      
    default:
      url.searchParams.set('token_hash', email_data.token_hash);
      url.searchParams.set('type', email_data.email_action_type);
      break;
  }
  
  // Add redirect_to if provided
  if (email_data.redirect_to) {
    url.searchParams.set('redirect_to', email_data.redirect_to);
  }
  
  return url.toString();
}

// Health check endpoint for testing hook configuration
export async function GET() {
  let webhookSecretConfigured = false;
  try {
    const configService = ConfigurationService.getInstance();
    configService.getWebhookConfig();
    webhookSecretConfigured = true;
  } catch {
    webhookSecretConfigured = false;
  }

  return NextResponse.json({
    message: 'Supabase Send Email Hook endpoint is active',
    supportedEmailActionTypes: ['signup', 'magiclink', 'recovery'],
    webhookSecretConfigured,
    timestamp: new Date().toISOString()
  });
}