import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";

export async function GET() {
  
  const authResult = await requireAuth();

  if (authResult instanceof Response) {
    return authResult;
  }

  const { user, client } = authResult;

  try {
    // Query user's own usage data - RLS policy "Users can view own usage" applies
    const { data, error } = await client
      .from('api_usage')
      .select('calculated_cost, tokens_used')
      .eq('user_id', user.id);

    if (error) {
      console.error('🔴 [UserUsageCost] Error fetching user usage:', error);
      return NextResponse.json(
        { error: "Failed to fetch usage data" },
        { status: 500 }
      );
    }

    // Calculate totals
    const totalCost = data?.reduce((sum, entry) => sum + Number(entry.calculated_cost || 0), 0) || 0;
    const totalCalls = data?.length || 0;
    const totalTokens = data?.reduce((sum, entry) => sum + Number(entry.tokens_used || 0), 0) || 0;


    return NextResponse.json({
      totalCost: Number(totalCost.toFixed(6)),
      totalCalls,
      totalTokens,
      userId: user.id
    });

  } catch (error) {
    console.error("🔴 [UserUsageCost] API error:", error);

    return NextResponse.json(
      { error: "Internal server error while fetching user usage" },
      { status: 500 }
    );
  }
}

export interface UserUsageCostResponse {
  totalCost: number;
  totalCalls: number;
  totalTokens: number;
  userId: string;
}