import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { z } from "zod";
import { reorderItems, ShoppingListError } from "@/lib/shopping-list-service";

const ReorderItemsSchema = z.object({
  item_ids: z.array(z.string().uuid("Each item_id must be a valid UUID")).min(1, "item_ids must not be empty"),
});

export async function PATCH(request: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof Response) return authResult;

  const { user } = authResult;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = ReorderItemsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  try {
    await reorderItems(user.id, parsed.data.item_ids);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ShoppingListError) {
      const statusMap: Record<string, number> = {
        NOT_FOUND: 404,
        FORBIDDEN: 403,
      };
      return NextResponse.json(
        { error: (error as ShoppingListError).message, code: (error as ShoppingListError).code },
        { status: statusMap[(error as ShoppingListError).code] ?? 400 },
      );
    }
    console.error("[PATCH /api/shopping-list/reorder]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
