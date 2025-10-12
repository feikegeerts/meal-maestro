import { OpenAI } from "openai";

export interface RecommendationCallArgs {
  primary_id: string;
  alternate_ids?: string[];
  rationale?: string;
  reasons?: Record<string, string>;
}

export interface NewRecipeDraft {
  title: string;
  ingredients: Array<{ id?: string; name: string; amount?: number | null; unit?: string | null; notes?: string }>;
  servings: number;
  description: string;
  category: string;
  season?: string;
  cuisine?: string;
  diet_types?: string[];
  cooking_methods?: string[];
  dish_types?: string[];
  proteins?: string[];
  occasions?: string[];
  characteristics?: string[];
}

export interface NewRecipeSuggestionArgs {
  draft: NewRecipeDraft;
}

export function getAdviceTools(): OpenAI.Chat.Completions.ChatCompletionCreateParams["tools"] {
  return [
    {
      type: "function",
      function: {
        name: "choose_recommendations",
        description:
          "Return the chosen recommendations from the provided candidate list. Include one primary and up to two alternates with brief rationales.",
        parameters: {
          type: "object",
          properties: {
            primary_id: { type: "string", description: "ID of the primary recommended recipe" },
            alternate_ids: {
              type: "array",
              items: { type: "string" },
              description: "IDs of up to two alternate recommended recipes",
            },
            rationale: { type: "string", description: "Overall rationale for the selection" },
            reasons: {
              type: "object",
              additionalProperties: { type: "string" },
              description: "Optional map of recipe_id -> reason",
            },
          },
          required: ["primary_id"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "create_new_recipe_suggestion",
        description:
          "Create a brand-new recipe draft only when the user explicitly asks or rejects the suggestions.",
        parameters: {
          type: "object",
          properties: {
            draft: {
              type: "object",
              description: "Complete recipe draft in the form used by the Add Recipe page",
              properties: {
                title: { type: "string" },
                ingredients: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      name: { type: "string" },
                      amount: { type: ["number", "null"] },
                      unit: { type: ["string", "null"] },
                      notes: { type: "string" },
                    },
                    required: ["name"],
                  },
                },
                servings: { type: "number" },
                description: { type: "string" },
                category: { type: "string" },
                season: { type: "string" },
                cuisine: { type: "string" },
                diet_types: { type: "array", items: { type: "string" } },
                cooking_methods: { type: "array", items: { type: "string" } },
                dish_types: { type: "array", items: { type: "string" } },
                proteins: { type: "array", items: { type: "string" } },
                occasions: { type: "array", items: { type: "string" } },
                characteristics: { type: "array", items: { type: "string" } },
              },
              required: ["title", "ingredients", "servings", "description", "category"],
            },
          },
          required: ["draft"],
        },
      },
    },
  ];
}

