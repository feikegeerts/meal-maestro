"use client";

import { useTranslations } from "next-intl";
import { Users } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PartnerInviteForm } from "@/components/settings/partner-invite-form";
import { PendingInvitations } from "@/components/settings/pending-invitations";
import { PartnerCard } from "@/components/settings/partner-card";
import {
  usePartnershipsQuery,
  useAcceptedPartnership,
  usePendingReceivedInvitations,
  usePendingSentInvitations,
} from "@/lib/hooks/use-partnerships-query";

export function PartnerSharingSection() {
  const t = useTranslations("account.partner");
  const { data, isLoading } = usePartnershipsQuery();

  const partnerships = data?.partnerships;
  const accepted = useAcceptedPartnership(partnerships);
  const receivedInvitations = usePendingReceivedInvitations(partnerships);
  const sentInvitations = usePendingSentInvitations(partnerships);

  const hasPendingInvitations =
    receivedInvitations.length > 0 || sentInvitations.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          {t("title")}
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-16 flex items-center">
            <span className="text-sm text-muted-foreground">Loading...</span>
          </div>
        ) : (
          <div className="space-y-6">
            {accepted ? (
              <>
                <div>
                  <p className="text-sm font-medium mb-3">{t("current.title")}</p>
                  <PartnerCard partnership={accepted} />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-3">
                  <p className="text-sm font-medium">{t("invite.title")}</p>
                  <p className="text-sm text-muted-foreground">{t("invite.description")}</p>
                  <PartnerInviteForm />
                </div>
              </>
            )}

            {hasPendingInvitations && (
              <PendingInvitations
                received={receivedInvitations}
                sent={sentInvitations}
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
