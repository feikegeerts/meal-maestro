import { EmailTemplateService } from '../services/email-template-service';
import type { MagicLinkEmailData, EmailType } from '../types/email-types';

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';

// Mock the supabase createClient function
const mockSupabaseClient = {
  rpc: jest.fn().mockResolvedValue({
    data: 'en',
    error: null
  }),
  from: jest.fn().mockReturnValue({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: { language_preference: 'en' },
          error: null
        })
      })
    })
  })
};

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient)
}));

describe('EmailTemplateService', () => {
  let emailService: EmailTemplateService;

  beforeEach(() => {
    emailService = new EmailTemplateService();
  });

  describe('Phase 2 - Localized Template Rendering', () => {
    it('should render magic-link template in English', async () => {
      const mockData: MagicLinkEmailData = {
        userEmail: 'test@example.com',
        locale: 'en',
        confirmationUrl: 'https://example.com/auth/callback?token_hash=abc123def456&type=magiclink'
      };

      const result = await emailService.renderTemplate('magic-link', mockData);

      // Verify the result is successful
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      const template = result.data!;

      // Log the HTML for manual verification
      console.log('=== ENGLISH MAGIC LINK EMAIL HTML ===');
      console.log(template.html);
      console.log('=== END HTML ===');

      expect(template.subject).toBe('Sign in to Meal Maestro');
      expect(template.html).toContain('🍽️ Meal Maestro');
      // Check for HTML-escaped URL (Handlebars properly escapes = to &#x3D; and & to &amp;)
      expect(template.html).toContain('https://example.com/auth/callback?token_hash&#x3D;abc123def456&amp;type&#x3D;magiclink');
      expect(template.html).toContain('Ready to cook something amazing?');
      expect(template.html).toContain('Sign in to Meal Maestro');
      expect(template.html).toContain('info@meal-maestro.com');
      expect(template.html).toContain(new Date().getFullYear().toString());
    });

    it('should render magic-link template in Dutch', async () => {
      // Mock Dutch language preference from database RPC call
      mockSupabaseClient.rpc.mockResolvedValue({
        data: 'nl',
        error: null
      });

      const mockData: MagicLinkEmailData = {
        userEmail: 'test@example.com',
        locale: 'en', // This should be overridden by database preference
        confirmationUrl: 'https://example.com/auth/callback?token_hash=xyz789&type=magiclink'
      };

      const result = await emailService.renderTemplate('magic-link', mockData);

      // Verify the result is successful
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      const template = result.data!;

      // Log the HTML for manual verification
      console.log('=== DUTCH MAGIC LINK EMAIL HTML ===');
      console.log(template.html);
      console.log('=== END HTML ===');

      expect(template.subject).toBe('Inloggen bij Meal Maestro');
      expect(template.html).toContain('🍽️ Meal Maestro');
      expect(template.html).toContain('Klaar om iets lekkers te koken?');
      expect(template.html).toContain('Inloggen bij Meal Maestro');
      expect(template.html).toContain('info@meal-maestro.com');
      expect(template.html).toContain(new Date().getFullYear().toString());
    });

    it('should handle template compilation errors gracefully', async () => {
      const result = await emailService.renderTemplate('non-existent-template' as EmailType, {
        userEmail: 'test@example.com',
        locale: 'en',
        confirmationUrl: 'https://example.com/test'
      } as MagicLinkEmailData);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('Failed to load template "non-existent-template"');
    });

    it('should cache compiled templates', async () => {
      const mockData: MagicLinkEmailData = {
        userEmail: 'test@example.com',
        locale: 'en',
        confirmationUrl: 'https://example.com/auth/callback?token_hash=def789&type=magiclink'
      };

      // First render should compile the template
      const result1 = await emailService.renderTemplate('magic-link', mockData);
      
      // Second render should use cached template
      const result2 = await emailService.renderTemplate('magic-link', mockData);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.data!.html).toBe(result2.data!.html);
    });

    it('should clear template cache', async () => {
      const mockData: MagicLinkEmailData = {
        userEmail: 'test@example.com',
        locale: 'en',
        confirmationUrl: 'https://example.com/auth/callback?token_hash=xyz456&type=magiclink'
      };

      // Render template to populate cache
      await emailService.renderTemplate('magic-link', mockData);
      
      // Clear cache
      emailService.clearCache();
      
      // Should still work after cache clear
      const result = await emailService.renderTemplate('magic-link', mockData);
      expect(result.success).toBe(true);
      expect(result.data!.html).toContain('🍽️ Meal Maestro');
    });
  });
});