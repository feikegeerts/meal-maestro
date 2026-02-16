// TODO: Re-enable when Neon Auth ships webhook support for custom email templates
// All tests are commented out because the MagicLinkForm component is temporarily disabled

describe("MagicLinkForm", () => {
  it("should be re-enabled when Neon Auth webhook support is available", () => {
    // Placeholder test to prevent "empty test suite" error
    expect(true).toBe(true);
  });
});

// import { render, screen, fireEvent, waitFor } from "@testing-library/react";
// import { act } from "react";
// import userEvent from "@testing-library/user-event";
// import { MagicLinkForm } from "../magic-link-form";
// import { AuthProvider } from "../../../lib/auth-context";
// import { server } from "../../../__mocks__/server";
// import { toast } from 'sonner';

// // Mock auth client to avoid ESM dependency chain (@neondatabase/auth → better-auth → jose, nanostores)
// jest.mock("@/lib/auth/client", () => ({
//   authClient: {
//     useSession: jest.fn().mockReturnValue({ data: null, isPending: false }),
//     signIn: { social: jest.fn() },
//     emailOtp: { sendVerificationOtp: jest.fn().mockResolvedValue({ error: null }) },
//     signOut: jest.fn(),
//   },
// }));

// // Mock Sonner toast
// jest.mock('sonner', () => ({
//   toast: {
//     error: jest.fn(),
//     success: jest.fn(),
//   },
// }));

// // Use real AuthProvider to enable HTTP requests to MSW
// const wrapper = ({ children }: { children: React.ReactNode }) => (
//   <AuthProvider>{children}</AuthProvider>
// );

// describe("MagicLinkForm", () => {
//   let consoleErrorSpy: jest.SpyInstance;

//   beforeEach(() => {
//     jest.clearAllTimers();
//     server.resetHandlers();
//     consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
//   });

//   afterEach(() => {
//     consoleErrorSpy.mockRestore();
//   });

//   describe("Form rendering", () => {
//     it("should render the form with email input and submit button", () => {
//       render(<MagicLinkForm />, { wrapper });

//       expect(screen.getByPlaceholderText("emailPlaceholder")).toBeInTheDocument();
//       expect(screen.getByRole("button", { name: /sendMagicLink/i })).toBeInTheDocument();
//     });

//     it("should render with custom className", () => {
//       const { container } = render(<MagicLinkForm className="custom-class" />, { wrapper });
//       expect(container.firstChild).toHaveClass("custom-class");
//     });

//     it("should have mail icon in input and button", () => {
//       render(<MagicLinkForm />, { wrapper });

//       // Look for elements with the lucide-mail class
//       const mailIcons = document.querySelectorAll('.lucide-mail');
//       expect(mailIcons.length).toBeGreaterThanOrEqual(2); // Input and button should both have mail icons
//     });
//   });

//   describe("Email validation", () => {
//     it("should disable submit button when email is empty", () => {
//       render(<MagicLinkForm />, { wrapper });

//       const submitButton = screen.getByRole("button", { name: /sendMagicLink/i });
//       expect(submitButton).toBeDisabled();
//     });

//     it("should disable submit button with invalid email", async () => {
//       const user = userEvent.setup();
//       render(<MagicLinkForm />, { wrapper });

//       const emailInput = screen.getByPlaceholderText("emailPlaceholder");
//       const submitButton = screen.getByRole("button", { name: /sendMagicLink/i });

//       await user.type(emailInput, "invalid-email");
//       expect(submitButton).toBeDisabled();
//     });

//     it("should enable submit button with valid email", async () => {
//       const user = userEvent.setup();
//       render(<MagicLinkForm />, { wrapper });

//       const emailInput = screen.getByPlaceholderText("emailPlaceholder");
//       const submitButton = screen.getByRole("button", { name: /sendMagicLink/i });

//       await user.type(emailInput, "test@example.com");
//       expect(submitButton).not.toBeDisabled();
//     });

//     it("should show validation works through form submission", async () => {
//       const user = userEvent.setup();
//       render(<MagicLinkForm />, { wrapper });

//       const emailInput = screen.getByPlaceholderText("emailPlaceholder");

//       // Type invalid email - button should be disabled
//       await user.type(emailInput, "invalid-email");
//       const submitButton = screen.getByRole("button", { name: /sendMagicLink/i });
//       expect(submitButton).toBeDisabled();

//       // Clear and type valid email - button should be enabled
//       await user.clear(emailInput);
//       await user.type(emailInput, "test@example.com");
//       expect(submitButton).not.toBeDisabled();
//     });

//     it("should show toast error when email is empty on form submission", async () => {
//       render(<MagicLinkForm />, { wrapper });

//       const form = screen.getByRole("button", { name: /sendMagicLink/i }).closest("form");

//       await act(async () => {
//         fireEvent.submit(form!);
//       });

//       await waitFor(() => {
//         expect(toast.error).toHaveBeenCalledWith("emailRequired");
//       });
//     });

//     it("should show toast error for invalid email on form submission", async () => {
//       const user = userEvent.setup();
//       render(<MagicLinkForm />, { wrapper });

//       const emailInput = screen.getByPlaceholderText("emailPlaceholder");
//       const form = emailInput.closest("form");

//       // Type invalid email and submit
//       await user.type(emailInput, "invalid-email");

//       await act(async () => {
//         fireEvent.submit(form!);
//       });

//       await waitFor(() => {
//         expect(toast.error).toHaveBeenCalledWith("invalidEmail");
//       });
//     });
//   });

//   describe("Form submission", () => {
//     // Focus tests on UI behavior rather than auth integration
//     it("should enable submit button with valid email", async () => {
//       const user = userEvent.setup();
//       render(<MagicLinkForm />, { wrapper });

//       const emailInput = screen.getByPlaceholderText("emailPlaceholder");
//       const submitButton = screen.getByRole("button", { name: /sendMagicLink/i });

//       await user.type(emailInput, "test@example.com");

//       expect(submitButton).not.toBeDisabled();
//     });

//     it("should have correct form structure and elements", () => {
//       render(<MagicLinkForm />, { wrapper });

//       expect(screen.getByPlaceholderText("emailPlaceholder")).toBeInTheDocument();
//       expect(screen.getByRole("button", { name: /sendMagicLink/i })).toBeInTheDocument();
//       expect(screen.getByText("magicLinkInfo")).toBeInTheDocument();
//     });
//   });

//   describe("Error handling", () => {
//     // Simplify error handling tests to focus on component behavior rather than complex mocking
//     it("should show submit button is enabled with valid email", () => {
//       render(<MagicLinkForm />, { wrapper });

//       const emailInput = screen.getByPlaceholderText("emailPlaceholder");
//       const submitButton = screen.getByRole("button", { name: /sendMagicLink/i });

//       fireEvent.change(emailInput, { target: { value: "test@example.com" } });

//       expect(submitButton).not.toBeDisabled();
//     });

//     it("should show submit button is disabled with invalid email", () => {
//       render(<MagicLinkForm />, { wrapper });

//       const emailInput = screen.getByPlaceholderText("emailPlaceholder");
//       const submitButton = screen.getByRole("button", { name: /sendMagicLink/i });

//       fireEvent.change(emailInput, { target: { value: "invalid-email" } });

//       expect(submitButton).toBeDisabled();
//     });
//   });

//   describe("Accessibility", () => {
//     it("should have proper ARIA labels and attributes", () => {
//       render(<MagicLinkForm />, { wrapper });

//       const emailInput = screen.getByPlaceholderText("emailPlaceholder");
//       const submitButton = screen.getByRole("button", { name: /sendMagicLink/i });

//       expect(emailInput).toHaveAttribute("type", "email");
//       expect(emailInput).toHaveAttribute("autoComplete", "email");
//       expect(submitButton).toHaveAttribute("type", "submit");
//     });

//     it("should call toast error for validation errors", () => {
//       render(<MagicLinkForm />, { wrapper });

//       const emailInput = screen.getByPlaceholderText("emailPlaceholder");
//       const form = emailInput.closest("form");

//       // Trigger error by submitting empty form
//       act(() => {
//         fireEvent.submit(form!);
//       });

//       // Check for toast error call
//       expect(toast.error).toHaveBeenCalledWith("emailRequired");
//     });
//   });

//   describe("Component structure", () => {
//     it("should have all required form elements", () => {
//       render(<MagicLinkForm />, { wrapper });

//       // Check for form elements
//       expect(screen.getByPlaceholderText("emailPlaceholder")).toBeInTheDocument();
//       expect(screen.getByRole("button", { name: /sendMagicLink/i })).toBeInTheDocument();

//       // Check for descriptive text
//       expect(screen.getByText("magicLinkInfo")).toBeInTheDocument();

//       // Check for icons
//       const mailIcons = document.querySelectorAll('.lucide-mail');
//       expect(mailIcons.length).toBeGreaterThanOrEqual(1);
//     });
//   });
// });
