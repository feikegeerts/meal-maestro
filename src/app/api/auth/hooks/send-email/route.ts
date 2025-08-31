import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { ConfigurationService } from '../../../../../lib/email/services/configuration-service';
import { EmailService } from '../../../../../lib/email/email-service';

interface SupabaseAuthHookPayload {
  event_type: 'send_email';
  email_type: 'magic_link' | 'confirm_signup' | 'recovery' | 'email_change_new' | 'email_change_current';
  user: {
    id: string;
    email: string;
    user_metadata?: Record<string, unknown>;
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

function verifySupabaseWebhook(body: string, signature: string, secret: string): boolean {
  if (!signature || !signature.startsWith('v1,')) {
    return false;
  }

  try {
    // Extract the signature from the v1,whsec_ format
    const sigPart = signature.substring(3); // Remove 'v1,'
    
    // Validate signature format (should be base64)
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(sigPart)) {
      console.error('Invalid signature format');
      return false;
    }
    
    // Generate expected signature using HMAC-SHA256
    const expectedSignature = createHmac('sha256', secret)
      .update(body, 'utf8')
      .digest('base64');
    
    // Use timing-safe comparison to prevent timing attacks
    const sigBuffer = Buffer.from(sigPart, 'base64');
    const expectedBuffer = Buffer.from(expectedSignature, 'base64');
    
    // Ensure buffers are same length before comparison
    if (sigBuffer.length !== expectedBuffer.length) {
      return false;
    }
    
    return timingSafeEqual(sigBuffer, expectedBuffer);
  } catch (error) {
    console.error('Webhook verification error:', error);
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
  const signature = request.headers.get('x-webhook-signature') || request.headers.get('webhook-signature');
  
  // Log security-relevant information
  console.log(`🔐 Auth hook request [${environment}/${vercelEnv}] from IP: ${clientIP}, User-Agent: ${userAgent}`);
  
  let webhookSecret: string;
  try {
    const configService = ConfigurationService.getInstance();
    const webhookConfig = configService.getWebhookConfig();
    webhookSecret = webhookConfig.secret;
  } catch (error) {
    console.error('❌ Webhook configuration error:', error);
    return NextResponse.json(
      { error: 'Webhook configuration error' },
      { status: 500 }
    );
  }

  // Get the raw body for signature verification
  const body = await request.text();
  
  // Always verify webhook signature for security
  if (!signature) {
    console.error(`❌ Missing webhook signature from IP: ${clientIP}`);
    return NextResponse.json(
      { error: 'Missing webhook signature' },
      { status: 401 }
    );
  }

  if (!verifySupabaseWebhook(body, signature, webhookSecret)) {
    console.error(`❌ Invalid webhook signature from IP: ${clientIP}`);
    return NextResponse.json(
      { error: 'Invalid webhook signature' },
      { status: 401 }
    );
  }
  
  console.log(`✅ Webhook signature verified successfully from IP: ${clientIP}`);

  try {
    const payload: SupabaseAuthHookPayload = JSON.parse(body);
    
    console.log(`🎯 Supabase auth hook received: ${payload.email_type} for ${payload.user.email}`);
    
    // Only handle email types we support
    const supportedTypes = ['magic_link', 'confirm_signup'];
    if (!supportedTypes.includes(payload.email_type)) {
      console.log(`⚠️ Unsupported email type: ${payload.email_type}. Supported types: ${supportedTypes.join(', ')}`);
      return NextResponse.json({ message: 'Email type not handled by custom hook' });
    }

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
    
    switch (payload.email_type) {
      case 'magic_link':
        result = await emailService.sendMagicLinkEmail(userEmail, confirmationUrl, languageContext);
        break;
        
      case 'confirm_signup':
        result = await emailService.sendConfirmSignupEmail(userEmail, confirmationUrl, languageContext);
        break;
        
      default:
        return NextResponse.json(
          { error: `Unsupported email type: ${payload.email_type}` },
          { status: 400 }
        );
    }

    const processingTime = Date.now() - startTime;

    if (result.success) {
      console.log(`✅ ${payload.email_type} email sent successfully to ${userEmail} (ID: ${result.messageId}) in ${processingTime}ms`);
      return NextResponse.json({
        message: `${payload.email_type} email sent successfully`,
        messageId: result.messageId,
        processingTimeMs: processingTime
      });
    } else {
      console.error(`❌ Failed to send ${payload.email_type} email to ${userEmail} after ${processingTime}ms:`, result.error);
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
  
  switch (payload.email_type) {
    case 'magic_link':
      url.searchParams.set('token_hash', email_data.token_hash);
      url.searchParams.set('type', 'magiclink');
      break;
      
    case 'confirm_signup':
      url.searchParams.set('token_hash', email_data.token_hash);
      url.searchParams.set('type', 'signup');
      break;
      
    default:
      url.searchParams.set('token_hash', email_data.token_hash);
      url.searchParams.set('type', payload.email_type);
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
    supportedEmailTypes: ['magic_link', 'confirm_signup'],
    webhookSecretConfigured,
    timestamp: new Date().toISOString()
  });
}