# Email System Documentation

## Overview

The Meal Maestro email system provides localized, custom email templates using Mustache templating and the Resend email service. It supports magic link and signup confirmation emails in English and Dutch.

**Current status**: The email infrastructure is fully built and tested, but **dormant in production**. Magic link emails are disabled pending Neon Auth webhook support for custom email templates. See [Future](#future) section.

## Architecture

### Components

1. **EmailService** (`src/lib/email/email-service.ts`)
   - Main orchestration service
   - Combines template rendering and email delivery
   - High-level methods: `sendMagicLinkEmail()`, `sendConfirmSignupEmail()`, `sendTestEmail()`

2. **EmailTemplateService** (`src/lib/email/services/email-template-service.ts`)
   - Mustache template rendering
   - Integrates with LocalizationService for dynamic language detection
   - Template caching for performance

3. **LocalizationService** (`src/lib/email/services/localization-service.ts`)
   - 5-tier language detection fallback system:
     1. Database `user_profiles.language_preference` (via Drizzle query)
     2. User metadata (from auth user object)
     3. Page locale (from the URL where user initiated the request)
     4. Accept-Language header parsing
     5. Fallback to English
   - Uses `ProfileSecureService` for database lookups

4. **EmailDeliveryService** (`src/lib/email/services/email-delivery-service.ts`)
   - Resend API integration
   - Rate limiting awareness
   - Error handling

5. **ProfileSecureService** (`src/lib/profile-secure-service.ts`)
   - Provides `getLanguagePreference()` via Drizzle ORM query
   - Queries `user_profiles.language_preference` by email
   - Input validation for email format

6. **ConfigurationService** (`src/lib/email/services/configuration-service.ts`)
   - Validates environment variables (Resend, OpenAI)
   - Singleton pattern for consistent configuration

## Templates

### Template Files
- **Magic Link**: `src/lib/email/templates/magic-link.mustache`
- **Confirm Signup**: `src/lib/email/templates/confirm-signup.mustache`

### Localization Files
- **English**: `src/lib/email/locales/en.json`
- **Dutch**: `src/lib/email/locales/nl.json`

### Template Variables
- `{{title}}` - Localized email title
- `{{description}}` - Localized email description
- `{{cta}}` - Localized call-to-action button text
- `{{confirmationUrl}}` - Dynamic confirmation URL with token
- `{{brandName}}` - "Meal Maestro"
- `{{brandEmoji}}` - cooking emoji
- `{{supportEmail}}` - Support email address
- `{{currentYear}}` - Current year for copyright
- `{{footer.contact}}` - Localized footer contact text
- `{{footer.copyright}}` - Localized footer copyright text

## Environment Variables

```bash
# Required for email delivery
RESEND_API_KEY=re_your_resend_key
RESEND_FROM_EMAIL=Meal Maestro <info@meal-maestro.com>
RESEND_REPLY_TO=info@meal-maestro.com

# Required for language preference lookup (used by ProfileSecureService)
DATABASE_URL=<Neon database connection string>
```

## Testing

### API Testing (Development/Preview Only)

The test endpoint at `/api/email/test` is available in non-production environments:

```bash
# Health check
curl http://localhost:3000/api/email/test

# Test magic link email
curl -X POST http://localhost:3000/api/email/test \
  -H "Content-Type: application/json" \
  -d '{
    "type": "magic-link",
    "to": "your-email@example.com",
    "confirmationUrl": "https://example.com/auth/callback?token=test123",
    "languagePreference": "nl"
  }'
```

### Script Testing

```bash
npx tsx scripts/test-email-sending.ts your-email@example.com
```

## Future

When Neon Auth adds webhook support for custom email templates:

1. Create a new webhook route (e.g., `/api/auth/email-hook/route.ts`) that receives Neon Auth email events
2. Uncomment the magic link form in `src/components/auth/magic-link-form.tsx` (currently disabled with TODO comment)
3. Configure Neon Auth to call the webhook endpoint
4. The email infrastructure will work immediately — all services, templates, and localization are ready

## Monitoring

### Key Metrics
- Email delivery rate
- Language detection accuracy by source
- Template rendering time

### Troubleshooting

**Template rendering failures**
- Cause: Missing locale files or template variables
- Solution: Check template files exist and all required variables are provided

**Email delivery failures**
- Cause: Invalid Resend API key or rate limiting
- Solution: Verify API key and monitor usage limits (Resend free tier: 3k emails/month)
