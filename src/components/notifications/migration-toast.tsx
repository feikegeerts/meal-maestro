"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

const MIGRATION_NOTICE_KEY = "migration-notice-shown";
const DISPLAY_DELAY_MS = 500;

export function MigrationToast() {
  const { user, loading } = useAuth();
  const t = useTranslations("migration");
  const [hasShown, setHasShown] = useState(true);

  useEffect(() => {
    const alreadyShown =
      localStorage.getItem(MIGRATION_NOTICE_KEY) === "true";
    setHasShown(alreadyShown);
  }, []);

  useEffect(() => {
    if (loading || hasShown || !user) return;

    const timer = setTimeout(() => {
      toast.info(t("title"), {
        description: t("description"),
        duration: 8000,
      });

      localStorage.setItem(MIGRATION_NOTICE_KEY, "true");
      setHasShown(true);
    }, DISPLAY_DELAY_MS);

    return () => clearTimeout(timer);
  }, [user, loading, hasShown, t]);

  return null;
}
