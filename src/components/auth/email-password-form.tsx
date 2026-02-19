"use client";

import { useState } from "react";
import { useRouter } from "@/app/i18n/routing";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import Link from "next/link";

interface EmailPasswordFormProps {
  redirectPath?: string | null;
}

export function EmailPasswordForm({ redirectPath }: EmailPasswordFormProps) {
  const { signInWithEmail, signUpWithEmail } = useAuth();
  const router = useRouter();
  const t = useTranslations("auth");

  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const isValidEmail = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const validate = (): string | null => {
    if (!email.trim()) return t("emailRequired");
    if (!isValidEmail(email)) return t("invalidEmail");
    if (!password) return t("passwordRequired");
    if (password.length < 8) return t("passwordTooShort");
    if (mode === "signUp") {
      if (!name.trim()) return t("nameRequired");
      if (password !== confirmPassword) return t("passwordMismatch");
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validate();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setIsLoading(true);

    try {
      if (mode === "signIn") {
        const { error } = await signInWithEmail(email.trim(), password);
        if (error) {
          toast.error(t("signInError"));
          return;
        }
      } else {
        const { error } = await signUpWithEmail(name.trim(), email.trim(), password);
        if (error) {
          toast.error(t("signUpError"));
          return;
        }
      }

      router.push(redirectPath ?? "/recipes");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 w-full">
      {mode === "signUp" && (
        <Input
          type="text"
          placeholder={t("namePlaceholder")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isLoading}
          autoComplete="name"
        />
      )}

      <Input
        type="email"
        placeholder={t("emailPlaceholder")}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={isLoading}
        autoComplete="email"
      />

      <Input
        type="password"
        placeholder={t("passwordPlaceholder")}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={isLoading}
        autoComplete={mode === "signIn" ? "current-password" : "new-password"}
      />

      {mode === "signUp" && (
        <Input
          type="password"
          placeholder={t("confirmPasswordPlaceholder")}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={isLoading}
          autoComplete="new-password"
        />
      )}

      {mode === "signIn" && (
        <div className="text-right">
          <Link
            href="/forgot-password"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {t("forgotPassword")}
          </Link>
        </div>
      )}

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {mode === "signIn" ? t("signingIn") : t("creatingAccount")}
          </>
        ) : mode === "signIn" ? (
          t("signIn")
        ) : (
          t("createAccount")
        )}
      </Button>

      <p className="text-xs text-center text-muted-foreground">
        {mode === "signIn" ? t("noAccount") : t("haveAccount")}{" "}
        <button
          type="button"
          onClick={() => {
            setMode(mode === "signIn" ? "signUp" : "signIn");
            setPassword("");
            setConfirmPassword("");
          }}
          className="underline hover:text-foreground transition-colors"
        >
          {mode === "signIn" ? t("signUp") : t("signIn")}
        </button>
      </p>
    </form>
  );
}
