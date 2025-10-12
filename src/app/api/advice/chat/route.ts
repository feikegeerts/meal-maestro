import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { AdviceChatService, AdviceCandidateSummary } from "@/lib/advice-chat-service";
import { ChatResponseFormatter } from "@/lib/chat-response-formatter";
import { MonthlySpendLimitError, usageLimitService } from "@/lib/usage-limit-service";

interface AdviceChatBody {
  message: string;
  conversation_history?: Array<{ role: "user" | "assistant" | "system" | "tool"; content: string; tool_call_id?: string }>;
  locale?: string;
}

function getCurrentSeason(): "spring" | "summer" | "fall" | "winter" {
  const m = new Date().getMonth(); // 0-11
  if (m >= 2 && m <= 4) return "spring";
  if (m >= 5 && m <= 7) return "summer";
  if (m >= 8 && m <= 10) return "fall";
  return "winter"; // Dec-Feb
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof Response) return authResult;
  const { user, client: supabase } = authResult;

  let detectedLocale: string | undefined = undefined;

  try {
    const body: AdviceChatBody = await request.json();
    const { message, conversation_history = [], locale } = body;

    if (!message || message.trim().length === 0) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // Determine season and cooldown threshold
    const season = getCurrentSeason();
    const cooldownDays = 7;
    const threshold = new Date(Date.now() - cooldownDays * 24 * 60 * 60 * 1000).toISOString();

    // Fetch candidate recipes: exclude very recent (cooldown window)
    const { data: rows, error } = await supabase
      .from("recipes")
      .select(
        "id, title, category, cuisine, season, diet_types, dish_types, proteins, characteristics, last_eaten"
      )
      .eq("user_id", user.id)
      .or(`last_eaten.is.null,last_eaten.lt.${threshold}`)
      .limit(200);

    if (error) {
      console.error("[Advice API] DB error:", error);
      return NextResponse.json({ error: "Failed to fetch recipes" }, { status: 500 });
    }

    const candidates: AdviceCandidateSummary[] = (rows || []).map((r) => ({
      id: r.id,
      title: r.title,
      category: r.category,
      cuisine: r.cuisine,
      season: r.season,
      diet_types: r.diet_types,
      dish_types: r.dish_types,
      proteins: r.proteins,
      characteristics: r.characteristics,
      last_eaten: r.last_eaten,
    }));

    // Rank by preference: never eaten, very old, old, season match
    const daysSince = (iso?: string | null) => {
      if (!iso) return Infinity; // Never eaten gets max days
      const d = new Date(iso).getTime();
      if (!isFinite(d)) return 0;
      return Math.floor((Date.now() - d) / (24 * 60 * 60 * 1000));
    };

    const bucketScore = (iso?: string | null) => {
      if (!iso) return 0; // best bucket
      const d = daysSince(iso);
      if (d >= 90) return 1;
      if (d >= 60) return 2;
      if (d >= 30) return 3;
      return 4;
    };

    const ranked = [...candidates].sort((a, b) => {
      // Season match first
      const aSeason = (a.season || "year-round").toLowerCase();
      const bSeason = (b.season || "year-round").toLowerCase();
      const aSeasonMatch = aSeason === season || aSeason === "year-round" ? 0 : 1;
      const bSeasonMatch = bSeason === season || bSeason === "year-round" ? 0 : 1;
      if (aSeasonMatch !== bSeasonMatch) return aSeasonMatch - bSeasonMatch;

      // Buckets by recency
      const ab = bucketScore(a.last_eaten);
      const bb = bucketScore(b.last_eaten);
      if (ab !== bb) return ab - bb;

      // Oldest first
      const ad = daysSince(a.last_eaten);
      const bd = daysSince(b.last_eaten);
      return bd - ad; // larger daysSince first
    });

    const K = 12;
    const topK = ranked.slice(0, K);

    // Build advice chat service
    detectedLocale = locale || (request.headers.get("accept-language")?.includes("nl") ? "nl" : "en");
    const advice = new AdviceChatService(user.id, detectedLocale, supabase);
    const result = await advice.processMessage({
      message,
      conversation_history,
      locale: detectedLocale,
      context: { season, candidates: topK },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[Advice API] error:", error);
    if (error instanceof MonthlySpendLimitError) {
      const localeForFormatting = detectedLocale === "nl" ? "nl-NL" : "en-US";
      const now = new Date();
      const resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const resetLabel = resetDate.toLocaleDateString(localeForFormatting, { month: "long", day: "numeric" });
      const message = detectedLocale === "nl" ? `Je hebt de AI-limiet voor deze maand bereikt. De limiet wordt op ${resetLabel} automatisch vernieuwd.` : `You've reached this month's AI usage limit. It resets on ${resetLabel}.`;
      return NextResponse.json({ error: message, message, code: error.code }, { status: 402 });
    }
    const formatter = new ChatResponseFormatter(detectedLocale ?? "en");
    const err = await formatter.formatErrorResponse(error as Error);
    if (err.status === 429) {
      await usageLimitService.recordRateLimitViolation(authResult.user.id, "/api/advice/chat");
    }
    return NextResponse.json({ error: err.error }, { status: err.status });
  }
}

