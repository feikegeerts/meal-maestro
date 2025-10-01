"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "@/app/i18n/routing";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useLocalizedDateFormatter } from "@/lib/date-utils";
import { RecipeDetailView } from "@/components/recipes/recipe-detail-view";
import { Button } from "@/components/ui/button";
import { PageWrapper } from "@/components/ui/page-wrapper";
import type { Recipe } from "@/types/recipe";
import { useTranslations } from "next-intl";
import { useRecipeTranslations } from "@/messages";
import {
  IngredientFormatterService,
  createTranslationAdapter,
} from "@/utils/ingredient-pluralization";
import { toast } from "sonner";
import Image from "next/image";

interface SharedRecipeClientProps {
  status: "success" | "expired" | "not-found" | "missing-token" | "error";
  data?: {
    recipe: Omit<Recipe, "user_id"> & { user_id?: never };
    originalRecipeId: string;
    allowSave: boolean;
    expiresAt: string | null;
    ownerDisplayName: string | null;
    signedImageUrl: string | null;
    slug: string;
    token: string;
  };
}

export function SharedRecipeClient({ status, data }: SharedRecipeClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { formatDateWithFallback } = useLocalizedDateFormatter();
  const t = useTranslations("recipes");
  const tUnits = useTranslations("units");
  const tIngredientPlurals = useTranslations("ingredientPlurals");
  const { translateCategory, translateSeason, translateTag } =
    useRecipeTranslations();

  const ingredientFormatter = useMemo(() => {
    const translationAdapter = createTranslationAdapter(
      tUnits,
      tIngredientPlurals
    );
    return new IngredientFormatterService(translationAdapter);
  }, [tUnits, tIngredientPlurals]);

  const [importLoading, setImportLoading] = useState(false);
  const [displayRecipe, setDisplayRecipe] = useState<Recipe | null>(null);

  const redirectTarget = useMemo(() => {
    const query = searchParams?.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);

  useEffect(() => {
    if (status === "success" && data) {
      const baseRecipe: Recipe = {
        ...(data.recipe as unknown as Recipe),
        image_url: data.signedImageUrl ?? null,
        user_id: "shared-link",
        // last_eaten optional string; use undefined rather than null to satisfy type
        last_eaten: undefined,
      };
      setDisplayRecipe(baseRecipe);
    }
  }, [status, data]);

  if (status !== "success" || !data || !displayRecipe) {
    return (
      <PageWrapper>
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-xl mx-auto text-center space-y-6">
            <h1 className="text-3xl font-bold">
              {status === "expired"
                ? t("viewSharedExpired")
                : status === "not-found"
                ? t("viewSharedInvalid")
                : status === "missing-token"
                ? t("viewSharedMissingToken")
                : t("viewSharedError")}
            </h1>
            <Button variant="outline" onClick={() => router.push("/")}>
              {t("viewSharedGoHome")}
            </Button>
          </div>
        </div>
      </PageWrapper>
    );
  }

  const handleImport = async () => {
    setImportLoading(true);
    try {
      const response = await fetch(`/api/shared-recipes/${data.slug}/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: data.token }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || t("viewSharedSaveFailed"));
      }

      const body = await response.json();
      toast.success(t("viewSharedSaved"));
      if (body?.recipe?.id) {
        router.push(`/recipes/${body.recipe.id}`);
      }
    } catch (error) {
      console.error("Failed to import shared recipe", error);
      toast.error(
        error instanceof Error ? error.message : t("viewSharedSaveFailed")
      );
    } finally {
      setImportLoading(false);
    }
  };

  const renderImage = (
    <div className="relative w-full h-64 sm:h-80 lg:h-[600px]">
      <Image
        src={data.signedImageUrl ?? "/placeholder-image.webp"}
        alt={displayRecipe.title}
        fill
        className="rounded-xl object-cover"
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 600px"
      />
    </div>
  );

  const banner = (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-semibold text-primary">
          {t("viewSharedBannerTitle")}
        </p>
        <p className="text-sm text-muted-foreground">
          {data.ownerDisplayName
            ? t("viewSharedBannerDescription", {
                name: data.ownerDisplayName,
              })
            : t("viewSharedBannerAnonymous", {
                name: t("viewSharedOwnerUnknown"),
              })}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {data.allowSave ? (
          user ? (
            <Button onClick={handleImport} disabled={importLoading}>
              {importLoading ? t("viewSharedSaveLoading") : t("viewSharedSave")}
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() =>
                router.push(
                  `/login?redirectTo=${encodeURIComponent(redirectTarget)}`
                )
              }
            >
              {t("viewSharedLogin")}
            </Button>
          )
        ) : (
          <p className="text-sm text-muted-foreground">
            {t("viewSharedAllowSaveDisabled")}
          </p>
        )}
      </div>
    </div>
  );

  return (
    <RecipeDetailView
      recipe={displayRecipe}
      displayRecipe={displayRecipe}
      ingredientFormatter={ingredientFormatter}
      translateCategory={translateCategory}
      translateSeason={translateSeason}
      translateTag={translateTag}
      formatDateWithFallback={(date, fallback) =>
        formatDateWithFallback(date ?? undefined, fallback)
      }
      t={t}
      tUnits={tUnits}
      banner={banner}
      headerActions={undefined}
      onServingChange={(scaledRecipe) => setDisplayRecipe(scaledRecipe)}
      renderImage={renderImage}
      showPrintButton={false}
    />
  );
}
