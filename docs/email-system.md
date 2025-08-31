# Email System Documentation

## Overview

The Meal Maestro email system provides localized, custom email templates for Supabase authentication flows using Handlebars templating and the Resend email service.

## Architecture

### Components

1. **EmailService** (`/src/lib/email/EmailService.ts`)
   - Main orchestration service
   - Combines template rendering and email delivery
   - Provides high-level methods: `sendMagicLinkEmail()`, `sendConfirmSignupEmail()`, `sendTestEmail()`

2. **EmailTemplateService** (`/src/lib/email/services/EmailTemplateService.ts`)  
   - Handlebars template rendering
   - Integrates with LocalizationService for dynamic language detection
   - Template caching for performance

3. **LocalizationService** (`/src/lib/email/services/LocalizationService.ts`)
   - 4-tier language detection fallback system:
     1. Database `user_profiles.language_preference`
     2. User metadata (from Supabase user object)
     3. Accept-Language header parsing
     4. Fallback to English
   - Uses secure database functions to bypass RLS without service role keys

4. **EmailDeliveryService** (`/src/lib/email/services/EmailDeliveryService.ts`)
   - Resend API integration
   - Rate limiting awareness
   - Comprehensive error handling

5. **ConfigurationService** (`/src/lib/email/services/ConfigurationService.ts`)
   - Email-specific configuration management
   - Environment variable validation
   - Centralized configuration for email services

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
   - **URL**: `https://your-domain.com/api/auth/hooks/send-email`
   - **HTTP Headers**: `webhook-secret: your-webhook-secret`

### Environment Variables

```bash
# Required for email system
RESEND_API_KEY=re_your_resend_key
SUPABASE_SERVICE_ROLE_KEY=sb_your_service_role_key
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
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (not anon key!)
- `SUPABASE_WEBHOOK_SECRET` - Secure random string for webhook auth

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
- Cause: Using anon key instead of service role key
- Solution: Ensure `SUPABASE_SERVICE_ROLE_KEY` is set and used by LocalizationService

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
- Service role key stored securely in environment variables
- Rate limiting prevents email abuse
- Input validation on all email addresses and URLs
- No sensitive data logged in production