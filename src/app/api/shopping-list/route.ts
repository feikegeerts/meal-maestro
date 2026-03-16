import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { z } from "zod";
import {
  getShoppingList,
  addFreeformItem,
  ShoppingListError,
} from "@/lib/shopping-list-service";

const AddFreeformItemSchema = z.object({
  name: z.string().min(1, "Name is required"),
  amount: z.number().nullable().optional(),
  unit: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function GET() {
  const authResult = await requireAuth();
  if (authResult instanceof Response) return authResult;

  const { user } = authResult;

  try {
    const items = await getShoppingList(user.id);
    return NextResponse.json(items);
  } catch (error) {
    console.error("[GET /api/shopping-list]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

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

  const parsed = AddFreeformItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  try {
    const item = await addFreeformItem(
      user.id,
      parsed.data.name,
      parsed.data.amount,
      parsed.data.unit,
      parsed.data.notes,
    );
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    if (error instanceof ShoppingListError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 400 },
      );
    }
    console.error("[POST /api/shopping-list]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
