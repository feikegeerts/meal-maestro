import { db } from "@/db";
import { userPartnerships, userProfiles, recipes } from "@/db/schema";
import { and, eq, or, inArray, SQL } from "drizzle-orm";
import { EmailService } from "@/lib/email/email-service";
import type {
  PartnerInvitationAcceptedEmailData,
  PartnerInvitationReceivedEmailData,
} from "@/lib/email/types/email-types";
import type { PartnershipResponse } from "@/lib/partnership-types";

const emailService = new EmailService();

// ---------------------------------------------------------------------------
// Core access helper — single source of truth for recipe ownership checks
// ---------------------------------------------------------------------------

/**
 * Returns an array of user IDs whose recipes the given user can access.
 * For solo users returns [userId]. For partnered users returns [userId, partnerId].
 */
export async function getPartnerUserIds(userId: string): Promise<string[]> {
  const rows = await db
    .select({ inviterId: userPartnerships.inviterId, inviteeId: userPartnerships.inviteeId })
    .from(userPartnerships)
    .where(
      and(
        eq(userPartnerships.status, "accepted"),
        or(
          eq(userPartnerships.inviterId, userId),
          eq(userPartnerships.inviteeId, userId),
        ),
      ),
    );

  const partnerIds = rows.map((r) =>
    r.inviterId === userId ? r.inviteeId : r.inviterId,
  );

  return [userId, ...partnerIds];
}

/**
 * Returns a Drizzle SQL condition for use in recipe WHERE clauses.
 * Replaces `eq(recipes.userId, user.id)` in every recipe endpoint.
 */
export async function recipeAccessCondition(userId: string): Promise<SQL> {
  const userIds = await getPartnerUserIds(userId);
  return inArray(recipes.userId, userIds);
}

// ---------------------------------------------------------------------------
// Partnership CRUD
// ---------------------------------------------------------------------------

export async function getPartnerships(userId: string): Promise<PartnershipResponse[]> {
  const rows = await db
    .select({
      id: userPartnerships.id,
      inviterId: userPartnerships.inviterId,
      inviteeId: userPartnerships.inviteeId,
      inviteeEmail: userPartnerships.inviteeEmail,
      status: userPartnerships.status,
      createdAt: userPartnerships.createdAt,
      updatedAt: userPartnerships.updatedAt,
    })
    .from(userPartnerships)
    .where(
      or(
        eq(userPartnerships.inviterId, userId),
        eq(userPartnerships.inviteeId, userId),
      ),
    );

  if (rows.length === 0) return [];

  // Collect partner IDs to fetch their profiles in one query
  const partnerIds = rows.map((r) =>
    r.inviterId === userId ? r.inviteeId : r.inviterId,
  );

  const profiles = await db
    .select({
      id: userProfiles.id,
      displayName: userProfiles.displayName,
      avatarUrl: userProfiles.avatarUrl,
      email: userProfiles.email,
    })
    .from(userProfiles)
    .where(inArray(userProfiles.id, partnerIds));

  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  return rows.map((r) => {
    const partnerId = r.inviterId === userId ? r.inviteeId : r.inviterId;
    const profile = profileMap.get(partnerId);
    return {
      id: r.id,
      inviter_id: r.inviterId,
      invitee_id: r.inviteeId,
      invitee_email: r.inviteeEmail,
      status: r.status,
      created_at: r.createdAt?.toISOString() ?? "",
      updated_at: r.updatedAt?.toISOString() ?? "",
      partner_display_name: profile?.displayName ?? null,
      partner_avatar_url: profile?.avatarUrl ?? null,
      partner_email: profile?.email ?? null,
      is_inviter: r.inviterId === userId,
    };
  });
}

export async function sendInvitation(
  inviterId: string,
  inviteeEmail: string,
): Promise<PartnershipResponse> {
  // Resolve invitee by email
  const [inviteeProfile] = await db
    .select({ id: userProfiles.id, displayName: userProfiles.displayName })
    .from(userProfiles)
    .where(eq(userProfiles.email, inviteeEmail))
    .limit(1);

  if (!inviteeProfile) {
    throw new PartnershipError("NO_USER_FOUND", "No account found with that email address");
  }

  const inviteeId = inviteeProfile.id;

  if (inviteeId === inviterId) {
    throw new PartnershipError("SELF_INVITE", "You cannot invite yourself");
  }

  // Check for existing partnership in either direction
  const existing = await db
    .select({ id: userPartnerships.id, status: userPartnerships.status })
    .from(userPartnerships)
    .where(
      or(
        and(
          eq(userPartnerships.inviterId, inviterId),
          eq(userPartnerships.inviteeId, inviteeId),
        ),
        and(
          eq(userPartnerships.inviterId, inviteeId),
          eq(userPartnerships.inviteeId, inviterId),
        ),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    const existingStatus = existing[0].status;
    if (existingStatus === "accepted") {
      throw new PartnershipError("ALREADY_PARTNERED", "You are already partnered with this user");
    }
    if (existingStatus === "pending") {
      throw new PartnershipError("DUPLICATE_INVITE", "A pending invitation already exists for this pair");
    }
  }

  // Check max 1 accepted partnership per user
  const [inviterAccepted] = await db
    .select({ id: userPartnerships.id })
    .from(userPartnerships)
    .where(
      and(
        eq(userPartnerships.status, "accepted"),
        or(
          eq(userPartnerships.inviterId, inviterId),
          eq(userPartnerships.inviteeId, inviterId),
        ),
      ),
    )
    .limit(1);

  if (inviterAccepted) {
    throw new PartnershipError("MAX_PARTNERSHIPS", "You already have an active partnership");
  }

  const [inviterProfile] = await db
    .select({ displayName: userProfiles.displayName, email: userProfiles.email })
    .from(userProfiles)
    .where(eq(userProfiles.id, inviterId))
    .limit(1);

  const [partnership] = await db
    .insert(userPartnerships)
    .values({
      inviterId,
      inviteeId,
      inviteeEmail,
      status: "pending",
    })
    .returning();

  // Fire-and-forget email to invitee
  const invitationEmailData: PartnerInvitationReceivedEmailData = {
    userEmail: inviteeEmail,
    locale: "en",
    inviterName: inviterProfile?.displayName ?? inviterProfile?.email ?? "Someone",
    appUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://meal-maestro.com"}/account`,
  };
  emailService
    .sendLocalizedEmail("partner-invitation-received", invitationEmailData)
    .catch((err: unknown) => {
      console.warn("[PartnershipService] Failed to send invitation email:", err);
    });

  return {
    id: partnership.id,
    inviter_id: partnership.inviterId,
    invitee_id: partnership.inviteeId,
    invitee_email: partnership.inviteeEmail,
    status: partnership.status,
    created_at: partnership.createdAt?.toISOString() ?? "",
    updated_at: partnership.updatedAt?.toISOString() ?? "",
    partner_display_name: inviteeProfile.displayName ?? null,
    partner_avatar_url: null,
    partner_email: inviteeEmail,
    is_inviter: true,
  };
}

export async function acceptInvitation(
  userId: string,
  partnershipId: string,
): Promise<PartnershipResponse> {
  const [partnership] = await db
    .select()
    .from(userPartnerships)
    .where(eq(userPartnerships.id, partnershipId))
    .limit(1);

  if (!partnership) {
    throw new PartnershipError("NOT_FOUND", "Invitation not found");
  }

  if (partnership.inviteeId !== userId) {
    throw new PartnershipError("FORBIDDEN", "Only the invitee can accept this invitation");
  }

  if (partnership.status !== "pending") {
    throw new PartnershipError("INVALID_STATUS", `Cannot accept an invitation with status '${partnership.status}'`);
  }

  // Check max 1 accepted partnership for the invitee
  const [inviteeAccepted] = await db
    .select({ id: userPartnerships.id })
    .from(userPartnerships)
    .where(
      and(
        eq(userPartnerships.status, "accepted"),
        or(
          eq(userPartnerships.inviterId, userId),
          eq(userPartnerships.inviteeId, userId),
        ),
      ),
    )
    .limit(1);

  if (inviteeAccepted) {
    throw new PartnershipError("MAX_PARTNERSHIPS", "You already have an active partnership");
  }

  const [updated] = await db
    .update(userPartnerships)
    .set({ status: "accepted" })
    .where(eq(userPartnerships.id, partnershipId))
    .returning();

  // Fire-and-forget email to inviter
  const [inviterProfile] = await db
    .select({ email: userProfiles.email, displayName: userProfiles.displayName })
    .from(userProfiles)
    .where(eq(userProfiles.id, partnership.inviterId))
    .limit(1);

  const [inviteeProfile] = await db
    .select({ email: userProfiles.email, displayName: userProfiles.displayName })
    .from(userProfiles)
    .where(eq(userProfiles.id, userId))
    .limit(1);

  if (inviterProfile?.email) {
    const acceptedEmailData: PartnerInvitationAcceptedEmailData = {
      userEmail: inviterProfile.email,
      locale: "en",
      inviteeName: inviteeProfile?.displayName ?? inviteeProfile?.email ?? "Your partner",
      appUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://meal-maestro.com"}/account`,
    };
    emailService
      .sendLocalizedEmail("partner-invitation-accepted", acceptedEmailData)
      .catch((err: unknown) => {
        console.warn("[PartnershipService] Failed to send acceptance email:", err);
      });
  }

  return {
    id: updated.id,
    inviter_id: updated.inviterId,
    invitee_id: updated.inviteeId,
    invitee_email: updated.inviteeEmail,
    status: updated.status,
    created_at: updated.createdAt?.toISOString() ?? "",
    updated_at: updated.updatedAt?.toISOString() ?? "",
    partner_display_name: inviterProfile?.displayName ?? null,
    partner_avatar_url: null,
    partner_email: inviterProfile?.email ?? null,
    is_inviter: false,
  };
}

export async function declineInvitation(
  userId: string,
  partnershipId: string,
): Promise<void> {
  const [partnership] = await db
    .select({ inviteeId: userPartnerships.inviteeId, status: userPartnerships.status })
    .from(userPartnerships)
    .where(eq(userPartnerships.id, partnershipId))
    .limit(1);

  if (!partnership) {
    throw new PartnershipError("NOT_FOUND", "Invitation not found");
  }

  if (partnership.inviteeId !== userId) {
    throw new PartnershipError("FORBIDDEN", "Only the invitee can decline this invitation");
  }

  if (partnership.status !== "pending") {
    throw new PartnershipError("INVALID_STATUS", `Cannot decline an invitation with status '${partnership.status}'`);
  }

  await db
    .update(userPartnerships)
    .set({ status: "declined" })
    .where(eq(userPartnerships.id, partnershipId));
}

export async function cancelInvitation(
  userId: string,
  partnershipId: string,
): Promise<void> {
  const [partnership] = await db
    .select({ inviterId: userPartnerships.inviterId, status: userPartnerships.status })
    .from(userPartnerships)
    .where(eq(userPartnerships.id, partnershipId))
    .limit(1);

  if (!partnership) {
    throw new PartnershipError("NOT_FOUND", "Invitation not found");
  }

  if (partnership.inviterId !== userId) {
    throw new PartnershipError("FORBIDDEN", "Only the inviter can cancel this invitation");
  }

  if (partnership.status !== "pending") {
    throw new PartnershipError("INVALID_STATUS", `Cannot cancel an invitation with status '${partnership.status}'`);
  }

  await db
    .update(userPartnerships)
    .set({ status: "cancelled" })
    .where(eq(userPartnerships.id, partnershipId));
}

export async function unlinkPartner(
  userId: string,
  partnershipId: string,
  copyRecipes: boolean,
): Promise<void> {
  const [partnership] = await db
    .select()
    .from(userPartnerships)
    .where(eq(userPartnerships.id, partnershipId))
    .limit(1);

  if (!partnership) {
    throw new PartnershipError("NOT_FOUND", "Partnership not found");
  }

  if (partnership.inviterId !== userId && partnership.inviteeId !== userId) {
    throw new PartnershipError("FORBIDDEN", "You are not a party to this partnership");
  }

  if (partnership.status !== "accepted") {
    throw new PartnershipError("INVALID_STATUS", "Only accepted partnerships can be unlinked");
  }

  const partnerId =
    partnership.inviterId === userId ? partnership.inviteeId : partnership.inviterId;

  if (copyRecipes) {
    await copyPartnerRecipes(userId, partnerId, partnershipId);
  } else {
    await db
      .delete(userPartnerships)
      .where(eq(userPartnerships.id, partnershipId));
  }
}

/**
 * Unified removal: cancels a pending invitation (inviter only) or
 * unlinks an accepted partnership (either party). Handles both cases
 * so the API route doesn't need to branch.
 */
export async function removePartnership(
  userId: string,
  partnershipId: string,
  copyRecipes: boolean,
): Promise<void> {
  const [partnership] = await db
    .select({ inviterId: userPartnerships.inviterId, inviteeId: userPartnerships.inviteeId, status: userPartnerships.status })
    .from(userPartnerships)
    .where(eq(userPartnerships.id, partnershipId))
    .limit(1);

  if (!partnership) {
    throw new PartnershipError("NOT_FOUND", "Partnership not found");
  }

  if (partnership.inviterId !== userId && partnership.inviteeId !== userId) {
    throw new PartnershipError("FORBIDDEN", "You are not a party to this partnership");
  }

  if (partnership.status === "pending") {
    // Only the inviter can cancel a pending invitation
    if (partnership.inviterId !== userId) {
      throw new PartnershipError("FORBIDDEN", "Only the inviter can cancel a pending invitation");
    }
    await db.update(userPartnerships).set({ status: "cancelled" }).where(eq(userPartnerships.id, partnershipId));
    return;
  }

  if (partnership.status === "accepted") {
    await unlinkPartner(userId, partnershipId, copyRecipes);
    return;
  }

  throw new PartnershipError("INVALID_STATUS", `Cannot remove a partnership with status '${partnership.status}'`);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function copyPartnerRecipes(
  targetUserId: string,
  sourceUserId: string,
  partnershipId: string,
): Promise<void> {
  // Import lazily to avoid circular dependency issues
  const { ImageService } = await import("@/lib/image-service");
  const imageService = new ImageService();

  const partnerRecipes = await db
    .select()
    .from(recipes)
    .where(eq(recipes.userId, sourceUserId));

  // Build new recipe rows with copied images where possible
  const newRecipes = await Promise.all(
    partnerRecipes.map(async (recipe) => {
      let newImageUrl: string | null = recipe.imageUrl;

      if (recipe.imageUrl) {
        try {
          newImageUrl = await imageService.copyImageForUser(
            recipe.imageUrl,
            sourceUserId,
            targetUserId,
            recipe.id,
          );
        } catch (err) {
          console.warn(
            `[PartnershipService] Failed to copy image for recipe ${recipe.id}:`,
            err,
          );
          newImageUrl = recipe.imageUrl; // fall back to original URL
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: _id, userId: _userId, createdAt: _c, updatedAt: _u, ...rest } = recipe;

      return {
        ...rest,
        userId: targetUserId,
        imageUrl: newImageUrl,
        imageMetadata: recipe.imageMetadata,
      };
    }),
  );

  // Transaction: insert copies + delete partnership
  await db.transaction(async (tx) => {
    if (newRecipes.length > 0) {
      await tx.insert(recipes).values(newRecipes);
    }
    await tx.delete(userPartnerships).where(eq(userPartnerships.id, partnershipId));
  });
}

// ---------------------------------------------------------------------------
// Error class
// ---------------------------------------------------------------------------

export type PartnershipErrorCode =
  | "NO_USER_FOUND"
  | "SELF_INVITE"
  | "DUPLICATE_INVITE"
  | "ALREADY_PARTNERED"
  | "MAX_PARTNERSHIPS"
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "INVALID_STATUS";

export class PartnershipError extends Error {
  constructor(
    public readonly code: PartnershipErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "PartnershipError";
  }
}
