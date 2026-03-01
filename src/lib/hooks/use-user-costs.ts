import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";

interface UserCostData {
  totalCost: number;
  totalCalls: number;
  totalTokens: number;
  userId: string;
}

interface UseUserCostsOptions {
  lazy?: boolean;
}

interface UseUserCostsReturn {
  data: UserCostData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const FIVE_MINUTES = 5 * 60 * 1000;

export function useUserCosts(options: UseUserCostsOptions = {}): UseUserCostsReturn {
  const { user } = useAuth();

  const { data, isLoading, error, refetch } = useQuery<UserCostData>({
    queryKey: ["user-costs", user?.id],
    queryFn: async () => {
      const response = await fetch("/api/user/usage-cost", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch costs: ${response.status}`);
      }
      return response.json();
    },
    enabled: !options.lazy && !!user,
    staleTime: FIVE_MINUTES,
    refetchInterval: FIVE_MINUTES,
    retry: (failureCount, err) => {
      if (err instanceof Error && err.message.includes("401")) {
        return failureCount < 1;
      }
      return failureCount < 2;
    },
    retryDelay: (attempt) => (attempt === 0 ? 1000 : attempt * 1000),
  });

  return {
    data: data ?? null,
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
    refetch: async () => {
      await refetch();
    },
  };
}
