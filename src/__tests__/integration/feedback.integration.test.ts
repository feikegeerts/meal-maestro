import { NextRequest } from "next/server";
import { http, HttpResponse } from "msw";

import { POST as feedbackPost, GET as feedbackGet } from "@/app/api/feedback/route";
import { server } from "@/__mocks__/server";

const cookieJar = new Map<string, string>();

const createCookieStore = () => ({
  get(name: string) {
    const value = cookieJar.get(name);
    return value ? { name, value } : undefined;
  },
  getAll() {
    return Array.from(cookieJar.entries()).map(([name, value]) => ({
      name,
      value,
    }));
  },
  set(name: string, value: string) {
    cookieJar.set(name, value);
  },
  delete(name: string) {
    cookieJar.delete(name);
  },
  has(name: string) {
    return cookieJar.has(name);
  },
});

jest.mock("next/headers", () => ({
  cookies: jest.fn(() => Promise.resolve(createCookieStore())),
  headers: jest.fn(() => new Headers()),
}));

const setCookie = (name: string, value: string) => {
  cookieJar.set(name, value);
};

const clearCookies = () => {
  cookieJar.clear();
};

const authenticate = () => {
  setCookie("sb-access-token", "mock-access-token");
  setCookie("sb-refresh-token", "mock-refresh-token");
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://test.supabase.co";

describe("POST /api/feedback (integration)", () => {
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    clearCookies();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    server.resetHandlers();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  const buildRequest = (body: Record<string, unknown>) =>
    new NextRequest("http://localhost/api/feedback", {
      method: "POST",
      headers: new Headers({
        "Content-Type": "application/json",
        "Accept-Language": "en-US,en;q=0.9",
        Referer: "http://localhost/test",
      }),
      body: JSON.stringify(body),
    });

  it("returns 401 for unauthenticated requests", async () => {
    const request = buildRequest({
      feedbackType: "bug_report",
      subject: "Broken button",
      message: "Submit button does not work.",
    });

    const response = await feedbackPost(request);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: "Authentication required",
      code: "UNAUTHORIZED",
    });
  });

  it("allows authenticated users to submit feedback", async () => {
    authenticate();

    const request = buildRequest({
      feedbackType: "bug_report",
      subject: "Broken button",
      message: "Submit button does not work.",
    });

    const response = await feedbackPost(request);

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ success: true });
  });

  it("rejects payloads missing required fields", async () => {
    authenticate();

    const request = buildRequest({
      feedbackType: "bug_report",
      subject: "",
      message: "",
    });

    const response = await feedbackPost(request);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      success: false,
      error: "Feedback type, subject, and message are required",
    });
  });

  it("validates the feedback type", async () => {
    authenticate();

    const request = buildRequest({
      feedbackType: "unknown_type",
      subject: "Feature request",
      message: "Please add a timer.",
    });

    const response = await feedbackPost(request);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      success: false,
      error: "Invalid feedback type",
    });
  });

  it("enforces subject length constraints", async () => {
    authenticate();

    const request = buildRequest({
      feedbackType: "bug_report",
      subject: " ",
      message: "Submit button does not work.",
    });

    const response = await feedbackPost(request);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      success: false,
      error: "Subject must be between 1 and 200 characters",
    });
  });

  it("enforces message length constraints", async () => {
    authenticate();

    const request = buildRequest({
      feedbackType: "bug_report",
      subject: "Broken button",
      message: "a".repeat(2001),
    });

    const response = await feedbackPost(request);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      success: false,
      error: "Message must be between 1 and 2000 characters",
    });
  });

  it("returns 429 when the rate limit is exceeded", async () => {
    authenticate();

    server.use(
      http.get(`${SUPABASE_URL}/rest/v1/rate_limit_user`, () => {
        const now = Date.now();
        return HttpResponse.json(
          Array.from({ length: 6 }, (_, index) => ({
            id: index,
            user_id: "test-user-id",
            endpoint: "/api/feedback",
            timestamp: now - index * 1000,
            created_at: new Date(now - index * 1000).toISOString(),
          }))
        );
      })
    );

    const request = buildRequest({
      feedbackType: "bug_report",
      subject: "Broken button",
      message: "Submit button does not work.",
    });

    const response = await feedbackPost(request);

    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({
      success: false,
      error: expect.stringContaining("Too many feedback submissions"),
    });
  });

  it("handles Supabase insertion failures gracefully", async () => {
    authenticate();

    server.use(
      http.post(`${SUPABASE_URL}/rest/v1/feedback`, () =>
        new HttpResponse(
          JSON.stringify({
            code: "500",
            message: "Database unavailable",
          }),
          {
            status: 500,
            headers: {
              "Content-Type": "application/json",
            },
          }
        )
      )
    );

    const request = buildRequest({
      feedbackType: "bug_report",
      subject: "Broken button",
      message: "Submit button does not work.",
    });

    const response = await feedbackPost(request);

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      success: false,
      error: "Failed to submit feedback",
    });
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Error creating feedback:",
      expect.objectContaining({ message: "Database unavailable" })
    );
  });

  it("returns 500 when the request body is invalid JSON", async () => {
    authenticate();

    const request = new NextRequest("http://localhost/api/feedback", {
      method: "POST",
      headers: new Headers({ "Content-Type": "application/json" }),
      body: "{invalid-json",
    });

    const response = await feedbackPost(request);

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      success: false,
      error: "Internal server error while submitting feedback",
    });
  });

  it("fails open when the rate limit lookup returns an error", async () => {
    authenticate();

    server.use(
      http.get(`${SUPABASE_URL}/rest/v1/rate_limit_user`, () =>
        new HttpResponse("error", { status: 500 })
      )
    );

    const request = buildRequest({
      feedbackType: "bug_report",
      subject: "Broken button",
      message: "Submit button does not work.",
    });

    const response = await feedbackPost(request);

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ success: true });
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "Feedback rate limit check failed, allowing request:",
      expect.objectContaining({ message: "error" })
    );
  });

  it("fails open when the rate limit lookup throws", async () => {
    authenticate();

    server.use(
      http.delete(`${SUPABASE_URL}/rest/v1/rate_limit_user`, () => {
        throw new Error("network unavailable");
      })
    );

    const request = buildRequest({
      feedbackType: "bug_report",
      subject: "Broken button",
      message: "Submit button does not work.",
    });

    const response = await feedbackPost(request);

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ success: true });
  });
});

describe("GET /api/feedback (integration)", () => {
  it("returns method not allowed", async () => {
    const response = await feedbackGet();

    expect(response.status).toBe(405);
    expect(await response.json()).toEqual({
      error: "Method not allowed. Use POST to submit feedback.",
    });
  });
});
