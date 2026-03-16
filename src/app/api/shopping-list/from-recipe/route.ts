import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { z } from "zod";
import { addFromRecipe, ShoppingListError } from "@/lib/shopping-list-service";

const AddFromRecipeSchema = z.object({
  recipe_id: z.string().uuid("recipe_id must be a valid UUID"),
  ingredients: z
    .array(
      z.object({
        name: z.string().min(1, "Ingredient name is required"),
        amount: z.number().nullable().optional(),
        unit: z.string().nullable().optional(),
        notes: z.string().nullable().optional(),
      }),
    )
    .min(1, "At least one ingredient is required"),
});

export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof Response) return authResult;

  const { user } = authResult;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = AddFromRecipeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  try {
    const result = await addFromRecipe(
      user.id,
      parsed.data.recipe_id,
      parsed.data.ingredients.map((ing) => ({
        name: ing.name,
        amount: ing.amount ?? null,
        unit: ing.unit ?? null,
        notes: ing.notes ?? undefined,
      })),
    );
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof ShoppingListError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 400 },
      );
    }
    console.error("[POST /api/shopping-list/from-recipe]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
