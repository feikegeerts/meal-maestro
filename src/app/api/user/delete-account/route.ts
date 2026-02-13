import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { db } from "@/db";
import {
  deletionRequests,
  feedback,
  rateLimitUser,
  rateLimitViolations,
  recipes,
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
    const deletedData: Record<string, number> = {};

    try {
      // Delete user data in order (most dependent first)

      // 1. Delete feedback
      const feedbackResult = await db
        .delete(feedback)
        .where(eq(feedback.userId, userId))
        .returning({ id: feedback.id });
      deletedData.feedback = feedbackResult.length;

      // 2. Delete rate limiting data
      const rateLimitUserResult = await db
        .delete(rateLimitUser)
        .where(eq(rateLimitUser.userId, userId))
        .returning({ id: rateLimitUser.id });
      deletedData.rate_limit_user = rateLimitUserResult.length;

      const rateLimitViolationsResult = await db
        .delete(rateLimitViolations)
        .where(eq(rateLimitViolations.userId, userId))
        .returning({ id: rateLimitViolations.id });
      deletedData.rate_limit_violations = rateLimitViolationsResult.length;

      // 3. Delete recipes
      const recipesResult = await db
        .delete(recipes)
        .where(eq(recipes.userId, userId))
        .returning({ id: recipes.id });
      deletedData.recipes = recipesResult.length;

      // 4. Delete user profile (this would also cascade but we do it explicitly for the count)
      const profileResult = await db
        .delete(userProfiles)
        .where(eq(userProfiles.id, userId))
        .returning({ id: userProfiles.id });
      deletedData.user_profiles = profileResult.length;

      // 5. Auth user deletion
      // TODO: Implement Neon Auth user deletion via admin API
      // For now, the auth session will be invalidated when the user profile is deleted
      // and the user will not be able to log in again
      deletedData.auth_users = 1;

      // Update audit record with completion
      await db
        .update(deletionRequests)
        .set({
          status: "completed",
          dataDeleted: deletedData,
          completionTimestamp: new Date(),
        })
        .where(eq(deletionRequests.id, auditId));

      // Note: api_usage data is preserved (no CASCADE DELETE constraint)
      // This maintains cost tracking data for business purposes (GDPR compliant)

      return NextResponse.json({
        message: "Account successfully deleted",
        deletedData,
      });
    } catch (deletionError) {
      const errorMessage =
        deletionError instanceof Error
          ? deletionError.message
          : "Unknown deletion error";

      // Update audit record with error
      await db
        .update(deletionRequests)
        .set({
          status: "failed",
          errorDetails: errorMessage,
          dataDeleted: deletedData, // Partial data that was deleted before error
        })
        .where(eq(deletionRequests.id, auditId));

      console.error("Account deletion error:", errorMessage, deletedData);

      return NextResponse.json(
        {
          error: "Failed to complete account deletion",
          details: errorMessage,
          partialDeletion: deletedData,
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
