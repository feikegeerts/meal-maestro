"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "@/app/i18n/routing";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Settings, Trash2, AlertTriangle, Shield } from "lucide-react";
import { DeleteAccountModal } from "@/components/settings/delete-account-modal";

export default function AccountPage() {
  const t = useTranslations("account");
  const { user } = useAuth();
  const router = useRouter();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  // Handle redirect in useEffect to avoid rendering during render cycle
  useEffect(() => {
    if (!user) {
      router.push("/");
    }
  }, [user, router]);

  // Show loading or nothing while redirecting
  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Settings className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">{t("title")}</h1>
        </div>

        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {t("info.title")}
            </CardTitle>
            <CardDescription>{t("info.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-muted">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    {t("info.email")}
                  </label>
                  <p className="text-sm font-mono">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-muted">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    {t("info.provider")}
                  </label>
                  <p className="text-sm capitalize">
                    {user.app_metadata?.provider || "email"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              {t("dangerZone.title")}
            </CardTitle>
            <CardDescription>{t("dangerZone.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <h4 className="font-semibold text-destructive mb-2">
                  {t("dangerZone.deleteAccount.title")}
                </h4>
                <p className="text-sm text-muted-foreground mb-4">
                  {t("dangerZone.deleteAccount.description")}
                </p>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p className="font-medium">{t("dangerZone.deleteAccount.whatGetsDeleted")}:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>{t("dangerZone.deleteAccount.deleted.profile")}</li>
                    <li>{t("dangerZone.deleteAccount.deleted.recipes")}</li>
                    <li>{t("dangerZone.deleteAccount.deleted.feedback")}</li>
                  </ul>
                  <p className="font-medium mt-3">{t("dangerZone.deleteAccount.whatStays")}:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>{t("dangerZone.deleteAccount.preserved.costData")}</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              variant="destructive"
              onClick={() => setDeleteModalOpen(true)}
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              {t("dangerZone.deleteAccount.button")}
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Delete Account Modal */}
      <DeleteAccountModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
      />
    </div>
  );
}