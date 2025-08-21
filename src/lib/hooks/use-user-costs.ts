import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';

interface UserCostData {
  totalCost: number;
  totalCalls: number;
  totalTokens: number;
  userId: string;
}

interface UseUserCostsReturn {
  data: UserCostData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useUserCosts(): UseUserCostsReturn {
  const { user } = useAuth();
  const [data, setData] = useState<UserCostData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCosts = useCallback(async (retryCount = 0) => {
    if (!user) {
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/user/usage-cost', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        // If unauthorized and first attempt, wait for auth flow to complete and retry once
        if (response.status === 401 && retryCount === 0) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
          return fetchCosts(1); // Retry once
        }
        throw new Error(`Failed to fetch costs: ${response.status}`);
      }

      const costData = await response.json();
      setData(costData);
    } catch (err) {
      console.error('🔴 [useUserCosts] Error fetching user costs:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      // Set default values on error
      setData({
        totalCost: 0,
        totalCalls: 0,
        totalTokens: 0,
        userId: user.id
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch costs on mount and when user changes
  useEffect(() => {
    fetchCosts();
  }, [fetchCosts]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      fetchCosts();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [fetchCosts, user]);

  return {
    data,
    loading,
    error,
    refetch: () => fetchCosts()
  };
}