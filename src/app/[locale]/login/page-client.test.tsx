import type { ReactNode } from "react";
import { render, waitFor } from "@testing-library/react";
import LoginPage from "./page-client";

const authState = vi.hoisted(() => ({
  user: null as { id: string } | null,
  loading: true,
}));

const router = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
}));

const searchParams = vi.hoisted(() => new URLSearchParams());

const childMocks = vi.hoisted(() => ({
  googleLogin: vi.fn(),
}));

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => authState,
}));

vi.mock("@/app/i18n/routing", () => ({
  routing: {
    locales: ["nl", "en"],
    defaultLocale: "nl",
  },
  useRouter: () => router,
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => searchParams,
}));

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/components/auth/google-login-button", () => ({
  GoogleLoginButton: (props: Record<string, unknown>) => {
    childMocks.googleLogin(props);
    return <button type="button">google</button>;
  },
}));

vi.mock("@/components/auth/email-password-form", () => ({
  EmailPasswordForm: () => <div data-testid="email-password-form" />,
}));

vi.mock("@/components/ui/page-loading", () => ({
  PageLoading: () => <div data-testid="page-loading" />,
}));

vi.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/chef-hat-icon", () => ({
  ChefHatIcon: () => <div data-testid="chef-hat" />,
}));

describe("LoginPage post-login routing", () => {
  beforeEach(() => {
    authState.user = null;
    authState.loading = true;
    searchParams.delete("redirectTo");
    searchParams.delete("error");
    vi.clearAllMocks();
  });

  it("waits for the session before redirecting and uses the active locale", async () => {
    const view = render(<LoginPage />);

    expect(router.replace).not.toHaveBeenCalled();

    authState.loading = false;
    view.rerender(<LoginPage />);
    expect(router.replace).not.toHaveBeenCalled();

    authState.user = { id: "user-1" };
    view.rerender(<LoginPage />);

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith("/recipes", { locale: "en" });
    });
    expect(router.replace).toHaveBeenCalledTimes(1);
  });

  it("passes the full locale-aware destination to Google", () => {
    authState.loading = false;

    render(<LoginPage />);

    expect(childMocks.googleLogin).toHaveBeenCalledWith(
      expect.objectContaining({ redirectPath: "/en/recipes", locale: "en" }),
    );
  });

  it("honors a localized redirect target", async () => {
    searchParams.set("redirectTo", "/nl/recipes");
    authState.loading = false;

    const view = render(<LoginPage />);
    authState.user = { id: "user-1" };
    view.rerender(<LoginPage />);

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith("/recipes", { locale: "nl" });
    });
  });
});
