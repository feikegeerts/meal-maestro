import { authenticatedFetch } from "@/lib/recipe-service";
import type {
  PartnershipsListResponse,
  PartnershipResponse,
  SendInvitationRequest,
  RespondToInvitationRequest,
  UnlinkPartnerRequest,
} from "@/lib/partnership-types";

export const partnershipClientService = {
  async getPartnerships(): Promise<PartnershipsListResponse> {
    const response = await authenticatedFetch("/api/partnerships");
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || "Failed to fetch partnerships");
    }
    return response.json();
  },

  async sendInvitation(body: SendInvitationRequest): Promise<PartnershipResponse> {
    const response = await authenticatedFetch("/api/partnerships", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.error || "Failed to send invitation") as Error & { code?: string };
      error.code = data.code;
      throw error;
    }
    return data.partnership;
  },

  async respondToInvitation(
    partnershipId: string,
    body: RespondToInvitationRequest,
  ): Promise<PartnershipResponse | void> {
    const response = await authenticatedFetch(`/api/partnerships/${partnershipId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || "Failed to respond to invitation");
    }
    return data.partnership;
  },

  async removePartnership(partnershipId: string, body: UnlinkPartnerRequest = {}): Promise<void> {
    const response = await authenticatedFetch(`/api/partnerships/${partnershipId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || "Failed to remove partnership");
    }
  },
};
