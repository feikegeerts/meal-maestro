// Partnership status mirrors the DB enum
export type PartnershipStatus = "pending" | "accepted" | "declined" | "cancelled";

// API response shape (snake_case, matches frontend convention)
export interface PartnershipResponse {
  id: string;
  inviter_id: string;
  invitee_id: string;
  invitee_email: string;
  status: PartnershipStatus;
  created_at: string;
  updated_at: string;
  // Resolved profile info for the *other* party (populated by service)
  partner_display_name: string | null;
  partner_avatar_url: string | null;
  partner_email: string | null;
  /** Whether the current user is the inviter */
  is_inviter: boolean;
}

export interface PartnershipsListResponse {
  partnerships: PartnershipResponse[];
}

export interface SendInvitationRequest {
  email: string;
}

export interface RespondToInvitationRequest {
  action: "accept" | "decline";
}

export interface UnlinkPartnerRequest {
  copy_recipes?: boolean;
}
