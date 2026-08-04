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

vi.mock("@/lib/auth/client", () => ({
  authClient: {
    useSession: () => ({
      data: null,
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

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SignInProbe />
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe("AuthProvider session handoff", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("refreshes the session after a successful email sign-in", async () => {
    const view = renderProbe();

    fireEvent.click(view.getByRole("button", { name: "sign in" }));

    await waitFor(() => {
      expect(authClientMocks.signInEmail).toHaveBeenCalledWith({
        email: "user@example.com",
        password: "password123",
      });
      expect(authClientMocks.refetchSession).toHaveBeenCalledWith({
        query: { disableCookieCache: true },
      });
    });
  });
});
