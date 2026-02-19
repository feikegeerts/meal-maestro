"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/app/i18n/routing";
import { authClient } from "@/lib/auth/client";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageLoading } from "@/components/ui/page-loading";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useTranslations("resetPassword");

  const token = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!token) {
    return (
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <AlertCircle className="h-12 w-12 text-destructive" />
        </div>
        <p className="text-muted-foreground text-sm">{t("invalidToken")}</p>
        <Link
          href="/login"
          className="inline-block text-sm text-primary underline hover:no-underline"
        >
          {t("signIn")}
        </Link>
      </div>
    );
  }

  const validate = (): string | null => {
    if (!newPassword) return t("passwordRequired");
    if (newPassword.length < 8) return t("passwordTooShort");
    if (newPassword !== confirmPassword) return t("passwordMismatch");
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
      const { error } = await authClient.resetPassword({ newPassword, token });
      if (error) {
        toast.error(t("resetError"));
        return;
      }
      setSuccess(true);
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <CheckCircle className="h-12 w-12 text-green-500" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">
          {t("successTitle")}
        </h2>
        <p className="text-muted-foreground text-sm">{t("successDescription")}</p>
        <Button onClick={() => router.push("/login")} className="w-full">
          {t("signIn")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-semibold text-foreground mb-2">
          {t("title")}
        </h1>
        <p className="text-muted-foreground text-sm">{t("description")}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          type="password"
          placeholder={t("newPasswordPlaceholder")}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          disabled={isLoading}
          autoComplete="new-password"
          autoFocus
        />

        <Input
          type="password"
          placeholder={t("confirmPasswordPlaceholder")}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={isLoading}
          autoComplete="new-password"
        />

        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t("resetting")}
            </>
          ) : (
            t("submit")
          )}
        </Button>
      </form>
    </div>
  );
}

export default function ResetPasswordPageClient() {
  return (
    <PageWrapper>
      <div className="container mx-auto px-4 py-10 lg:py-16 flex justify-center">
        <div className="w-full max-w-md">
          <div className="bg-card rounded-lg shadow-lg p-6 md:p-8">
            <Suspense fallback={<PageLoading />}>
              <ResetPasswordContent />
            </Suspense>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
