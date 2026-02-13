import { EmailTemplateService } from "../services/email-template-service";
import type { MagicLinkEmailData, EmailType } from "../types/email-types";

// Mock @/db to prevent neon() from being called at import time.
// The mock db.select() returns a chainable builder that resolves
// to a language preference row by default.
jest.mock("@/db", () => {
  const selectChain = {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue([{ languagePreference: "en" }]),
  };
  return {
    db: {
      select: jest.fn(() => selectChain),
      __selectChain: selectChain,
    },
  };
});

// Access the mock chain for per-test overrides
function getSelectChain() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { db } = require("@/db") as {
    db: {
      __selectChain: {
        from: jest.Mock;
        where: jest.Mock;
        limit: jest.Mock;
      };
    };
  };
  return db.__selectChain;
}

describe("EmailTemplateService", () => {
  let emailService: EmailTemplateService;

  beforeEach(() => {
    // Reset to default English
    const chain = getSelectChain();
    chain.limit.mockResolvedValue([{ languagePreference: "en" }]);
    emailService = new EmailTemplateService();
  });

  describe("Phase 2 - Localized Template Rendering", () => {
    it("should render magic-link template in English", async () => {
      const mockData: MagicLinkEmailData = {
        userEmail: "test@example.com",
        locale: "en",
        confirmationUrl:
          "https://example.com/auth/callback?token_hash=abc123def456&type=magiclink",
      };

      const result = await emailService.renderTemplate("magic-link", mockData);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      const template = result.data!;

      expect(template.subject).toBe("Sign in to Meal Maestro");
      expect(template.html).toContain("🍽️ Meal Maestro");
      expect(template.html).toContain(
        "https:&#x2F;&#x2F;example.com&#x2F;auth&#x2F;callback?token_hash&#x3D;abc123def456&amp;type&#x3D;magiclink"
      );
      expect(template.html).toContain("Ready to cook something amazing?");
      expect(template.html).toContain("Sign in to Meal Maestro");
      expect(template.html).toContain("info@meal-maestro.com");
      expect(template.html).toContain(new Date().getFullYear().toString());
    });

    it("should render magic-link template in Dutch", async () => {
      // Mock Dutch language preference from database
      const chain = getSelectChain();
      chain.limit.mockResolvedValue([{ languagePreference: "nl" }]);

      const mockData: MagicLinkEmailData = {
        userEmail: "test@example.com",
        locale: "en",
        confirmationUrl:
          "https://example.com/auth/callback?token_hash=xyz789&type=magiclink",
      };

      const result = await emailService.renderTemplate("magic-link", mockData);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      const template = result.data!;

      expect(template.subject).toBe("Inloggen bij Meal Maestro");
      expect(template.html).toContain("🍽️ Meal Maestro");
      expect(template.html).toContain("Klaar om iets lekkers te koken?");
      expect(template.html).toContain("Inloggen bij Meal Maestro");
      expect(template.html).toContain("info@meal-maestro.com");
      expect(template.html).toContain(new Date().getFullYear().toString());
    });

    it("should handle template compilation errors gracefully", async () => {
      const result = await emailService.renderTemplate(
        "non-existent-template" as EmailType,
        {
          userEmail: "test@example.com",
          locale: "en",
          confirmationUrl: "https://example.com/test",
        } as MagicLinkEmailData
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain("non-existent-template");
    });

    it("should cache compiled templates", async () => {
      const mockData: MagicLinkEmailData = {
        userEmail: "test@example.com",
        locale: "en",
        confirmationUrl:
          "https://example.com/auth/callback?token_hash=def789&type=magiclink",
      };

      const result1 = await emailService.renderTemplate("magic-link", mockData);
      const result2 = await emailService.renderTemplate("magic-link", mockData);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.data!.html).toBe(result2.data!.html);
    });

    it("should clear template cache", async () => {
      const mockData: MagicLinkEmailData = {
        userEmail: "test@example.com",
        locale: "en",
        confirmationUrl:
          "https://example.com/auth/callback?token_hash=xyz456&type=magiclink",
      };

      await emailService.renderTemplate("magic-link", mockData);
      emailService.clearCache();

      const result = await emailService.renderTemplate("magic-link", mockData);
      expect(result.success).toBe(true);
      expect(result.data!.html).toContain("🍽️ Meal Maestro");
    });
  });
});
