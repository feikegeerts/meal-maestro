"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { partnershipClientService } from "@/lib/partnership-client-service";
import type {
  PartnershipResponse,
  RespondToInvitationRequest,
  UnlinkPartnerRequest,
} from "@/lib/partnership-types";

export const PARTNERSHIPS_KEY = ["partnerships"] as const;

export function usePartnershipsQuery() {
  return useQuery({
    queryKey: PARTNERSHIPS_KEY,
    queryFn: () => partnershipClientService.getPartnerships(),
    staleTime: 1000 * 60, // 1 minute
  });
}

export function useSendInvitationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (email: string) =>
      partnershipClientService.sendInvitation({ email }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PARTNERSHIPS_KEY });
    },
  });
}

export function useRespondToInvitationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      partnershipId,
      body,
    }: {
      partnershipId: string;
      body: RespondToInvitationRequest;
    }) => partnershipClientService.respondToInvitation(partnershipId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PARTNERSHIPS_KEY });
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
    },
  });
}

export function useRemovePartnershipMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      partnershipId,
      body,
    }: {
      partnershipId: string;
      body?: UnlinkPartnerRequest;
    }) => partnershipClientService.removePartnership(partnershipId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PARTNERSHIPS_KEY });
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
    },
  });
}

// Derived selectors
export function useAcceptedPartnership(
  partnerships: PartnershipResponse[] | undefined,
): PartnershipResponse | undefined {
  return partnerships?.find((p) => p.status === "accepted");
}

export function usePendingReceivedInvitations(
  partnerships: PartnershipResponse[] | undefined,
): PartnershipResponse[] {
  return (
    partnerships?.filter((p) => p.status === "pending" && !p.is_inviter) ?? []
  );
}

export function usePendingSentInvitations(
  partnerships: PartnershipResponse[] | undefined,
): PartnershipResponse[] {
  return (
    partnerships?.filter((p) => p.status === "pending" && p.is_inviter) ?? []
  );
}
