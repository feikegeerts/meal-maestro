import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { db } from "@/db";
import { apiUsage } from "@/db/schema";
import { eq, sum, count } from "drizzle-orm";

export async function GET() {
  const authResult = await requireAuth();

  if (authResult instanceof Response) {
    return authResult;
  }

  const { user } = authResult;

  try {
    const [result] = await db
      .select({
        totalCost: sum(apiUsage.calculatedCost),
        totalTokens: sum(apiUsage.tokensUsed),
        totalCalls: count(),
      })
      .from(apiUsage)
      .where(eq(apiUsage.userId, user.id));

    return NextResponse.json({
      totalCost: Number(Number(result?.totalCost ?? 0).toFixed(6)),
      totalCalls: result?.totalCalls ?? 0,
      totalTokens: Number(result?.totalTokens ?? 0),
      userId: user.id,
    });
  } catch (error) {
    console.error("🔴 [UserUsageCost] API error:", error);

    return NextResponse.json(
      { error: "Internal server error while fetching user usage" },
      { status: 500 },
    );
  }
}

export interface UserUsageCostResponse {
  totalCost: number;
  totalCalls: number;
  totalTokens: number;
  userId: string;
}
