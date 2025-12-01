import { requireAuth } from "@/lib/auth-server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(),
}));

jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));

const mockCookies = cookies as jest.Mock;
const mockCreateClient = createClient as jest.Mock;

describe("requireAuth (integration)", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    mockCreateClient.mockReset();
  });

  it("returns 401 response when no auth cookies are set", async () => {
    mockCookies.mockResolvedValue({
      get: jest.fn().mockReturnValue(undefined),
      delete: jest.fn(),
    });

    const response = await requireAuth();

    expect(response).toBeInstanceOf(Response);
    expect((response as Response).status).toBe(401);
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it("creates session and returns user when tokens are valid", async () => {
    const cookieStore = {
      get: jest.fn((name: string) =>
        name === "sb-access-token"
          ? { value: "access-token" }
          : name === "sb-refresh-token"
            ? { value: "refresh-token" }
            : undefined
      ),
      delete: jest.fn(),
    };
    mockCookies.mockResolvedValue(cookieStore);

    const auth = {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: "user-1", email: "test@example.com" } },
        error: null,
      }),
      setSession: jest.fn().mockResolvedValue({ data: null, error: null }),
    };
    const supabase = {
      auth,
      from: jest.fn(),
    };
    mockCreateClient.mockReturnValue(supabase);

    const result = await requireAuth();

    expect(result).not.toBeInstanceOf(Response);
    if (!(result instanceof Response)) {
      expect(result.user).toEqual(
        expect.objectContaining({ id: "user-1", email: "test@example.com" })
      );
      expect(auth.setSession).toHaveBeenCalledWith({
        access_token: "access-token",
        refresh_token: "refresh-token",
      });
    }
    expect(mockCreateClient).toHaveBeenCalledTimes(2);
  });

  it("clears cookies and returns 401 when Supabase rejects the token", async () => {
    const cookieStore = {
      get: jest.fn((name: string) =>
        name === "sb-access-token" ? { value: "bad-token" } : undefined
      ),
      delete: jest.fn(),
    };
    mockCookies.mockResolvedValue(cookieStore);

    const auth = {
      getUser: jest.fn().mockResolvedValue({
        data: { user: null },
        error: { message: "invalid" },
      }),
      setSession: jest.fn(),
    };
    const supabase = { auth, from: jest.fn() };
    mockCreateClient.mockReturnValue(supabase);

    const response = await requireAuth();

    expect(response).toBeInstanceOf(Response);
    expect((response as Response).status).toBe(401);
    expect(cookieStore.delete).toHaveBeenCalledWith("sb-access-token");
    expect(cookieStore.delete).toHaveBeenCalledWith("sb-refresh-token");
  });
});
