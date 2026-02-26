import { z } from "zod";
import { NextResponse } from "next/server";
import {
  RecipeCategory,
  RecipeSeason,
  CuisineType,
  DietType,
  CookingMethodType,
  DishType,
  ProteinType,
  OccasionType,
  CharacteristicType,
} from "@/types/recipe";

// Zod v4 enum helpers from TypeScript enum values
const recipeCategoryValues = Object.values(RecipeCategory) as [RecipeCategory, ...RecipeCategory[]];
const recipeSeasonValues = Object.values(RecipeSeason) as [RecipeSeason, ...RecipeSeason[]];
const cuisineTypeValues = Object.values(CuisineType) as [CuisineType, ...CuisineType[]];
const dietTypeValues = Object.values(DietType) as [DietType, ...DietType[]];
const cookingMethodTypeValues = Object.values(CookingMethodType) as [CookingMethodType, ...CookingMethodType[]];
const dishTypeValues = Object.values(DishType) as [DishType, ...DishType[]];
const proteinTypeValues = Object.values(ProteinType) as [ProteinType, ...ProteinType[]];
const occasionTypeValues = Object.values(OccasionType) as [OccasionType, ...OccasionType[]];
const characteristicTypeValues = Object.values(CharacteristicType) as [CharacteristicType, ...CharacteristicType[]];

// Shared sub-schemas
const RecipeIngredientSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  amount: z.number().nullable().optional(),
  unit: z.string().nullable().optional(),
  notes: z.string().optional(),
});

const RecipeSectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  ingredients: z.array(RecipeIngredientSchema),
  instructions: z.string(),
});

const NutritionValuesSchema = z.object({
  calories: z.number(),
  protein: z.number(),
  carbohydrates: z.number(),
  fat: z.number(),
  saturatedFat: z.number(),
  fiber: z.number(),
  sugars: z.number(),
  sodium: z.number(),
  cholesterol: z.number().optional(),
});

const NutritionSchema = z.object({
  perPortion: NutritionValuesSchema,
  meta: z.object({
    source: z.enum(["ai", "database", "mixed"]),
    fetchedAt: z.string(),
    model: z.string().optional(),
    confidence: z.number().optional(),
    warnings: z.array(z.string()).optional(),
    notes: z.string().optional(),
    cacheKey: z.string().optional(),
    servingsSnapshot: z.number().optional(),
  }),
});

// Flexible time field: accepts string or number — RecipeValidator.normalizeTimes handles conversion
const TimeFieldSchema = z.union([z.number(), z.string()]).nullable().optional();

// Recipe POST body
export const RecipePostBodySchema = z.object({
  title: z.string().min(1),
  servings: z.union([z.number(), z.string()]),
  category: z.enum(recipeCategoryValues),
  description: z.string().optional(),
  season: z.enum(recipeSeasonValues).optional(),
  cuisine: z.enum(cuisineTypeValues).optional(),
  diet_types: z.array(z.enum(dietTypeValues)).optional(),
  cooking_methods: z.array(z.enum(cookingMethodTypeValues)).optional(),
  dish_types: z.array(z.enum(dishTypeValues)).optional(),
  proteins: z.array(z.enum(proteinTypeValues)).optional(),
  occasions: z.array(z.enum(occasionTypeValues)).optional(),
  characteristics: z.array(z.enum(characteristicTypeValues)).optional(),
  ingredients: z.array(RecipeIngredientSchema).optional(),
  sections: z.array(RecipeSectionSchema).optional(),
  reference: z.string().nullable().optional(),
  pairing_wine: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  utensils: z.union([z.array(z.string()), z.string()]).nullable().optional(),
  prep_time: TimeFieldSchema,
  cook_time: TimeFieldSchema,
  total_time: TimeFieldSchema,
  nutrition: NutritionSchema.nullable().optional(),
});

// Recipe PUT body — all fields optional for partial updates
export const RecipePutBodySchema = RecipePostBodySchema.partial().extend({
  last_eaten: z.string().nullable().optional(),
});

// Bulk delete
export const RecipeBulkDeleteBodySchema = z.object({
  ids: z.array(z.string()).min(1),
});

// Bulk patch (e.g. mark_as_eaten)
export const RecipeBulkPatchBodySchema = z.object({
  ids: z.array(z.string()).min(1),
  action: z.string(),
  date: z.string().optional(),
});

// Chat
const ConversationMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system", "tool"]),
  content: z.string(),
  tool_call_id: z.string().optional(),
});

export const ChatBodySchema = z.object({
  message: z.string().optional().default(""),
  conversation_history: z.array(ConversationMessageSchema).optional().default([]),
  images: z
    .array(
      z.string().refine(
        (s) => s.startsWith("data:image/"),
        "Invalid image format. Images must be base64 encoded data URLs",
      ),
    )
    .max(5, "Maximum 5 images allowed per message")
    .optional(),
  locale: z.string().optional(),
  context: z
    .object({
      current_form_state: z
        .object({
          title: z.string().optional(),
          ingredients: z
            .array(
              z.object({
                id: z.string(),
                name: z.string(),
                amount: z.number().nullable().optional(),
                unit: z.string().nullable().optional(),
                notes: z.string().optional(),
              }),
            )
            .optional(),
          servings: z.number().optional(),
          description: z.string().optional(),
          category: z.string().optional(),
          tags: z.array(z.string()).optional(),
          season: z.string().optional(),
        })
        .optional(),
      selected_recipe: z
        .object({
          id: z.string(),
          title: z.string(),
          category: z.string(),
          season: z.string().optional(),
          tags: z.array(z.string()),
          ingredients: z.array(z.string()),
          description: z.string(),
        })
        .optional(),
    })
    .optional(),
});

// Custom unit POST
export const CustomUnitBodySchema = z.object({
  unit_name: z
    .string()
    .min(1, "Unit name is required")
    .max(50, "Unit name must be 50 characters or fewer")
    .regex(/^[a-zA-Z0-9\s.-]+$/, "Unit name can only contain letters, numbers, spaces, hyphens, and dots"),
});

// Feedback POST
export const FeedbackBodySchema = z.object({
  feedbackType: z.enum(["bug_report", "feature_request", "general_feedback", "praise"], { message: "Invalid feedback type" }),
  subject: z.string().trim().min(1, "Subject is required").max(200, "Subject must be 200 characters or fewer"),
  message: z.string().min(1, "Message is required").max(2000, "Message must be 2000 characters or fewer"),
});

// Scrape recipe POST
export const ScrapeRecipeBodySchema = z.object({
  // Don't enforce min(1) here so empty strings fall through to UrlDetector for consistent error messages
  url: z.string({ message: "URL is required" }),
});

// User profile PATCH
export const UserProfilePatchBodySchema = z
  .object({
    display_name: z.string().optional(),
    avatar_url: z.string().optional(),
    language_preference: z.string().optional(),
    unit_system_preference: z.string().optional(),
  })
  .refine(
    (data) => Object.values(data).some((v) => v !== undefined),
    { message: "No valid fields to update" },
  );

// Parse helper — validates body at runtime and returns a typed result
type ParseSuccess<T> = { success: true; data: T };
type ParseFailure = { success: false; error: NextResponse };

export function parseBody<T>(
  schema: z.ZodSchema<T>,
  body: unknown,
): ParseSuccess<T> | ParseFailure {
  const result = schema.safeParse(body);
  if (!result.success) {
    return {
      success: false,
      error: NextResponse.json(
        { error: result.error.issues.map((i) => i.message).join("; ") },
        { status: 400 },
      ),
    };
  }
  return { success: true, data: result.data };
}
