import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "../auth-context";

const authClientMocks = vi.hoisted(() => ({
  refetchSession: vi.fn().mockResolvedValue(undefined),
  signInEmail: vi.fn().mockResolvedValue({ error: null }),
  signUpEmail: vi.fn().mockResolvedValue({ error: null }),
  signInSocial: vi.fn(),
  signOut: vi.fn(),
  requestPasswordReset: vi.fn(),
  changePassword: vi.fn(),
}));

const authState = vi.hoisted(() => ({
  data: null as {
    user: {
      id: string;
      email: string;
      name: string | null;
      image: string | null;
    };
    session: {
      id: string;
      expiresAt: Date;
    };
  } | null,
}));

vi.mock("@/lib/auth/client", () => ({
  authClient: {
    useSession: () => ({
      data: authState.data,
      isPending: false,
      isRefetching: false,
      refetch: authClientMocks.refetchSession,
    }),
    signIn: {
      email: authClientMocks.signInEmail,
      social: authClientMocks.signInSocial,
    },
    signUp: {
      email: authClientMocks.signUpEmail,
    },
    signOut: authClientMocks.signOut,
    requestPasswordReset: authClientMocks.requestPasswordReset,
    changePassword: authClientMocks.changePassword,
  },
}));

function SignInProbe() {
  const { signInWithEmail } = useAuth();

  return (
    <button
      type="button"
      onClick={() => void signInWithEmail("user@example.com", "password123")}
    >
      sign in
    </button>
  );
}

function renderProbe() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <SignInProbe />
        </AuthProvider>
      </QueryClientProvider>,
    ),
    queryClient,
  };
}

describe("AuthProvider session handoff", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.data = null;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: vi.fn().mockResolvedValue({}),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("refreshes the session after a successful email sign-in", async () => {
    const view = renderProbe();

    fireEvent.click(view.getByRole("button", { name: "sign in" }));

    await waitFor(() => {
      expect(authClientMocks.signInEmail).toHaveBeenCalledWith({
        email: "user@example.com",
        password: "password123",
        rememberMe: true,
      });
      expect(authClientMocks.refetchSession).toHaveBeenCalledWith({
        query: { disableCookieCache: true },
      });
    });
  });

  it("refreshes an authenticated session when the app resumes", async () => {
    authState.data = {
      user: {
        id: "user-1",
        email: "user@example.com",
        name: "Test User",
        image: null,
      },
      session: {
        id: "session-1",
        expiresAt: new Date("2026-08-13T20:17:03.000Z"),
      },
    };

    renderProbe();
    fireEvent(window, new Event("pageshow"));

    await waitFor(() => {
      expect(authClientMocks.refetchSession).toHaveBeenCalledWith({
        query: { disableCookieCache: true },
      });
    });
  });

  it("throttles duplicate resume refreshes", async () => {
    authState.data = {
      user: {
        id: "user-1",
        email: "user@example.com",
        name: "Test User",
        image: null,
      },
      session: {
        id: "session-1",
        expiresAt: new Date("2026-08-13T20:17:03.000Z"),
      },
    };

    renderProbe();
    fireEvent(window, new Event("pageshow"));
    fireEvent(window, new Event("focus"));

    await waitFor(() => {
      expect(authClientMocks.refetchSession).toHaveBeenCalledTimes(1);
    });
  });

  it("clears authenticated query data when the session changes user", async () => {
    authState.data = {
      user: {
        id: "user-1",
        email: "user@example.com",
        name: "Test User",
        image: null,
      },
      session: {
        id: "session-1",
        expiresAt: new Date("2026-08-13T20:17:03.000Z"),
      },
    };

    const view = renderProbe();
    view.queryClient.setQueryData(["recipes"], { recipes: ["private"] });
    view.queryClient.setQueryData(["custom-units", "user-1"], ["private"]);

    authState.data = null;
    view.rerender(
      <QueryClientProvider client={view.queryClient}>
        <AuthProvider>
          <SignInProbe />
        </AuthProvider>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(view.queryClient.getQueryData(["recipes"])).toBeUndefined();
      expect(
        view.queryClient.getQueryData(["custom-units", "user-1"]),
      ).toBeUndefined();
    });
  });
});
