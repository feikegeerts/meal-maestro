# Email System Documentation

## Overview

The Meal Maestro email system provides localized, custom email templates for Supabase authentication flows using Handlebars templating and the Resend email service.

## Architecture

### Components

1. **EmailService** (`/src/lib/email/EmailService.ts`)
   - Main orchestration service
   - Combines template rendering and email delivery
   - Provides high-level methods: `sendMagicLinkEmail()`, `sendConfirmSignupEmail()`, `sendTestEmail()`

2. **EmailTemplateService** (`/src/lib/email/services/email-template-service.ts`)  
   - Handlebars template rendering
   - Integrates with LocalizationService for dynamic language detection
   - Template caching for performance

3. **LocalizationService** (`/src/lib/email/services/localization-service.ts`)
   - 5-tier language detection fallback system:
     1. Database `user_profiles.language_preference` (via secure database function)
     2. User metadata (from Supabase user object)
     3. Page locale (from the URL where user initiated the request)
     4. Accept-Language header parsing
     5. Fallback to English
   - Uses UserProfileService which calls secure database function `get_user_language_preference()`
   - No service role key required - uses anon key with SECURITY DEFINER function

4. **EmailDeliveryService** (`/src/lib/email/services/email-delivery-service.ts`)
   - Resend API integration
   - Rate limiting awareness
   - Comprehensive error handling

5. **ProfileSecureService** (`/src/lib/profile-secure-service.ts`)
   - Secure service dedicated to database function operations requiring anon client access
   - Provides `getLanguagePreference()` method that calls `get_user_language_preference()` function
   - Uses anon key ONLY with SECURITY DEFINER functions - NO direct table access
   - Used exclusively by email system and other server-side services for language preferences

## Database Function

The email system uses a secure database function `get_user_language_preference()` to safely retrieve user language preferences without requiring service role keys:

### Function Details
- **Function Name**: `get_user_language_preference(user_email TEXT)`
- **Returns**: `TEXT` (language preference or NULL)
- **Security**: `SECURITY DEFINER` with input validation
- **Permissions**: Granted to `anon` and `authenticated` roles
- **Location**: `/supabase/migrations/20250831000000_add_secure_language_preference_function.sql`

### Security Features
- Input validation for email format and length
- Basic email regex validation
- Secure function execution with `SECURITY DEFINER`
- Direct table access bypasses Row Level Security (RLS) safely

### Usage
The function is called via the UserProfileService using the anon key:
```typescript
const { data, error } = await this.supabase
  .rpc('get_user_language_preference', { user_email: userEmail });
```

## Supabase Auth Hook Integration

### Endpoint
- **URL**: `/api/auth/hooks/send-email`
- **Method**: POST
- **Authentication**: Webhook secret verification
- **Supported Email Types**: `magic_link`, `confirm_signup`

### Configuration in Supabase Dashboard

1. Go to Authentication > Settings > Redirects
2. Add Site URL: `https://your-domain.com`
3. Go to Authentication > Settings > Templates
4. Disable default templates for Magic Link and Confirm Signup
5. Go to Authentication > Hooks
6. Add Send Email Hook:
   - **Type**: HTTP Endpoint (not Postgres Function)
   - **URL**: `https://your-domain.com/api/auth/hooks/send-email`
   - **Secret**: Your webhook secret (Supabase will automatically add the required Standard Webhooks headers)

### Environment Variables

```bash
# Required for email system
RESEND_API_KEY=re_your_resend_key
SUPABASE_WEBHOOK_SECRET=your-webhook-secret

# Public variables (already configured)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

## Templates

### Template Files
- **Magic Link**: `/src/lib/email/templates/magic-link.hbs`
- **Confirm Signup**: `/src/lib/email/templates/confirm-signup.hbs`

### Localization Files
- **English**: `/src/lib/email/locales/en.json`
- **Dutch**: `/src/lib/email/locales/nl.json`

### Template Variables
- `{{title}}` - Localized email title
- `{{description}}` - Localized email description  
- `{{cta}}` - Localized call-to-action button text
- `{{confirmationUrl}}` - Dynamic confirmation URL with token
- `{{brandName}}` - "Meal Maestro"
- `{{brandEmoji}}` - "🍳"
- `{{supportEmail}}` - Support email address
- `{{currentYear}}` - Current year for copyright
- `{{footer.contact}}` - Localized footer contact text
- `{{footer.copyright}}` - Localized footer copyright text

## Testing

### Command Line Testing
```bash
# Test individual email sending
npx tsx scripts/test-email-sending.ts your-email@example.com

# Test auth hook integration (requires dev server)
npx tsx scripts/test-auth-hook.ts your-email@example.com magic_link
npx tsx scripts/test-auth-hook.ts your-email@example.com confirm_signup
```

### API Testing (Development/Preview Only)
```bash
# Health check
curl http://localhost:3000/api/email/test

# Test magic link
curl -X POST http://localhost:3000/api/email/test \
  -H "Content-Type: application/json" \
  -d '{
    "type": "magic-link",
    "to": "your-email@example.com", 
    "confirmationUrl": "https://example.com/auth/callback?token=test123",
    "languagePreference": "nl"
  }'
```

### Auth Hook Health Check
```bash
curl https://your-domain.com/api/auth/hooks/send-email
```

## Deployment

### Vercel Environment Variables
Set these in your Vercel dashboard under Settings > Environment Variables:

- `RESEND_API_KEY` - Your Resend API key  
- `SUPABASE_WEBHOOK_SECRET` - Secure random string for webhook auth
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key

### Production Checklist
- [ ] Environment variables configured in Vercel
- [ ] Supabase auth hook configured with production URL
- [ ] Email templates tested in production
- [ ] DNS/domain properly configured for email sending
- [ ] Rate limiting monitored (Resend free tier: 3k emails/month)

## Monitoring

### Logs to Monitor
- Email delivery success/failure rates
- Language detection accuracy
- Database query performance  
- Webhook authentication attempts
- Template rendering errors

### Key Metrics
- Email delivery rate (aim for >99%)
- Average email delivery time
- Language detection accuracy by source
- Template rendering time
- Database query response time

## Troubleshooting

### Common Issues

**Empty database results despite existing users**
- Cause: Database function `get_user_language_preference()` not properly configured or missing
- Solution: Ensure the database migration for the secure function has been applied and function has proper permissions

**Webhook authentication failures**
- Cause: Missing or incorrect `SUPABASE_WEBHOOK_SECRET`
- Solution: Verify secret matches between Vercel env vars and Supabase hook config

**Template rendering failures**  
- Cause: Missing locale files or template variables
- Solution: Check template files exist and all required variables are provided

**Email delivery failures**
- Cause: Invalid Resend API key or rate limiting
- Solution: Verify API key and monitor usage limits

### Debug Mode
Set `NODE_ENV=development` to enable detailed logging including:
- Database query debugging
- Template variable inspection  
- Email service configuration validation
- Webhook payload logging

## Security

- Webhook secret validation prevents unauthorized email sending
- Database function uses SECURITY DEFINER with input validation for secure access
- Rate limiting prevents email abuse
- Input validation on all email addresses and URLs
- No sensitive data logged in production
- Uses anon key with secure database functions instead of service role key