"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { UserCircle, LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UnlinkPartnerModal } from "@/components/settings/unlink-partner-modal";
import { useRemovePartnershipMutation } from "@/lib/hooks/use-partnerships-query";
import { toast } from "sonner";
import type { PartnershipResponse } from "@/lib/partnership-types";

interface PartnerCardProps {
  partnership: PartnershipResponse;
}

export function PartnerCard({ partnership }: PartnerCardProps) {
  const t = useTranslations("account.partner");
  const [unlinkModalOpen, setUnlinkModalOpen] = useState(false);
  const { mutate: removePartnership, isPending } = useRemovePartnershipMutation();

  const partnerName = partnership.partner_display_name ?? partnership.partner_email ?? "Partner";
  const connectedDate = new Date(partnership.created_at).toLocaleDateString();

  function handleUnlink(copyRecipes: boolean) {
    removePartnership(
      { partnershipId: partnership.id, body: { copy_recipes: copyRecipes } },
      {
        onSuccess: () => {
          setUnlinkModalOpen(false);
          toast.success(t("unlink.successTitle"), {
            description: t("unlink.successDescription"),
          });
        },
        onError: () => {
          toast.error(t("unlink.errorTitle"));
        },
      },
    );
  }

  return (
    <>
      <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/30">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            {partnership.partner_avatar_url && (
              <AvatarImage src={partnership.partner_avatar_url} alt={partnerName} />
            )}
            <AvatarFallback>
              <UserCircle className="h-6 w-6" />
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-sm">{partnerName}</p>
            {partnership.partner_email && partnership.partner_display_name && (
              <p className="text-xs text-muted-foreground">{partnership.partner_email}</p>
            )}
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <LinkIcon className="h-3 w-3" />
              {t("current.connectedSince", { date: connectedDate })}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setUnlinkModalOpen(true)}
          className="text-destructive hover:text-destructive border-destructive/30 hover:border-destructive/60"
        >
          {t("current.unlinkButton")}
        </Button>
      </div>

      <UnlinkPartnerModal
        open={unlinkModalOpen}
        onOpenChange={setUnlinkModalOpen}
        onConfirm={handleUnlink}
        isPending={isPending}
      />
    </>
  );
}
