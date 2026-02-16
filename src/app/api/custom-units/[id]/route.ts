import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { db } from "@/db";
import { customUnits } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await requireAuth();

    if (authResult instanceof Response) {
      return authResult;
    }

    const { user } = authResult;

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Custom unit ID is required" },
        { status: 400 },
      );
    }

    // First check if the unit exists and belongs to the user
    const [existingUnit] = await db
      .select({ id: customUnits.id })
      .from(customUnits)
      .where(and(eq(customUnits.id, id), eq(customUnits.userId, user.id)))
      .limit(1);

    if (!existingUnit) {
      return NextResponse.json(
        { error: "Custom unit not found" },
        { status: 404 },
      );
    }

    // Delete the custom unit
    await db
      .delete(customUnits)
      .where(and(eq(customUnits.id, id), eq(customUnits.userId, user.id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unexpected error in DELETE /api/custom-units/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
