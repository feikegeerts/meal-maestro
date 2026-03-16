import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { clearChecked, clearAll } from "@/lib/shopping-list-service";

export async function DELETE(request: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof Response) return authResult;

  const { user } = authResult;

  const { searchParams } = new URL(request.url);
  const all = searchParams.get("all") === "true";

  try {
    if (all) {
      await clearAll(user.id);
    } else {
      await clearChecked(user.id);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/shopping-list/clear]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
