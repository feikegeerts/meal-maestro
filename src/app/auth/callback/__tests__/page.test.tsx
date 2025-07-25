import { render, screen, waitFor } from "@testing-library/react";
import { useRouter } from "next/navigation";
import AuthCallback from "../page";

// Mock Next.js router
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

// Mock Supabase client
jest.mock("../../../../lib/supabase", () => ({
  supabase: {
    auth: {
      onAuthStateChange: jest.fn((callback) => {
        // Simulate successful auth by default
        setTimeout(() => {
          callback("SIGNED_IN", {
            access_token: "test-access-token",
            refresh_token: "test-refresh-token",
            expires_in: 3600,
            expires_at: Date.now() / 1000 + 3600,
            token_type: "bearer",
            user: { 
              id: "test-user",
              email: "test@example.com",
              app_metadata: {},
              user_metadata: {},
              aud: "authenticated",
              created_at: new Date().toISOString()
            }
          });
        }, 100);

        return {
          data: {
            subscription: {
              unsubscribe: jest.fn(),
              id: "test-subscription",
              callback: jest.fn(),
            },
          },
        };
      }),
      getSession: jest.fn(() =>
        Promise.resolve({
          data: { 
            session: {
              access_token: "test-access-token",
              refresh_token: "test-refresh-token",
              expires_in: 3600,
              expires_at: Date.now() / 1000 + 3600,
              token_type: "bearer",
              user: { 
                id: "test-user",
                email: "test@example.com",
                app_metadata: {},
                user_metadata: {},
                aud: "authenticated",
                created_at: new Date().toISOString()
              }
            } 
          },
          error: null,
        })
      ),
    },
  },
}));

const mockPush = jest.fn();
const mockRouter = {
  push: mockPush,
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn(),
};

describe("AuthCallback", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
  });

  it("should render loading state", () => {
    render(<AuthCallback />);

    expect(
      screen.getByText("Sign in successful, redirecting...")
    ).toBeInTheDocument();
  });

  it("should redirect to home on successful authentication", async () => {
    render(<AuthCallback />);

    await waitFor(
      () => {
        expect(mockPush).toHaveBeenCalledWith("/");
      },
      { timeout: 2000 }
    );
  });

  it("should redirect with error on sign out event", async () => {
    // Mock auth state change to return SIGNED_OUT
    const mockOnAuthStateChange = jest.fn((callback) => {
      setTimeout(() => {
        callback("SIGNED_OUT", null);
      }, 100);

      return {
        data: {
          subscription: {
            unsubscribe: jest.fn(),
            id: "test-subscription",
            callback: jest.fn(),
          },
        },
      };
    });

    const { supabase } = await import("@/lib/supabase");
    supabase.auth.onAuthStateChange = mockOnAuthStateChange;

    render(<AuthCallback />);

    await waitFor(
      () => {
        expect(mockPush).toHaveBeenCalledWith("/?error=auth_error");
      },
      { timeout: 2000 }
    );
  });

  it("should redirect with error on initial session without user", async () => {
    // Mock auth state change to return INITIAL_SESSION with no user
    const mockOnAuthStateChange = jest.fn((callback) => {
      setTimeout(() => {
        callback("INITIAL_SESSION", null);
      }, 100);

      return {
        data: {
          subscription: {
            unsubscribe: jest.fn(),
            id: "test-subscription",
            callback: jest.fn(),
          },
        },
      };
    });

    const { supabase } = await import("@/lib/supabase");
    supabase.auth.onAuthStateChange = mockOnAuthStateChange;

    render(<AuthCallback />);

    await waitFor(
      () => {
        expect(mockPush).toHaveBeenCalledWith("/?error=auth_error");
      },
      { timeout: 2000 }
    );
  });

  it("should handle timeout fallback", async () => {
    // Mock setTimeout to fire immediately
    jest.useFakeTimers();
    
    // Mock auth state change to never fire
    const mockOnAuthStateChange = jest.fn(() => {
      // Don't call the callback to simulate timeout
      return {
        data: {
          subscription: {
            unsubscribe: jest.fn(),
            id: "test-subscription",
            callback: jest.fn(),
          },
        },
      };
    });

    const { supabase } = await import("@/lib/supabase");
    supabase.auth.onAuthStateChange = mockOnAuthStateChange;
    supabase.auth.getSession = jest.fn(() =>
      Promise.resolve({
        data: { 
          session: {
            access_token: "test-access-token",
            refresh_token: "test-refresh-token",
            expires_in: 3600,
            expires_at: Date.now() / 1000 + 3600,
            token_type: "bearer",
            user: { 
              id: "test-user",
              email: "test@example.com",
              app_metadata: {},
              user_metadata: {},
              aud: "authenticated",
              created_at: new Date().toISOString()
            }
          } 
        },
        error: null,
      })
    );

    render(<AuthCallback />);

    // Fast-forward time to trigger timeout
    jest.advanceTimersByTime(10000);

    await waitFor(
      () => {
        expect(mockPush).toHaveBeenCalledWith("/");
      },
      { timeout: 1000 }
    );

    jest.useRealTimers();
  });

  it("should handle timeout without session", async () => {
    // Mock setTimeout to fire immediately
    jest.useFakeTimers();
    
    // Mock auth state change to never fire and no session
    const mockOnAuthStateChange = jest.fn(() => {
      return {
        data: {
          subscription: {
            unsubscribe: jest.fn(),
            id: "test-subscription",
            callback: jest.fn(),
          },
        },
      };
    });

    const { supabase } = await import("@/lib/supabase");
    supabase.auth.onAuthStateChange = mockOnAuthStateChange;
    supabase.auth.getSession = jest.fn(() =>
      Promise.resolve({
        data: { session: null },
        error: null,
      })
    );

    render(<AuthCallback />);

    // Fast-forward time to trigger timeout
    jest.advanceTimersByTime(10000);

    await waitFor(
      () => {
        expect(mockPush).toHaveBeenCalledWith("/?error=timeout");
      },
      { timeout: 1000 }
    );

    jest.useRealTimers();
  });

  it("should prevent duplicate redirects", async () => {
    // Mock auth state change to fire multiple times
    const mockOnAuthStateChange = jest.fn((callback) => {
      setTimeout(() => {
        const mockSession = {
          access_token: "test-access-token",
          refresh_token: "test-refresh-token",
          expires_in: 3600,
          expires_at: Date.now() / 1000 + 3600,
          token_type: "bearer",
          user: { 
            id: "test-user",
            email: "test@example.com",
            app_metadata: {},
            user_metadata: {},
            aud: "authenticated",
            created_at: new Date().toISOString()
          }
        };
        callback("SIGNED_IN", mockSession);
        // Try to call again
        callback("SIGNED_IN", mockSession);
      }, 100);

      return {
        data: {
          subscription: {
            unsubscribe: jest.fn(),
            id: "test-subscription",
            callback: jest.fn(),
          },
        },
      };
    });

    const { supabase } = await import("@/lib/supabase");
    supabase.auth.onAuthStateChange = mockOnAuthStateChange;

    render(<AuthCallback />);

    await waitFor(
      () => {
        expect(mockPush).toHaveBeenCalledTimes(1);
        expect(mockPush).toHaveBeenCalledWith("/");
      },
      { timeout: 2000 }
    );
  });

  it("should cleanup subscription on unmount", async () => {
    const mockUnsubscribe = jest.fn();
    const mockOnAuthStateChange = jest.fn(() => ({
      data: {
        subscription: {
          unsubscribe: mockUnsubscribe,
          id: "test-subscription",
          callback: jest.fn(),
        },
      },
    }));

    const { supabase } = await import("@/lib/supabase");
    supabase.auth.onAuthStateChange = mockOnAuthStateChange;

    const { unmount } = render(<AuthCallback />);

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
  });
});
