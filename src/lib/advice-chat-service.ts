import { createChatCompletion } from "./openai-service";
import { usageTrackingService } from "./usage-tracking-service";
import { usageLimitService, MonthlySpendLimitError } from "./usage-limit-service";
import { MONTHLY_SPEND_CAP_USD } from "@/config/usage-limits";
import { ChatResponseFormatter } from "./chat-response-formatter";
import type { SupabaseClient } from "@supabase/supabase-js";
import { OpenAI } from "openai";
import { getAdviceTools, RecommendationCallArgs, NewRecipeSuggestionArgs } from "./advice-functions";
import type { FunctionCallResult } from "./function-call-processor";
import type { ChatMessage } from "./conversation-builder";
import {
  RECIPE_CREATION_QUALITY_PROMPT,
  getCustomUnitsInstruction,
  getUnitPreferenceInstruction,
} from "./chat-prompts";

type RecommendationPayload = {
  primaryId?: string;
  alternates: string[];
  rationale?: string;
  reasons?: Record<string, string>;
};

const isRecordOfString = (value: unknown): value is Record<string, string> => {
  if (!value || typeof value !== "object") return false;
  return Object.values(value as Record<string, unknown>).every((v) => typeof v === "string");
};

const parseRecommendationPayload = (value: unknown): RecommendationPayload => {
  if (!value || typeof value !== "object") {
    return { alternates: [] };
  }
  const obj = value as Record<string, unknown>;
  const primaryId = typeof obj.primary_id === "string" ? obj.primary_id : undefined;
  const alternates = Array.isArray(obj.alternate_ids)
    ? obj.alternate_ids.filter((id): id is string => typeof id === "string")
    : [];
  const rationale = typeof obj.rationale === "string" ? obj.rationale : undefined;
  const reasons = isRecordOfString(obj.reasons) ? obj.reasons : undefined;
  return {
    primaryId,
    alternates,
    rationale,
    reasons,
  };
};

const isNewRecipeSuggestionArgs = (
  value: unknown
): value is NewRecipeSuggestionArgs => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as { draft?: unknown };
  if (!candidate.draft || typeof candidate.draft !== "object") return false;
  const draft = candidate.draft as { title?: unknown };
  return typeof draft.title === "string" && draft.title.trim().length > 0;
};

export interface AdviceCandidateSummary {
  id: string;
  title: string;
  category: string;
  cuisine?: string | null;
  season?: string | null;
  diet_types?: string[] | null;
  dish_types?: string[] | null;
  proteins?: string[] | null;
  characteristics?: string[] | null;
  last_eaten?: string | null;
}

export interface AdviceContext {
  season?: string;
  candidates?: AdviceCandidateSummary[];
}

export interface AdviceChatRequest {
  message: string;
  conversation_history?: Array<{ role: "user" | "assistant" | "system" | "tool"; content: string; tool_call_id?: string }>;
  locale?: string;
  context?: AdviceContext;
}

export class AdviceChatService {
  private userId: string;
  private locale: string;
  private supabaseClient?: SupabaseClient;
  private responseFormatter: ChatResponseFormatter;
  private unitPreference?: string;
  private customUnits: string[] = [];
  private preferencesLoaded = false;
  private preferencesLoading: Promise<void> | null = null;

  constructor(userId: string, locale: string = "en", supabaseClient?: SupabaseClient) {
    this.userId = userId;
    this.locale = locale;
    this.supabaseClient = supabaseClient;
    this.responseFormatter = new ChatResponseFormatter(locale);
  }

  private async ensureUserPreferencesLoaded(): Promise<void> {
    if (this.preferencesLoaded) {
      return;
    }
    if (this.preferencesLoading) {
      await this.preferencesLoading;
      return;
    }

    this.preferencesLoading = (async () => {
      // Default preference aligns with recipe assistant expectations
      let unitPreference: string | undefined = "traditional-metric";
      let customUnits: string[] = [];

      if (this.supabaseClient) {
        try {
          const { data: profile, error } = await this.supabaseClient
            .from("user_profiles")
            .select("unit_system_preference")
            .eq("id", this.userId)
            .maybeSingle();

          if (!error && profile?.unit_system_preference) {
            unitPreference = profile.unit_system_preference;
          }
        } catch (err) {
          console.warn(
            "[AdviceChatService] Failed to load user unit preference:",
            err instanceof Error ? err.message : err
          );
        }

        try {
          const { data: unitsData, error: unitsError } = await this.supabaseClient
            .from("custom_units")
            .select("unit_name")
            .eq("user_id", this.userId)
            .order("unit_name", { ascending: true });

          if (!unitsError && Array.isArray(unitsData)) {
            customUnits = unitsData
              .map((u) => u.unit_name?.trim())
              .filter((name): name is string => Boolean(name))
              .filter((name) => name.length > 0 && name.length <= 20)
              .filter((name) => /^[a-zA-Z0-9\s\-.]+$/.test(name))
              .slice(0, 25);
          }
        } catch (err) {
          console.warn(
            "[AdviceChatService] Failed to load custom units:",
            err instanceof Error ? err.message : err
          );
          customUnits = [];
        }
      }

      this.unitPreference = unitPreference;
      this.customUnits = customUnits;
      this.preferencesLoaded = true;
    })();

    try {
      await this.preferencesLoading;
    } finally {
      this.preferencesLoading = null;
    }
  }

  private buildSystemPrompt(context?: AdviceContext): string {
    const seasonLine = context?.season ? `Current season: ${context.season}.` : "";
    const languageLine = this.locale === 'nl'
      ? "Respond in Dutch. Use Dutch culinary terms and phrasing."
      : "Respond in English.";
    const header =
      "You are Meal Maestro in Advice mode. Recommend meals from the user's own recipe collection. Prefer recipes not eaten recently and that fit the current season. Only invent a new recipe if the user explicitly asks or rejects the options.";

    const guidance = [
      "Output 1 primary recommendation plus up to 2 alternates with very short rationales.",
      "When making selections, you must only pick from the candidate_recipes list provided by the system.",
      "Important: Even when you make a tool/function call, you must ALSO include a short, user-facing text response summarizing your choices (1-2 sentences).",
      "Keep it concise and friendly. Avoid listing internal IDs in your text response; refer to recipes by title only.",
    ].join(" \n");

    const candidateIntro = "Candidate recipes (id | title | category | tags | season | last_eaten):";

    const candidates = (context?.candidates || []).map((c) => {
      const tags: string[] = [];
      if (c.cuisine) tags.push(c.cuisine);
      (c.diet_types || []).forEach((t) => tags.push(t));
      (c.dish_types || []).forEach((t) => tags.push(t));
      (c.proteins || []).forEach((t) => tags.push(t));
      (c.characteristics || []).forEach((t) => tags.push(t));
      const tagStr = tags.filter(Boolean).join(", ");
      return `${c.id} | ${c.title} | ${c.category}${tagStr ? ` | ${tagStr}` : ""} | ${c.season || "year-round"} | ${c.last_eaten || "never"}`;
    });

    const recipeDraftGuardrails =
      "If you call create_new_recipe_suggestion, the draft MUST follow these recipe requirements exactly:";

    const preferenceInstruction = this.unitPreference
      ? getUnitPreferenceInstruction(this.unitPreference).trim()
      : "";
    const customUnitsInstruction = this.customUnits.length
      ? getCustomUnitsInstruction(this.customUnits).trim()
      : "";

    return [
      languageLine,
      header,
      seasonLine,
      guidance,
      candidateIntro,
      ...candidates,
      recipeDraftGuardrails,
      RECIPE_CREATION_QUALITY_PROMPT,
      preferenceInstruction,
      customUnitsInstruction,
    ]
      .filter(Boolean)
      .join("\n");
  }

  async processMessage(req: AdviceChatRequest) {
    const { message, conversation_history = [], context } = req;

    if (!message || message.trim().length === 0) {
      throw new Error("Message is required");
    }

    await this.ensureUserPreferencesLoaded();
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
    messages.push({ role: "system", content: this.buildSystemPrompt(context) });

    // Append conversation history
    for (const m of conversation_history) {
      messages.push({ role: m.role as "user" | "assistant" | "system", content: m.content });
    }
    // Current user message
    messages.push({ role: "user", content: message });

    // Guard usage
    await usageLimitService.assertWithinMonthlyLimit(this.userId);

    const { completion, usage } = await createChatCompletion(messages, getAdviceTools());

    // Log usage
    const usageLog = await usageTrackingService.logUsage(this.userId, "/api/advice/chat", usage);
    if (!usageLog.success) {
      console.warn("🟡 [AdviceChatService] Failed to log usage:", usageLog.error);
    } else if (usageLog.limitReached) {
      throw new MonthlySpendLimitError(MONTHLY_SPEND_CAP_USD, usageLog.summary?.totalCost ?? usageLog.cost ?? MONTHLY_SPEND_CAP_USD);
    }

    let responseContent = completion.choices[0].message.content;
    let functionResult: FunctionCallResult | null = null;

    if (completion.choices[0].message.tool_calls) {
      const toolCall = completion.choices[0].message.tool_calls[0];
      if (toolCall.type === "function") {
        try {
          const args = JSON.parse(toolCall.function.arguments || "{}");
          functionResult = { function: toolCall.function.name, result: args };
        } catch {
          functionResult = { function: toolCall.function.name, error: "Invalid function arguments" };
        }
      }
    }

    // Sanitize choose_recommendations result against provided candidates
    if (
      functionResult?.function === "choose_recommendations" &&
      functionResult.result
    ) {
      const candidates = context?.candidates ?? [];

      const noRecommendationsMessage =
        this.locale === "nl"
          ? "Ik kan nu geen recepten aanbevelen. Voeg eerst enkele recepten toe of probeer het later opnieuw."
          : "I couldn't find any recipes to recommend yet. Try adding some recipes first or check back later.";

      if (candidates.length === 0) {
        if (!responseContent || responseContent.trim().length === 0) {
          responseContent = noRecommendationsMessage;
        }
        functionResult = {
          function: functionResult.function,
          error: "no_candidates_available",
        };
      } else {
        const candIds = new Set(candidates.map((c) => c.id));
        const parsed = parseRecommendationPayload(functionResult.result);

        let primary = parsed.primaryId;
        const validAlternates = parsed.alternates.filter((id) => candIds.has(id));

        if (!primary || !candIds.has(primary)) {
          const fallbackPrimary =
            validAlternates.find((id) => candIds.has(id)) ??
            candidates.find((candidate) => candIds.has(candidate.id))?.id ??
            null;
          primary = fallbackPrimary ?? undefined;
        }

        if (!primary) {
          if (!responseContent || responseContent.trim().length === 0) {
            responseContent = noRecommendationsMessage;
          }
          functionResult = {
            function: functionResult.function,
            error: "no_valid_candidate",
          };
        } else {
          const alternates = validAlternates
            .filter((id) => id !== primary && candIds.has(id))
            .slice(0, 2);

          const sanitized: RecommendationCallArgs = {
            primary_id: primary,
            ...(alternates.length ? { alternate_ids: alternates } : {}),
            ...(parsed.rationale ? { rationale: parsed.rationale } : {}),
            ...(parsed.reasons ? { reasons: parsed.reasons } : {}),
          };

          functionResult = {
            function: functionResult.function,
            result: sanitized,
          };
        }
      }
    }

    // If the model didn't provide user-facing text but chose recommendations,
    // synthesize a concise summary from the function result and known candidates.
    if (
      (!responseContent || responseContent.trim().length === 0) &&
      functionResult?.function === "choose_recommendations" &&
      functionResult.result &&
      context?.candidates
    ) {
      const { primaryId, alternates, rationale } = parseRecommendationPayload(
        functionResult.result
      );
      const byId = new Map((context.candidates || []).map((c) => [c.id, c]));

      const effectivePrimaryId = primaryId && byId.has(primaryId)
        ? primaryId
        : context.candidates[0]?.id;
      const primaryCandidate = effectivePrimaryId
        ? byId.get(effectivePrimaryId)
        : undefined;

      const lang = this.locale === "nl" ? "nl" : "en";
      const recipeWord = lang === "nl" ? "recept" : "recipe";
      const recommendVerb = lang === "nl" ? "Ik stel voor" : "I recommend";
      const alternatesLabel = lang === "nl" ? "Alternatieven" : "Alternates";
      const becauseLabel = lang === "nl" ? "Reden" : "Reason";

      const primaryLabel = primaryCandidate?.title || (effectivePrimaryId ? `${recipeWord} ${effectivePrimaryId}` : recipeWord);
      const alternateTitles = alternates
        .map((id) => byId.get(id))
        .filter((candidate): candidate is AdviceCandidateSummary => Boolean(candidate))
        .map((candidate) => candidate.title || `${recipeWord} ${candidate.id}`);

      let text = `${recommendVerb}: ${primaryLabel}.`;
      if (alternateTitles.length) {
        text += ` ${alternatesLabel}: ${alternateTitles.join(", ")}.`;
      }
      if (rationale) {
        text += ` ${becauseLabel}: ${rationale}`;
      }
      responseContent = text;
    }

    if (
      (!responseContent || responseContent.trim().length === 0) &&
      functionResult?.function === "create_new_recipe_suggestion" &&
      isNewRecipeSuggestionArgs(functionResult.result)
    ) {
      const draft = functionResult.result.draft;
      const lang = this.locale === "nl" ? "nl" : "en";
      const title = draft.title.trim();
      responseContent =
        lang === "nl"
          ? `Top! Ik heb het nieuwe recept "${title}" voor je klaargezet. Ik open zo het receptformulier zodat je het kunt bekijken en aanpassen.`
          : `Great! I've prepared the new recipe "${title}" for you. I'll open the recipe form so you can review and tweak it.`;
    }

    const updatedHistory: ChatMessage[] = [
      ...(conversation_history as ChatMessage[]),
      { role: "user", content: message },
      { role: "assistant", content: responseContent || "" },
    ];

    const finalResponse = await this.responseFormatter.formatResponse(
      responseContent || "",
      updatedHistory,
      functionResult
    );
    return finalResponse;
  }
}
