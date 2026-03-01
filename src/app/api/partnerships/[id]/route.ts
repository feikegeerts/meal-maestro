import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { z } from "zod";
import {
  acceptInvitation,
  declineInvitation,
  removePartnership,
  PartnershipError,
} from "@/lib/partnership-service";

const RespondSchema = z.object({
  action: z.enum(["accept", "decline"]),
});

const UnlinkSchema = z.object({
  copy_recipes: z.boolean().optional(),
});

function partnershipErrorResponse(error: PartnershipError) {
  const statusMap: Record<string, number> = {
    NOT_FOUND: 404,
    FORBIDDEN: 403,
    INVALID_STATUS: 409,
    MAX_PARTNERSHIPS: 409,
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
  const { id: partnershipId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = RespondSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  try {
    if (parsed.data.action === "accept") {
      const partnership = await acceptInvitation(user.id, partnershipId);
      return NextResponse.json({ partnership });
    } else {
      await declineInvitation(user.id, partnershipId);
      return NextResponse.json({ success: true });
    }
  } catch (error) {
    if (error instanceof PartnershipError) return partnershipErrorResponse(error);
    console.error("[PATCH /api/partnerships/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAuth();
  if (authResult instanceof Response) return authResult;

  const { user } = authResult;
  const { id: partnershipId } = await params;

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    // Body is optional for DELETE
  }

  const parsed = UnlinkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  try {
    await removePartnership(user.id, partnershipId, parsed.data.copy_recipes ?? false);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof PartnershipError) return partnershipErrorResponse(error);
    console.error("[DELETE /api/partnerships/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
