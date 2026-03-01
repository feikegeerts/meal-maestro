import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { z } from "zod";
import {
  getPartnerships,
  sendInvitation,
  PartnershipError,
} from "@/lib/partnership-service";

const SendInvitationSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export async function GET() {
  const authResult = await requireAuth();
  if (authResult instanceof Response) return authResult;

  const { user } = authResult;

  try {
    const partnerships = await getPartnerships(user.id);
    return NextResponse.json({ partnerships });
  } catch (error) {
    console.error("[GET /api/partnerships]", error);
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

  const parsed = SendInvitationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  try {
    const partnership = await sendInvitation(user.id, parsed.data.email);
    return NextResponse.json({ partnership }, { status: 201 });
  } catch (error) {
    if (error instanceof PartnershipError) {
      const statusMap: Record<string, number> = {
        NO_USER_FOUND: 404,
        SELF_INVITE: 400,
        DUPLICATE_INVITE: 409,
        ALREADY_PARTNERED: 409,
        MAX_PARTNERSHIPS: 409,
      };
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: statusMap[error.code] ?? 400 },
      );
    }
    console.error("[POST /api/partnerships]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
