import { NextRequest, NextResponse } from 'next/server';
import { EmailService } from '../../../../lib/email/email-service';

// Only allow email testing in development and preview environments
const isTestingAllowed = process.env.NODE_ENV !== 'production' || process.env.VERCEL_ENV === 'preview';

export async function POST(request: NextRequest) {
  // Security check - only allow in non-production environments
  if (!isTestingAllowed) {
    return NextResponse.json(
      { error: 'Email testing is not allowed in production' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { 
      type, 
      to, 
      confirmationUrl, 
      languagePreference, 
      acceptLanguageHeader,
      userMetadata 
    } = body;

    // Validate required fields
    if (!type || !to) {
      return NextResponse.json(
        { error: 'Missing required fields: type and to are required' },
        { status: 400 }
      );
    }

    const emailService = new EmailService();

    let result;

    switch (type) {
      case 'test':
        result = await emailService.sendTestEmail(to);
        break;

      case 'magic-link':
        if (!confirmationUrl) {
          return NextResponse.json(
            { error: 'confirmationUrl is required for magic-link emails' },
            { status: 400 }
          );
        }
        
        result = await emailService.sendMagicLinkEmail(to, confirmationUrl, {
          databaseLanguagePreference: languagePreference,
          userMetadata,
          acceptLanguageHeader
        });
        break;

      case 'confirm-signup':
        if (!confirmationUrl) {
          return NextResponse.json(
            { error: 'confirmationUrl is required for confirm-signup emails' },
            { status: 400 }
          );
        }
        
        result = await emailService.sendConfirmSignupEmail(to, confirmationUrl, {
          databaseLanguagePreference: languagePreference,
          userMetadata,
          acceptLanguageHeader
        });
        break;

      default:
        return NextResponse.json(
          { error: `Unsupported email type: ${type}. Supported types: test, magic-link, confirm-signup` },
          { status: 400 }
        );
    }

    if (result.success) {
      return NextResponse.json({
        success: true,
        messageId: result.messageId,
        message: `${type} email sent successfully to ${to}`
      });
    } else {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error,
          message: `Failed to send ${type} email to ${to}`
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Email test endpoint error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Security check - only allow in non-production environments
  if (!isTestingAllowed) {
    return NextResponse.json(
      { error: 'Email testing is not allowed in production' },
      { status: 403 }
    );
  }

  try {
    const emailService = new EmailService();
    const validation = emailService.validateConfiguration();

    return NextResponse.json({
      message: 'Email service test endpoint',
      environment: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV,
      testingAllowed: isTestingAllowed,
      configuration: validation,
      usage: {
        endpoint: '/api/email/test',
        methods: ['GET', 'POST'],
        examples: {
          test: {
            method: 'POST',
            body: {
              type: 'test',
              to: 'your-email@example.com'
            }
          },
          magicLink: {
            method: 'POST',
            body: {
              type: 'magic-link',
              to: 'user@example.com',
              confirmationUrl: 'https://example.com/auth/callback?token=abc123',
              languagePreference: 'nl', // Optional: override language
              acceptLanguageHeader: 'en-US,en;q=0.9' // Optional: simulate browser header
            }
          },
          confirmSignup: {
            method: 'POST',
            body: {
              type: 'confirm-signup',
              to: 'user@example.com',
              confirmationUrl: 'https://example.com/auth/callback?token=abc123',
              languagePreference: 'en'
            }
          }
        }
      }
    });

  } catch (error) {
    console.error('Email service validation error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to validate email service configuration',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}