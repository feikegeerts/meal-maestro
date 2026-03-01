"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSendInvitationMutation } from "@/lib/hooks/use-partnerships-query";
import { toast } from "sonner";

const ERROR_CODE_KEYS: Record<string, string> = {
  NO_USER_FOUND: "errorNoUser",
  SELF_INVITE: "errorSelf",
  DUPLICATE_INVITE: "errorDuplicate",
  ALREADY_PARTNERED: "errorAlreadyPartnered",
  MAX_PARTNERSHIPS: "errorMaxPartnerships",
};

export function PartnerInviteForm() {
  const t = useTranslations("account.partner.invite");
  const [email, setEmail] = useState("");
  const { mutate: sendInvitation, isPending } = useSendInvitationMutation();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    sendInvitation(email.trim(), {
      onSuccess: () => {
        toast.success(t("successTitle"), {
          description: t("successDescription", { email: email.trim() }),
        });
        setEmail("");
      },
      onError: (error: unknown) => {
        const err = error as Error & { code?: string };
        const key = err.code ? ERROR_CODE_KEYS[err.code] : undefined;
        toast.error(key ? t(key as Parameters<typeof t>[0]) : err.message);
      },
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="partner-email">{t("emailLabel")}</Label>
        <div className="flex gap-2">
          <Input
            id="partner-email"
            type="email"
            placeholder={t("emailPlaceholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isPending}
            className="flex-1"
          />
          <Button type="submit" disabled={isPending || !email.trim()}>
            {isPending ? t("sending") : t("sendButton")}
          </Button>
        </div>
      </div>
    </form>
  );
}
