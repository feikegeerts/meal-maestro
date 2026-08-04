import type { ReactNode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EmailPasswordForm } from "../email-password-form";

const authMocks = vi.hoisted(() => ({
  signInWithEmail: vi.fn(),
  signUpWithEmail: vi.fn(),
}));

const toastMocks = vi.hoisted(() => ({
  error: vi.fn(),
}));

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => authMocks,
}));

vi.mock("sonner", () => ({
  toast: toastMocks,
}));

vi.mock("next/link", () => ({
  default: ({ children, ...props }: { children: ReactNode; href: string }) => (
    <a {...props}>{children}</a>
  ),
}));

describe("EmailPasswordForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("authenticates without performing navigation", async () => {
    const user = userEvent.setup();
    authMocks.signInWithEmail.mockResolvedValue({});

    render(<EmailPasswordForm />);

    await user.type(screen.getByPlaceholderText("emailPlaceholder"), "user@example.com");
    await user.type(screen.getByPlaceholderText("passwordPlaceholder"), "password123");
    await user.click(screen.getByRole("button", { name: "signIn" }));

    await waitFor(() => {
      expect(authMocks.signInWithEmail).toHaveBeenCalledWith(
        "user@example.com",
        "password123",
      );
    });
    expect(screen.getByRole("button", { name: "signIn" })).toBeInTheDocument();
    expect(toastMocks.error).not.toHaveBeenCalled();
  });

  it("does not navigate after a failed sign-in", async () => {
    const user = userEvent.setup();
    authMocks.signInWithEmail.mockResolvedValue({ error: "invalid credentials" });

    render(<EmailPasswordForm />);

    await user.type(screen.getByPlaceholderText("emailPlaceholder"), "user@example.com");
    await user.type(screen.getByPlaceholderText("passwordPlaceholder"), "password123");
    await user.click(screen.getByRole("button", { name: "signIn" }));

    await waitFor(() => {
      expect(toastMocks.error).toHaveBeenCalledWith("signInError");
    });
    expect(authMocks.signInWithEmail).toHaveBeenCalledTimes(1);
  });
});
