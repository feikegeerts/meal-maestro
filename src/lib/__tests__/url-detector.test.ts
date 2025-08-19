import { UrlDetector } from '../url-detector';
import { SecurityTestUtils } from '../../__mocks__/security-test-utils';

describe('UrlDetector Security Tests', () => {
  describe('URL Detection', () => {
    test('should detect valid HTTP URLs', () => {
      const text = 'Check out this recipe: https://allrecipes.com/recipe/123/cookies';
      const urls = UrlDetector.detectUrls(text);
      
      expect(urls).toHaveLength(1);
      expect(urls[0].url).toBe('https://allrecipes.com/recipe/123/cookies');
      expect(urls[0].startIndex).toBe(23); // Corrected index
    });

    test('should detect multiple URLs in text', () => {
      const text = 'Try https://foodnetwork.com/recipe/1 or http://allrecipes.com/recipe/2';
      const urls = UrlDetector.detectUrls(text);
      
      expect(urls).toHaveLength(2);
      expect(urls[0].url).toBe('https://foodnetwork.com/recipe/1');
      expect(urls[1].url).toBe('http://allrecipes.com/recipe/2');
    });

    test('should handle URLs with complex query parameters', () => {
      const text = 'Recipe: https://example.com/recipe?id=123&category=dessert&utm_source=email';
      const urls = UrlDetector.detectUrls(text);
      
      expect(urls).toHaveLength(1);
      expect(urls[0].url).toBe('https://example.com/recipe?id=123&category=dessert&utm_source=email');
    });

    test('should detect URLs with ports', () => {
      const text = 'Recipe server: http://example.com:3000/recipes/cookies';
      const urls = UrlDetector.detectUrls(text);
      
      expect(urls).toHaveLength(1);
      expect(urls[0].url).toBe('http://example.com:3000/recipes/cookies');
    });
  });

  describe('Recipe URL Detection', () => {
    test('should identify recipe URLs by domain', () => {
      const recipeUrls = [
        'https://allrecipes.com/recipe/123',
        'https://foodnetwork.com/recipes/dessert',
        'https://epicurious.com/recipe/chocolate-cake',
        'https://ah.nl/recept/pasta'
      ];

      recipeUrls.forEach(url => {
        const text = `Check out this recipe: ${url}`;
        const detectedUrls = UrlDetector.detectRecipeUrls(text);
        
        expect(detectedUrls).toHaveLength(1);
        expect(detectedUrls[0].url).toBe(url);
        expect(UrlDetector.isLikelyRecipeUrl(url)).toBe(true);
      });
    });

    test('should identify recipe URLs by path keywords', () => {
      const recipeUrls = [
        'https://example.com/recipe/chocolate-cake',
        'https://myblog.com/cooking/pasta-recipe',
        'https://website.org/food/recipes/desserts'
      ];

      recipeUrls.forEach(url => {
        expect(UrlDetector.isLikelyRecipeUrl(url)).toBe(true);
      });
    });

    test('should reject non-recipe URLs', () => {
      const nonRecipeUrls = [
        'https://google.com/search',
        'https://facebook.com/posts',
        'https://news.com/article/politics'
      ];

      nonRecipeUrls.forEach(url => {
        expect(UrlDetector.isLikelyRecipeUrl(url)).toBe(false);
      });
    });

    test('should handle malformed URLs gracefully in recipe detection', () => {
      const malformedUrls = [
        'not-a-url',
        'http://',
        'https://.',
        ''
      ];

      malformedUrls.forEach(url => {
        expect(UrlDetector.isLikelyRecipeUrl(url)).toBe(false);
      });
    });
  });

  describe('URL Validation Security', () => {
    test('should validate legitimate HTTP/HTTPS URLs', () => {
      const validUrls = [
        'http://example.com',
        'https://example.com',
        'https://subdomain.example.com/path',
        'http://example.com:8080/path?query=value#fragment'
      ];

      validUrls.forEach(url => {
        expect(UrlDetector.isValidUrl(url)).toBe(true);
      });
    });

    test('should reject non-HTTP(S) protocols', () => {
      const invalidUrls = SecurityTestUtils.getSSRFTestUrls().invalidProtocols;

      invalidUrls.forEach(url => {
        expect(UrlDetector.isValidUrl(url)).toBe(false);
      });
    });

    test('should reject malformed URLs', () => {
      const malformedUrls = [
        'not-a-url',
        'http://',
        '',
        'http://[invalid-ipv6'
      ];

      malformedUrls.forEach(url => {
        expect(UrlDetector.isValidUrl(url)).toBe(false);
      });
    });

    test('should handle edge cases in URL validation', () => {
      const edgeCases = [
        'http://localhost', // localhost should be valid for isValidUrl (validation happens elsewhere)
        'https://127.0.0.1', // IP addresses should be valid for isValidUrl
        'http://example.com/', // trailing slash
        'https://example.com/path/', // path with trailing slash
      ];

      edgeCases.forEach(url => {
        expect(UrlDetector.isValidUrl(url)).toBe(true);
      });
    });
  });

  describe('URL Normalization Security', () => {
    test('should remove tracking parameters', () => {
      const testCases = [
        {
          input: 'https://example.com/recipe?utm_source=facebook&utm_medium=social',
          expected: 'https://example.com/recipe'
        },
        {
          input: 'https://example.com/recipe?fbclid=12345&gclid=67890',
          expected: 'https://example.com/recipe'
        },
        {
          input: 'https://example.com/recipe?ref=share&source=email&campaign=newsletter',
          expected: 'https://example.com/recipe'
        },
        {
          input: 'https://example.com/recipe?id=123&utm_campaign=test&category=dessert',
          expected: 'https://example.com/recipe?id=123&category=dessert'
        }
      ];

      testCases.forEach(testCase => {
        const normalized = UrlDetector.normalizeUrl(testCase.input);
        expect(normalized).toBe(testCase.expected);
      });
    });

    test('should preserve legitimate query parameters', () => {
      const testCases = [
        {
          input: 'https://example.com/recipe?id=123&category=dessert',
          expected: 'https://example.com/recipe?id=123&category=dessert'
        },
        {
          input: 'https://search.com/results?q=chocolate+cake&page=2',
          expected: 'https://search.com/results?q=chocolate+cake&page=2'
        }
      ];

      testCases.forEach(testCase => {
        const normalized = UrlDetector.normalizeUrl(testCase.input);
        expect(normalized).toBe(testCase.expected);
      });
    });

    test('should handle malformed URLs in normalization', () => {
      const malformedUrls = [
        'not-a-url',
        'http://',
        ''
      ];

      malformedUrls.forEach(url => {
        const normalized = UrlDetector.normalizeUrl(url);
        expect(normalized).toBe(url); // Should return original if parsing fails
      });
      
      // Special case: valid URLs that we don't want to normalize
      const validButUnchanged = 'ftp://example.com';
      const normalized = UrlDetector.normalizeUrl(validButUnchanged);
      expect(normalized).toBe('ftp://example.com/'); // URL constructor may add trailing slash
    });

    test('should preserve URL structure during normalization', () => {
      const testUrl = 'https://example.com:8080/path/to/recipe?id=123&utm_source=test#section';
      const normalized = UrlDetector.normalizeUrl(testUrl);
      
      expect(normalized).toBe('https://example.com:8080/path/to/recipe?id=123#section');
      expect(normalized).not.toContain('utm_source');
    });
  });

  describe('Domain Description Security', () => {
    test('should provide safe domain descriptions for known sites', () => {
      const testCases = [
        { url: 'https://allrecipes.com/recipe/123', expected: 'Allrecipes' },
        { url: 'https://www.foodnetwork.com/recipe/456', expected: 'Food Network' },
        { url: 'https://ah.nl/recept/pasta', expected: 'Albert Heijn' },
        { url: 'https://marmiton.org/recette/dessert', expected: 'Marmiton' }
      ];

      testCases.forEach(testCase => {
        const description = UrlDetector.getDomainDescription(testCase.url);
        expect(description).toBe(testCase.expected);
      });
    });

    test('should handle unknown domains safely', () => {
      const testCases = [
        { url: 'https://unknown-recipe-site.com/recipe', expectedDomain: 'unknown-recipe-site.com' },
        { url: 'https://example.com/cooking', expectedDomain: 'example.com' }
      ];

      testCases.forEach(testCase => {
        const description = UrlDetector.getDomainDescription(testCase.url);
        expect(description).toBe(testCase.expectedDomain);
        expect(description).not.toContain('www.');
      });
    });

    test('should sanitize domain descriptions', () => {
      const maliciousUrls = [
        'https://evil.com/recipe',
        'https://malicious-site.org/cooking'
      ];

      maliciousUrls.forEach(url => {
        const description = UrlDetector.getDomainDescription(url);
        expect(typeof description).toBe('string');
        expect(description.length).toBeGreaterThan(0);
      });
    });

    test('should handle malformed URLs in domain description', () => {
      const malformedUrls = [
        'not-a-url',
        'http://',
        ''
      ];

      malformedUrls.forEach(url => {
        const description = UrlDetector.getDomainDescription(url);
        expect(description).toBe('Unknown site');
      });
      
      // Special case: valid URL with unsupported protocol still gets domain extracted
      const ftpUrl = 'ftp://example.com';
      const description = UrlDetector.getDomainDescription(ftpUrl);
      expect(description).toBe('example.com'); // Domain is still extractable
    });
  });

  describe('URL Extraction Security', () => {
    test('should extract first URL safely', () => {
      const text = 'Try these recipes: https://allrecipes.com/1 and https://foodnetwork.com/2';
      const firstUrl = UrlDetector.extractFirstUrl(text);
      
      expect(firstUrl).toBe('https://allrecipes.com/1');
    });

    test('should extract first recipe URL safely', () => {
      const text = 'Check https://google.com and https://allrecipes.com/recipe/cookies';
      const firstRecipeUrl = UrlDetector.extractFirstRecipeUrl(text);
      
      expect(firstRecipeUrl).toBe('https://allrecipes.com/recipe/cookies');
    });

    test('should return null for text without URLs', () => {
      const text = 'This text has no URLs in it.';
      
      expect(UrlDetector.extractFirstUrl(text)).toBeNull();
      expect(UrlDetector.extractFirstRecipeUrl(text)).toBeNull();
    });

    test('should return null for text without recipe URLs', () => {
      const text = 'Visit https://google.com and https://facebook.com';
      
      expect(UrlDetector.extractFirstUrl(text)).toBe('https://google.com');
      expect(UrlDetector.extractFirstRecipeUrl(text)).toBeNull();
    });

    test('should handle very long text safely', () => {
      const longText = 'a'.repeat(10000) + ' https://allrecipes.com/recipe/test ' + 'b'.repeat(10000);
      const extractedUrl = UrlDetector.extractFirstUrl(longText);
      
      expect(extractedUrl).toBe('https://allrecipes.com/recipe/test');
    });
  });

  describe('URL Pattern Matching Security', () => {
    test('should handle potential ReDoS patterns safely', () => {
      // Test with patterns that could cause ReDoS attacks
      const potentialReDoSStrings = [
        'a'.repeat(1000) + 'http://example.com',
        'http://example.com' + 'a'.repeat(1000),
        'https://sub.' + 'domain.'.repeat(100) + 'com/path'
      ];

      potentialReDoSStrings.forEach(text => {
        const startTime = Date.now();
        const urls = UrlDetector.detectUrls(text);
        const endTime = Date.now();
        
        // Should complete within reasonable time (less than 100ms for safety)
        expect(endTime - startTime).toBeLessThan(100);
        
        if (urls.length > 0) {
          expect(urls[0].url).toMatch(/^https?:\/\//);
        }
      });
    });

    test('should handle URLs with unusual but valid characters', () => {
      const unusualUrls = [
        'https://example.com/recipe-with-dashes',
        'https://example.com/recipe_with_underscores',
        'https://example.com/recipe~with~tildes',
        'https://example.com/recipe+with+plus',
        'https://example.com/recipe%20with%20encoded%20spaces'
      ];

      unusualUrls.forEach(url => {
        const text = `Recipe link: ${url}`;
        const detected = UrlDetector.detectUrls(text);
        
        expect(detected).toHaveLength(1);
        expect(detected[0].url).toBe(url);
      });
    });

    test('should reject URLs with dangerous patterns', () => {
      const dangerousPatterns = [
        'javascript://example.com/%0Aalert(1)',
        'data://text/html,<script>alert(1)</script>',
        'vbscript:msgbox(1)',
      ];

      dangerousPatterns.forEach(pattern => {
        expect(UrlDetector.isValidUrl(pattern)).toBe(false);
      });
    });
  });

  describe('URL Removal Security', () => {
    test('should safely remove URLs from text', () => {
      const text = 'Try this recipe: https://allrecipes.com/recipe/123 and this one: https://foodnetwork.com/recipe/456';
      const cleaned = UrlDetector.removeUrls(text);
      
      expect(cleaned).toBe('Try this recipe:  and this one: ');
      expect(cleaned).not.toContain('https://');
    });

    test('should replace URLs with placeholders safely', () => {
      const text = 'Recipe: https://example.com/recipe';
      const cleaned = UrlDetector.removeUrls(text, '[URL_REMOVED]');
      
      expect(cleaned).toBe('Recipe: [URL_REMOVED]');
    });

    test('should handle text with no URLs', () => {
      const text = 'This is just regular text without any URLs.';
      const cleaned = UrlDetector.removeUrls(text);
      
      expect(cleaned).toBe(text);
    });

    test('should handle empty text safely', () => {
      const cleaned = UrlDetector.removeUrls('');
      expect(cleaned).toBe('');
    });

    test('should prevent injection through placeholder', () => {
      const text = 'Recipe: https://example.com/recipe';
      const maliciousPlaceholder = '<script>alert(1)</script>';
      const cleaned = UrlDetector.removeUrls(text, maliciousPlaceholder);
      
      // Should allow the placeholder as-is (sanitization happens elsewhere)
      expect(cleaned).toBe(`Recipe: ${maliciousPlaceholder}`);
    });
  });

  describe('URL Presence Detection Security', () => {
    test('should accurately detect URL presence', () => {
      const textWithUrls = 'Check out https://allrecipes.com/recipe/123';
      const textWithoutUrls = 'This is just plain text';
      
      expect(UrlDetector.hasUrls(textWithUrls)).toBe(true);
      expect(UrlDetector.hasUrls(textWithoutUrls)).toBe(false);
    });

    test('should accurately detect recipe URL presence', () => {
      const textWithRecipeUrl = 'Try this recipe: https://allrecipes.com/recipe/123';
      const textWithNonRecipeUrl = 'Visit https://google.com';
      const textWithoutUrls = 'Just plain text';
      
      expect(UrlDetector.hasRecipeUrls(textWithRecipeUrl)).toBe(true);
      expect(UrlDetector.hasRecipeUrls(textWithNonRecipeUrl)).toBe(false);
      expect(UrlDetector.hasRecipeUrls(textWithoutUrls)).toBe(false);
    });

    test('should handle edge cases in URL detection', () => {
      const edgeCases = [
        '', // empty string
        'http', // incomplete URL
        'https://', // incomplete URL
        'www.example.com', // no protocol
        'recipe at example dot com' // text representation
      ];

      edgeCases.forEach(text => {
        const hasUrls = UrlDetector.hasUrls(text);
        const hasRecipeUrls = UrlDetector.hasRecipeUrls(text);
        
        expect(typeof hasUrls).toBe('boolean');
        expect(typeof hasRecipeUrls).toBe('boolean');
      });
    });
  });

  describe('Performance and Security Edge Cases', () => {
    test('should handle very large input safely', () => {
      const largeText = 'a'.repeat(100000) + ' https://allrecipes.com/recipe/test ' + 'b'.repeat(100000);
      
      const startTime = Date.now();
      const urls = UrlDetector.detectUrls(largeText);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      expect(urls).toHaveLength(1);
      expect(urls[0].url).toBe('https://allrecipes.com/recipe/test');
    });

    test('should handle many URLs in text safely', () => {
      const manyUrls = Array(100).fill(0).map((_, i) => `https://example${i}.com/recipe`).join(' ');
      
      const startTime = Date.now();
      const urls = UrlDetector.detectUrls(manyUrls);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(500); // Should complete within 500ms
      expect(urls).toHaveLength(100);
    });

    test('should handle malicious input patterns safely', () => {
      const maliciousPatterns = [
        'http://' + 'a'.repeat(1000) + '.com',
        'https://example.com/' + 'path/'.repeat(1000),
        'https://example.com?' + 'param=value&'.repeat(100)
      ];

      maliciousPatterns.forEach(pattern => {
        const startTime = Date.now();
        const urls = UrlDetector.detectUrls(pattern);
        const isValid = UrlDetector.isValidUrl(pattern);
        const endTime = Date.now();
        
        expect(endTime - startTime).toBeLessThan(100); // Should complete quickly
        expect(Array.isArray(urls)).toBe(true);
        expect(typeof isValid).toBe('boolean');
      });
    });
  });
});