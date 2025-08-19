import { http, HttpResponse } from "msw";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://test.supabase.co";

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
  // Auth API endpoints
  http.post("/api/auth/set-session", async ({ request }) => {
    await request.json();
    return HttpResponse.json({ success: true });
  }),

  http.post("/api/auth/sign-out", () => {
    return HttpResponse.json({ success: true });
  }),

  // Auth endpoints
  http.get(`${SUPABASE_URL}/auth/v1/token`, () => {
    return HttpResponse.json({
      access_token: mockSession.access_token,
      refresh_token: mockSession.refresh_token,
      expires_in: mockSession.expires_in,
      token_type: mockSession.token_type,
      user: mockUser,
    });
  }),

  http.post(`${SUPABASE_URL}/auth/v1/token`, () => {
    return HttpResponse.json({
      access_token: mockSession.access_token,
      refresh_token: mockSession.refresh_token,
      expires_in: mockSession.expires_in,
      token_type: mockSession.token_type,
      user: mockUser,
    });
  }),

  http.get(`${SUPABASE_URL}/auth/v1/user`, () => {
    return HttpResponse.json(mockUser);
  }),

  http.post(`${SUPABASE_URL}/auth/v1/logout`, () => {
    return HttpResponse.json({});
  }),

  // OAuth endpoints
  http.post(`${SUPABASE_URL}/auth/v1/authorize`, () => {
    return HttpResponse.json({
      url: "https://accounts.google.com/oauth/authorize?mock=true",
    });
  }),

  // Magic link OTP endpoints
  http.post(`${SUPABASE_URL}/auth/v1/otp`, async ({ request }) => {
    const body = (await request.json()) as {
      email?: string;
      type?: string;
      options?: { emailRedirectTo?: string };
    };

    // Simulate rate limiting for specific test email
    if (body.email === "rate-limited@example.com") {
      return new HttpResponse(
        JSON.stringify({
          error: "rate_limit_exceeded",
          error_description:
            "For security purposes, you can only request this once every 60 seconds",
        }),
        { status: 429 }
      );
    }

    // Simulate invalid email error
    if (body.email === "invalid@domain") {
      return new HttpResponse(
        JSON.stringify({
          error: "invalid_request",
          error_description: "Invalid email address",
        }),
        { status: 400 }
      );
    }

    // Successful OTP request
    return HttpResponse.json({
      data: { user: null, session: null },
      error: null,
    });
  }),

  // User profiles endpoints
  http.get(`${SUPABASE_URL}/rest/v1/user_profiles`, ({ request }) => {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (id === "eq.test-user-id") {
      return HttpResponse.json([mockProfile]);
    }

    return HttpResponse.json([]);
  }),

  http.patch(`${SUPABASE_URL}/rest/v1/user_profiles`, async ({ request }) => {
    const updates = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json([{ ...mockProfile, ...updates }]);
  }),

  // Error handlers for testing failure scenarios
  http.get(`${SUPABASE_URL}/auth/v1/user`, ({ request }) => {
    const url = new URL(request.url);
    if (url.searchParams.get("error") === "unauthorized") {
      return new HttpResponse(null, { status: 401 });
    }
    return HttpResponse.json(mockUser);
  }),

  http.get(`${SUPABASE_URL}/rest/v1/user_profiles`, ({ request }) => {
    const url = new URL(request.url);
    if (url.searchParams.get("error") === "server_error") {
      return new HttpResponse(null, { status: 500 });
    }

    const id = url.searchParams.get("id");
    if (id === "eq.test-user-id") {
      return HttpResponse.json([mockProfile]);
    }

    return HttpResponse.json([]);
  }),

  // Security test handlers for recipe scraping

  // Rate limiting table operations
  http.get(`${SUPABASE_URL}/rest/v1/rate_limit_user`, ({ request }) => {
    const url = new URL(request.url);
    const userId = url.searchParams.get("user_id");
    const endpoint = url.searchParams.get("endpoint");

    // Return mock rate limit data
    if (
      userId?.includes("eq.test-user-id") &&
      endpoint?.includes("eq./api/scrape-recipe")
    ) {
      const now = Date.now();

      // Simulate different scenarios
      if (userId.includes("rate-limited")) {
        // Return 10+ entries to trigger rate limit
        return HttpResponse.json(
          Array(12)
            .fill(null)
            .map((_, i) => ({
              id: i,
              user_id: "test-user-id",
              endpoint: "/api/scrape-recipe",
              timestamp: now - i * 1000,
              created_at: new Date(now - i * 1000).toISOString(),
            }))
        );
      }

      // Return few entries for normal case
      return HttpResponse.json([
        {
          id: 1,
          user_id: "test-user-id",
          endpoint: "/api/scrape-recipe",
          timestamp: now - 30000,
          created_at: new Date(now - 30000).toISOString(),
        },
      ]);
    }

    return HttpResponse.json([]);
  }),

  http.post(`${SUPABASE_URL}/rest/v1/rate_limit_user`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json([
      {
        id: Date.now(),
        ...body,
        created_at: new Date().toISOString(),
      },
    ]);
  }),

  http.delete(`${SUPABASE_URL}/rest/v1/rate_limit_user`, () => {
    return HttpResponse.json([]);
  }),

  // Mock external recipe websites for SSRF testing

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
    return HttpResponse.html(`
      <html>
        <body>
          <script type="application/ld+json">
          {
            "@type": "Recipe",
            "name": "Large Recipe",
            "recipeIngredient": ${JSON.stringify(largeArray)}
          }
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
