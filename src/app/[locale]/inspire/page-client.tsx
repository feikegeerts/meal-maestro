"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "@/app/i18n/routing";
import { useLocale, useTranslations } from "next-intl";
import { ChatInterface } from "@/components/chat/chat-interface";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageHeader } from "@/components/ui/page-header";
import { GRID_CONFIG, SPACING_CONFIG } from "@/components/recipe-edit/config/form-constants";
import { recipeService } from "@/lib/recipe-service";
import { useAuth } from "@/lib/auth-context";
import { Link } from "@/app/i18n/routing";
import { loadWithTTL, saveWithTTL, removeStored } from "@/lib/session-storage";
import { createConversationStore, SHARED_BUILDER_CONVERSATION_ID } from "@/lib/conversation-store";
import type { RecommendationCallArgs, NewRecipeSuggestionArgs } from "@/lib/advice-functions";

type ChooseCall = { function: "choose_recommendations"; result: RecommendationCallArgs; error?: string };
type CreateSuggestionCall = { function: "create_new_recipe_suggestion"; result: NewRecipeSuggestionArgs; error?: string };
type RecommendationCall =
  | ChooseCall
  | CreateSuggestionCall
  | { function: string; result?: unknown; error?: string };

const isChooseRecommendationsCall = (fn: RecommendationCall): fn is ChooseCall =>
  fn.function === "choose_recommendations" && !!fn.result;

const isCreateSuggestionCall = (fn: RecommendationCall): fn is CreateSuggestionCall =>
  fn.function === "create_new_recipe_suggestion" && !!fn.result;

interface RecommendationResult {
  primary_id: string;
  alternate_ids?: string[];
  rationale?: string;
  reasons?: Record<string, string>;
}

export default function InspireClient() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("chat");
  const navigationT = useTranslations("navigation");
  const inspireT = useTranslations("inspire");
  const recipesT = useTranslations("recipes");
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState<RecommendationResult | null>(null);
  const [detailsById, setDetailsById] = useState<Record<string, { title: string; last_eaten?: string | null }>>({});
  const [chatResetIndex, setChatResetIndex] = useState(0);
  const conversationStore = useMemo(
    () => createConversationStore({ userId: user?.id ?? null, locale }),
    [user?.id, locale]
  );
  const conversationId = SHARED_BUILDER_CONVERSATION_ID;

  // Compute storage base key early, since it's used by callbacks below
  const baseKey = useMemo(() => {
    const uid = user?.id || "anon";
    return `mm.inspire.v1.${uid}.${locale}.${conversationId}`;
  }, [user?.id, locale, conversationId]);

  const handleFunctionCall = useCallback((fn: RecommendationCall) => {
    if (isChooseRecommendationsCall(fn)) {
      const recs: RecommendationResult = {
        primary_id: fn.result.primary_id,
        alternate_ids: fn.result.alternate_ids,
        rationale: fn.result.rationale,
        reasons: fn.result.reasons,
      };
      setRecommendations(recs);
      saveWithTTL(`${baseKey}.recs`, recs, { ttlMs: 24 * 60 * 60 * 1000, version: 1 });
    }
    if (isCreateSuggestionCall(fn) && fn.result.draft) {
      try {
        sessionStorage.setItem("mm.newRecipeDraft", JSON.stringify(fn.result.draft));
      } catch {
        /* ignore quota errors */
      }
      router.push(`/recipes/add`);
    }
  }, [router, baseKey]);

  const idsToShow = useMemo(() => {
    if (!recommendations) return [] as string[];
    const alts = recommendations.alternate_ids || [];
    return [recommendations.primary_id, ...alts];
  }, [recommendations]);

  // Restore persisted recommendations/details
  useEffect(() => {
    const savedRecs = loadWithTTL<RecommendationResult | null>(`${baseKey}.recs`, { ttlMs: 24 * 60 * 60 * 1000, version: 1 });
    const savedDetails = loadWithTTL<Record<string, { title: string; last_eaten?: string | null }>>(`${baseKey}.recDetails`, { ttlMs: 24 * 60 * 60 * 1000, version: 1 });
    if (savedRecs) setRecommendations(savedRecs);
    if (savedDetails) setDetailsById(savedDetails);
  }, [baseKey]);

  // Fetch recipe details (title, last_eaten) for shown IDs
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const missing = idsToShow.filter((id) => !detailsById[id]);
      if (missing.length === 0) return;
      try {
        const results = await Promise.all(
          missing.map(async (id) => {
            try {
              const r = await recipeService.getRecipe(id);
              return [id, { title: r.title, last_eaten: r.last_eaten }] as const;
            } catch (e) {
              console.warn("Failed to fetch recipe for recommendation", id, e);
              return [id, { title: `Recipe ${id}`, last_eaten: null }] as const;
            }
          })
        );
        if (!cancelled) {
          setDetailsById((prev) => {
            const next = { ...prev } as Record<string, { title: string; last_eaten?: string | null }>;
            for (const [id, data] of results) {
              next[id] = data;
            }
            // persist details each time we add new ones
            saveWithTTL(`${baseKey}.recDetails`, next, { ttlMs: 24 * 60 * 60 * 1000, version: 1 });
            return next;
          });
        }
      } catch (e) {
        console.error("Failed to load recommendation details", e);
      }
    };
    if (idsToShow.length) load();
    return () => {
      cancelled = true;
    };
  }, [idsToShow, detailsById, baseKey]);

  const initialMessage = `${t("assistantTitle")} — ${inspireT("initialChatPrompt")}`;

  return (
    <PageWrapper>
      <div className={SPACING_CONFIG.CARD_SPACING}>
        <PageHeader
          title={navigationT("inspire")}
          subtitle={inspireT("subtitle")}
          showBackButton={false}
        />

        <div
          className={`${SPACING_CONFIG.CARD_SPACING} ${SPACING_CONFIG.DESKTOP_SPACING} ${GRID_CONFIG.DESKTOP_LAYOUT}`}
        >
          <div className={GRID_CONFIG.CHAT_COLUMNS}>
            <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
              <ChatInterface
                key={chatResetIndex}
                endpoint="/api/advice/chat"
                onFunctionCall={handleFunctionCall}
                initialMessage={initialMessage}
                isDesktopSidebar={false}
                conversationId={conversationId}
                conversationStore={conversationStore}
                greetingContext="inspire"
              />
            </div>
          </div>

          <div
            className={`${SPACING_CONFIG.CARD_SPACING} lg:!mt-0 ${GRID_CONFIG.FORM_COLUMNS}`}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{inspireT("recommendationsTitle")}</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setRecommendations(null);
                    setDetailsById({});
                    removeStored(`${baseKey}.recs`);
                    removeStored(`${baseKey}.recDetails`);
                    conversationStore.clear(conversationId);
                    try {
                      sessionStorage.removeItem("mm.newRecipeDraft");
                    } catch {
                      /* ignore */
                    }
                    router.refresh();
                    setChatResetIndex((prev) => prev + 1);
                  }}
                >
                  {inspireT("clearSession")}
                </Button>
              </CardHeader>
              <CardContent>
                {idsToShow.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    {inspireT("emptyState")}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {idsToShow.map((id) => {
                      const d = detailsById[id];
                      const lastLabel = recipesT("lastEaten");
                      const never = recipesT("never");
                      const dateLocale = locale === "nl" ? "nl-NL" : "en-US";
                      const last = d?.last_eaten
                        ? new Date(d.last_eaten).toLocaleDateString(
                            dateLocale
                          )
                        : never;
                      return (
                        <Link
                          key={id}
                          href={`/recipes/${id}`}
                          className="block w-full text-left border rounded p-3 hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
                          prefetch
                        >
                          <div className="font-medium truncate">
                            {d?.title || `Recipe ${id}`}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {lastLabel}: {last}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
