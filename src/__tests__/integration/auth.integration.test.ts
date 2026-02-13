/**
 * Auth integration tests for Neon Auth (Better Auth)
 *
 * Tests requireAuth() which delegates to auth.getSession() from @/lib/auth/server.
 * The @/db mock prevents neon() from being called at import time.
 */

// Mock @/db to prevent neon() from being called at import time
jest.mock("@/db", () => ({
  db: {
    select: jest.fn().mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([]),
        }),
      }),
    }),
  },
}));

// Mock auth.getSession() — the core of Neon Auth
// Factory-internal jest.fn() avoids hoisting issues with const references.
// We access it via the imported `auth` object after import.
jest.mock("@/lib/auth/server", () => ({
  auth: {
    getSession: jest.fn(),
  },
}));

import { requireAuth } from "@/lib/auth-server";
import { auth } from "@/lib/auth/server";

// auth.getSession is the jest.fn() created inside the factory
const mockGetSession = auth.getSession as jest.Mock;

describe("requireAuth (integration – Neon Auth)", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    mockGetSession.mockReset();
  });

  it("returns 401 response when no session exists", async () => {
    mockGetSession.mockResolvedValue({ data: null });

    const response = await requireAuth();

    expect(response).toBeInstanceOf(Response);
    expect((response as Response).status).toBe(401);

    const body = await (response as Response).json();
    expect(body).toEqual({
      error: "Authentication required",
      code: "UNAUTHORIZED",
    });
  });

  it("returns 401 response when session has no user", async () => {
    mockGetSession.mockResolvedValue({ data: { user: null } });

    const response = await requireAuth();

    expect(response).toBeInstanceOf(Response);
    expect((response as Response).status).toBe(401);
  });

  it("returns AuthResult with user when session is valid", async () => {
    mockGetSession.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
          email: "test@example.com",
          name: "Test User",
          image: "https://example.com/avatar.png",
        },
      },
    });

    const result = await requireAuth();

    expect(result).not.toBeInstanceOf(Response);
    if (!(result instanceof Response)) {
      expect(result.user).toEqual({
        id: "user-1",
        email: "test@example.com",
        name: "Test User",
        image: "https://example.com/avatar.png",
      });
    }
  });

  it("returns AuthResult with optional fields undefined when not present", async () => {
    mockGetSession.mockResolvedValue({
      data: {
        user: {
          id: "user-2",
          email: "minimal@example.com",
          name: null,
          image: null,
        },
      },
    });

    const result = await requireAuth();

    expect(result).not.toBeInstanceOf(Response);
    if (!(result instanceof Response)) {
      expect(result.user).toEqual({
        id: "user-2",
        email: "minimal@example.com",
        name: undefined,
        image: undefined,
      });
    }
  });

  it("returns 401 when getSession throws an error", async () => {
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    mockGetSession.mockRejectedValue(new Error("Session fetch failed"));

    const response = await requireAuth();

    expect(response).toBeInstanceOf(Response);
    expect((response as Response).status).toBe(401);

    consoleSpy.mockRestore();
  });
});
