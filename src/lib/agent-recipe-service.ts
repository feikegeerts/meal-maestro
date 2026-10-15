import { and, asc, desc, eq, ilike, isNotNull, isNull, lt, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { recipes, recipeCategoryEnum } from "@/db/schema";
import { recipeAccessCondition } from "@/lib/partnership-service";
import { toRecipeResponse } from "@/lib/recipe-response-mapper";

export const agentRecipeIdSchema = z.uuid();
export const agentEatenBodySchema = z.object({ date: z.iso.date().optional() }).strict();
export const agentRecipeQuerySchema = z.object({
  query: z.string().trim().min(1).max(200).optional(),
  category: z.enum(recipeCategoryEnum.enumValues).optional(),
  eaten_status: z.enum(["all", "recorded", "unrecorded"]).default("all"),
  last_eaten_before: z.iso.date().optional(),
  sort: z.enum(["last_eaten_asc", "last_eaten_desc", "title", "newest"]).default("last_eaten_asc"),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).max(100000).default(0),
}).strict().refine(
  (data) => !(data.eaten_status === "unrecorded" && data.last_eaten_before),
  { message: "last_eaten_before requires a recorded date" },
);

type RecipeQuery = z.infer<typeof agentRecipeQuerySchema>;

export async function listAgentRecipes(userId: string, query: RecipeQuery) {
  const conditions = [await recipeAccessCondition(userId)];
  if (query.category) conditions.push(eq(recipes.category, query.category));
  if (query.eaten_status === "recorded") conditions.push(isNotNull(recipes.lastEaten));
  if (query.eaten_status === "unrecorded") conditions.push(isNull(recipes.lastEaten));
  if (query.last_eaten_before) {
    conditions.push(lt(recipes.lastEaten, new Date(`${query.last_eaten_before}T00:00:00.000Z`)));
  }
  if (query.query) {
    // Each word must match, in any order. Treat SQL wildcard characters literally.
    for (const word of query.query.split(/\s+/)) {
      const pattern = `%${word.replace(/[\\%_]/g, "\\$&")}%`;
      conditions.push(or(
        ilike(recipes.title, pattern),
        ilike(recipes.description, pattern),
        sql`${recipes.ingredients}::text ILIKE ${pattern}`,
      )!);
    }
  }
  const sort = {
    last_eaten_asc: sql`${recipes.lastEaten} asc nulls last`,
    last_eaten_desc: sql`${recipes.lastEaten} desc nulls last`,
    title: asc(recipes.title),
    newest: desc(recipes.createdAt),
  }[query.sort];

  const rows = await db.select({
    id: recipes.id, title: recipes.title, category: recipes.category,
    cuisine: recipes.cuisine, season: recipes.season, lastEaten: recipes.lastEaten,
    totalTime: recipes.totalTime, servings: recipes.servings,
  }).from(recipes).where(and(...conditions))
    .orderBy(sort, asc(recipes.id)).limit(query.limit + 1).offset(query.offset);

  const hasMore = rows.length > query.limit;
  return {
    recipes: rows.slice(0, query.limit).map((row) => ({
      id: row.id, title: row.title, category: row.category,
      cuisine: row.cuisine, season: row.season, servings: row.servings,
      total_time: row.totalTime, last_eaten: row.lastEaten?.toISOString() ?? null,
    })),
    has_more: hasMore,
    next_offset: hasMore ? query.offset + query.limit : null,
  };
}

export async function getAgentRecipe(userId: string, id: string) {
  const access = await recipeAccessCondition(userId);
  const [row] = await db.select().from(recipes)
    .where(and(eq(recipes.id, id), access)).limit(1);
  return row ? { ...toRecipeResponse(row), last_eaten: row.lastEaten?.toISOString() ?? null } : null;
}

export async function markAgentRecipeEaten(userId: string, id: string, date: string) {
  const access = await recipeAccessCondition(userId);
  // Calendar dates use UTC midnight, matching the app's ISO last_eaten field.
  // A repeated PUT stores the same date; it does not append duplicate events.
  const [row] = await db.update(recipes)
    .set({ lastEaten: new Date(`${date}T00:00:00.000Z`) })
    .where(and(eq(recipes.id, id), access))
    .returning({ id: recipes.id, title: recipes.title, lastEaten: recipes.lastEaten });
  return row ? { id: row.id, title: row.title, last_eaten: row.lastEaten!.toISOString() } : null;
}
