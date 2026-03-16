import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { z } from "zod";
import {
  setItemChecked,
  updateItem,
  deleteItem,
  ShoppingListError,
} from "@/lib/shopping-list-service";

const UpdateItemSchema = z.object({
  name: z.string().min(1).optional(),
  amount: z.number().nullable().optional(),
  unit: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  checked: z.boolean().optional(),
});

function shoppingListErrorResponse(error: ShoppingListError) {
  const statusMap: Record<string, number> = {
    NOT_FOUND: 404,
    FORBIDDEN: 403,
  };
  return NextResponse.json(
    { error: error.message, code: error.code },
    { status: statusMap[error.code] ?? 400 },
  );
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAuth();
  if (authResult instanceof Response) return authResult;

  const { user } = authResult;
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = UpdateItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const { checked, ...otherFields } = parsed.data;
  const hasOtherFields = Object.keys(otherFields).length > 0;

  try {
    let item;

    if (checked !== undefined && !hasOtherFields) {
      // Only checked is being updated — use the specialised function
      item = await setItemChecked(user.id, id, checked);
    } else if (hasOtherFields) {
      // Use general updateItem for field updates (may include checked)
      item = await updateItem(user.id, id, parsed.data);
    } else {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    return NextResponse.json(item);
  } catch (error) {
    if (error instanceof ShoppingListError) return shoppingListErrorResponse(error);
    console.error("[PATCH /api/shopping-list/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAuth();
  if (authResult instanceof Response) return authResult;

  const { user } = authResult;
  const { id } = await params;

  try {
    await deleteItem(user.id, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ShoppingListError) return shoppingListErrorResponse(error);
    console.error("[DELETE /api/shopping-list/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
