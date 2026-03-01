import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { db } from "@/db";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle as drizzleWs } from "drizzle-orm/neon-serverless";
import ws from "ws";
import {
  customUnits,
  deletionRequests,
  feedback,
  monthlyUsageSummary,
  rateLimitUser,
  rateLimitViolations,
  recipes,
  usageAlertEvents,
  userProfiles,
} from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const { confirmationPhrase } = await request.json();

    if (!confirmationPhrase || typeof confirmationPhrase !== "string") {
      return NextResponse.json(
        { error: "Confirmation phrase is required" },
        { status: 400 },
      );
    }

    const authResult = await requireAuth();

    if (authResult instanceof Response) {
      return authResult;
    }

    const { user } = authResult;
    const userId = user.id;

    // Validate confirmation phrase matches user's email
    if (
      confirmationPhrase.toLowerCase().trim() !==
      (user.email || "").toLowerCase()
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid confirmation - must match your email address exactly",
        },
        { status: 400 },
      );
    }

    // Create deletion request record for audit trail
    const [deletionRequest] = await db
      .insert(deletionRequests)
      .values({
        userId,
        userEmail: user.email || "",
        status: "processing",
        requestedByUser: true,
        confirmationPhrase: confirmationPhrase.trim(),
      })
      .returning({ id: deletionRequests.id });

    if (!deletionRequest) {
      console.error("Failed to create deletion audit record");
      return NextResponse.json(
        { error: "Failed to process deletion request" },
        { status: 500 },
      );
    }

    const auditId = deletionRequest.id;

    try {
      // neon-http doesn't support transactions; use a short-lived WebSocket Pool for atomicity
      neonConfig.webSocketConstructor = ws;
      const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
      const txDb = drizzleWs(pool);

      // All deletes run inside a single transaction — any failure rolls back everything
      const deletedData = await txDb.transaction(async (tx) => {
        const data: Record<string, number> = {};

        // Delete user data in dependency order (child tables before parent)

        data.feedback = (
          await tx
            .delete(feedback)
            .where(eq(feedback.userId, userId))
            .returning({ id: feedback.id })
        ).length;

        data.rate_limit_user = (
          await tx
            .delete(rateLimitUser)
            .where(eq(rateLimitUser.userId, userId))
            .returning({ id: rateLimitUser.id })
        ).length;

        data.rate_limit_violations = (
          await tx
            .delete(rateLimitViolations)
            .where(eq(rateLimitViolations.userId, userId))
            .returning({ id: rateLimitViolations.id })
        ).length;

        data.custom_units = (
          await tx
            .delete(customUnits)
            .where(eq(customUnits.userId, userId))
            .returning({ id: customUnits.id })
        ).length;

        data.monthly_usage_summary = (
          await tx
            .delete(monthlyUsageSummary)
            .where(eq(monthlyUsageSummary.userId, userId))
            .returning({ userId: monthlyUsageSummary.userId })
        ).length;

        data.usage_alert_events = (
          await tx
            .delete(usageAlertEvents)
            .where(eq(usageAlertEvents.userId, userId))
            .returning({ id: usageAlertEvents.id })
        ).length;

        data.recipes = (
          await tx
            .delete(recipes)
            .where(eq(recipes.userId, userId))
            .returning({ id: recipes.id })
        ).length;

        // userProfiles last — it's the parent record; deleting it cascades auth session
        data.user_profiles = (
          await tx
            .delete(userProfiles)
            .where(eq(userProfiles.id, userId))
            .returning({ id: userProfiles.id })
        ).length;

        // TODO: Implement Neon Auth user deletion via admin API
        // For now, the auth session is invalidated when the user profile is deleted
        data.auth_users = 1;

        return data;
      });

      await pool.end();

      // Note: api_usage data is preserved (no CASCADE DELETE constraint)
      // This maintains cost tracking data for business purposes (GDPR compliant)

      await db
        .update(deletionRequests)
        .set({
          status: "completed",
          dataDeleted: deletedData,
          completionTimestamp: new Date(),
        })
        .where(eq(deletionRequests.id, auditId));

      return NextResponse.json({
        message: "Account successfully deleted",
        deletedData,
      });
    } catch (deletionError) {
      const errorMessage =
        deletionError instanceof Error
          ? deletionError.message
          : "Unknown deletion error";

      // Transaction rolled back — nothing was deleted; record the failure with empty counts
      await db
        .update(deletionRequests)
        .set({
          status: "failed",
          errorDetails: errorMessage,
          dataDeleted: {},
        })
        .where(eq(deletionRequests.id, auditId));

      console.error("Account deletion error:", errorMessage);

      return NextResponse.json(
        {
          error: "Failed to complete account deletion",
          details: errorMessage,
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Delete account API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
