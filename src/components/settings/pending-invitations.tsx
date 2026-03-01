"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, UserCircle } from "lucide-react";
import {
  useRespondToInvitationMutation,
  useRemovePartnershipMutation,
} from "@/lib/hooks/use-partnerships-query";
import { toast } from "sonner";
import type { PartnershipResponse } from "@/lib/partnership-types";

interface PendingInvitationsProps {
  received: PartnershipResponse[];
  sent: PartnershipResponse[];
}

export function PendingInvitations({ received, sent }: PendingInvitationsProps) {
  const t = useTranslations("account.partner.invitations");
  const { mutate: respond, isPending: isResponding } = useRespondToInvitationMutation();
  const { mutate: remove, isPending: isRemoving } = useRemovePartnershipMutation();

  function handleAccept(partnershipId: string) {
    respond(
      { partnershipId, body: { action: "accept" } },
      {
        onError: () => toast.error(t("acceptError")),
      },
    );
  }

  function handleDecline(partnershipId: string) {
    respond(
      { partnershipId, body: { action: "decline" } },
      {
        onError: () => toast.error(t("declineError")),
      },
    );
  }

  function handleCancel(partnershipId: string) {
    remove(
      { partnershipId },
      {
        onError: () => toast.error(t("cancelError")),
      },
    );
  }

  if (received.length === 0 && sent.length === 0) return null;

  return (
    <div className="space-y-4">
      {received.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{t("receivedTitle")}</p>
          {received.map((inv) => (
            <div
              key={inv.id}
              className="flex items-center justify-between p-3 rounded-lg border border-border"
            >
              <div className="flex items-center gap-2">
                <UserCircle className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {t("from")}: {inv.partner_display_name ?? inv.partner_email ?? inv.invitee_email}
                </span>
                <Badge variant="outline" className="text-xs">pending</Badge>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleAccept(inv.id)}
                  disabled={isResponding}
                >
                  {isResponding ? t("accepting") : t("accept")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDecline(inv.id)}
                  disabled={isResponding}
                >
                  {isResponding ? t("declining") : t("decline")}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {sent.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{t("sentTitle")}</p>
          {sent.map((inv) => (
            <div
              key={inv.id}
              className="flex items-center justify-between p-3 rounded-lg border border-border"
            >
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {t("to")}: {inv.invitee_email}
                </span>
                <Badge variant="outline" className="text-xs">pending</Badge>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleCancel(inv.id)}
                disabled={isRemoving}
              >
                {isRemoving ? t("cancelling") : t("cancel")}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
