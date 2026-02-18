import { http, HttpResponse } from "msw";

export const mockUser = {
  id: "test-user-id",
  email: "test@example.com",
  user_metadata: {
    avatar_url: "https://example.com/avatar.jpg",
    full_name: "Test User",
  },
  created_at: "2024-01-01T00:00:00.000Z",
};

export const mockSession = {
  access_token: "mock-access-token",
  refresh_token: "mock-refresh-token",
  expires_in: 3600,
  token_type: "bearer",
  user: mockUser,
};

export const mockProfile = {
  id: "test-user-id",
  email: "test@example.com",
  display_name: "Test User",
  avatar_url: "https://example.com/avatar.jpg",
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-01T00:00:00.000Z",
};

export const handlers = [
  // Mock external recipe websites for scraping/SSRF testing

  // Valid recipe site (should work)
  http.get("https://allrecipes.com/recipe/test", () => {
    return HttpResponse.html(`
      <html>
        <head><title>Test Recipe</title></head>
        <body>
          <script type="application/ld+json">
          {
            "@type": "Recipe",
            "name": "Test Recipe",
            "recipeIngredient": ["1 cup flour", "2 eggs"],
            "recipeInstructions": ["Mix ingredients", "Bake for 30 minutes"],
            "recipeYield": "4"
          }
          </script>
        </body>
      </html>
    `);
  }),

  // Blocked site (403 error)
  http.get("https://ah.nl/recipe/test", () => {
    return new HttpResponse(null, { status: 403, statusText: "Forbidden" });
  }),

  // Large content (should be blocked)
  http.get("https://example.com/large-content", () => {
    const largeContent = "x".repeat(2 * 1024 * 1024); // 2MB
    return HttpResponse.html(`<html><body>${largeContent}</body></html>`);
  }),

  // Timeout simulation (should be blocked) - using shorter timeout for tests
  http.get("https://slow-site.com/recipe", () => {
    return new Promise((resolve) => {
      // Simulate a slow response - but much faster in tests
      setTimeout(() => {
        resolve(HttpResponse.html('<html><body>Too slow</body></html>'));
      }, 50); // 50ms - still slow enough to trigger timeout logic but fast for tests
    });
  }),

  // Malicious JSON-LD (should be sanitized)
  http.get("https://malicious-site.com/recipe", () => {
    return HttpResponse.html(`
      <html>
        <head><title>Malicious Recipe</title></head>
        <body>
          <script type="application/ld+json">
          {
            "@type": "Recipe",
            "name": "Test Recipe",
            "__proto__": {"polluted": true},
            "constructor": {"prototype": {"polluted": true}},
            "recipeIngredient": ["<script>alert('xss')</script>", "1 cup flour"],
            "recipeInstructions": ["javascript:alert('xss')", "Mix ingredients"]
          }
          </script>
        </body>
      </html>
    `);
  }),

  // Very large JSON (should be blocked)
  http.get("https://large-json-site.com/recipe", () => {
    const largeArray = Array(50000).fill("ingredient");
    const jsonLd = {
      "@type": "Recipe",
      "name": "Large Recipe",
      "recipeIngredient": largeArray
    };

    return HttpResponse.html(`
      <html>
        <body>
          <script type="application/ld+json">
          ${JSON.stringify(jsonLd)}
          </script>
        </body>
      </html>
    `);
  }),

  // Non-HTML content
  http.get("https://example.com/not-html", () => {
    return HttpResponse.json({ data: "not html" });
  }),

  // SSRF attempt handlers (should all be blocked by validation)
  http.get("http://localhost:8080/admin", () => {
    return HttpResponse.json({ secret: "admin panel" });
  }),

  http.get("http://127.0.0.1:8080/admin", () => {
    return HttpResponse.json({ secret: "localhost admin" });
  }),

  http.get("http://10.0.0.1/internal", () => {
    return HttpResponse.json({ secret: "internal network" });
  }),

  http.get("http://192.168.1.1/router", () => {
    return HttpResponse.json({ secret: "router config" });
  }),

  http.get("http://172.16.0.1/internal", () => {
    return HttpResponse.json({ secret: "private network" });
  }),

  http.get("http://169.254.169.254/latest/meta-data", () => {
    return HttpResponse.json({ secret: "cloud metadata" });
  }),

  http.get("http://metadata.google.internal/computeMetadata", () => {
    return HttpResponse.json({ secret: "gcp metadata" });
  }),

  // DNS rebinding test domains
  http.get("http://evil-rebind.com/admin", () => {
    return HttpResponse.json({ secret: "evil rebind" });
  }),

  http.get("http://private-rebind.com/internal", () => {
    return HttpResponse.json({ secret: "private rebind" });
  }),

  http.get("http://metadata-rebind.com/metadata", () => {
    return HttpResponse.json({ secret: "metadata rebind" });
  }),

  // Catch-all for unhandled domains that should be blocked
  http.get("http://localhost:8080/*", () => {
    return HttpResponse.json({ secret: "localhost blocked" });
  }),

  http.get("http://127.0.0.1:8080/*", () => {
    return HttpResponse.json({ secret: "localhost blocked" });
  }),
];

export { handlers as default };
