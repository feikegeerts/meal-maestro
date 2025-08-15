import { createClient } from '@supabase/supabase-js';
import { type UserUsageStats, type UsageStats } from './usage-tracking-service';

// Admin service with service role key for full database access
const supabaseUrl = process.env.SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseServiceKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for admin functions');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

interface ApiUsageRow {
  id: string;
  user_id: string;
  endpoint: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  tokens_used: number;
  calculated_cost: number;
  timestamp: string;
}

export class AdminUsageService {
  
  public async getAllUsersUsageStats(
    startDate?: string,
    endDate?: string
  ): Promise<UserUsageStats[]> {
    try {
      let query = supabaseAdmin
        .from('api_usage')
        .select('*')
        .order('timestamp', { ascending: false });

      if (startDate) {
        query = query.gte('timestamp', startDate);
      }
      if (endDate) {
        query = query.lte('timestamp', endDate);
      }

      const { data, error } = await query;

      if (error) {
        console.error('🔴 [AdminUsage] Error fetching all users stats:', error);
        return [];
      }

      if (!data || data.length === 0) {
        return [];
      }

      // Group data by user
      const userDataMap = new Map<string, ApiUsageRow[]>();
      data.forEach((entry: ApiUsageRow) => {
        if (!userDataMap.has(entry.user_id)) {
          userDataMap.set(entry.user_id, []);
        }
        userDataMap.get(entry.user_id)!.push(entry);
      });

      // Calculate stats for each user
      const userStats: UserUsageStats[] = [];
      userDataMap.forEach((userData, userId) => {
        const stats = this.calculateStatsFromData(userData);
        userStats.push({
          userId,
          ...stats,
          dateRange: {
            start: startDate || '',
            end: endDate || ''
          }
        });
      });

      // Sort by total cost (descending) and add ranks
      userStats.sort((a, b) => b.totalCost - a.totalCost);
      userStats.forEach((stats, index) => {
        stats.rank = index + 1;
      });

      // Detect outliers (users with >2x average usage)
      const avgCost = userStats.reduce((sum, s) => sum + s.totalCost, 0) / userStats.length;
      const avgTokens = userStats.reduce((sum, s) => sum + s.totalTokens, 0) / userStats.length;
      
      userStats.forEach(stats => {
        stats.isOutlier = stats.totalCost > (avgCost * 2) || stats.totalTokens > (avgTokens * 2);
      });

      return userStats;

    } catch (error) {
      console.error('🔴 [AdminUsage] Error in getAllUsersUsageStats:', error);
      return [];
    }
  }

  public async getUserUsageStats(
    userId: string,
    startDate?: string,
    endDate?: string
  ): Promise<UserUsageStats | null> {
    try {
      let query = supabaseAdmin
        .from('api_usage')
        .select('*')
        .eq('user_id', userId);

      if (startDate) {
        query = query.gte('timestamp', startDate);
      }
      if (endDate) {
        query = query.lte('timestamp', endDate);
      }

      const { data, error } = await query;

      if (error) {
        console.error('🔴 [AdminUsage] Error fetching user stats:', error);
        return null;
      }

      if (!data || data.length === 0) {
        return {
          userId,
          totalCalls: 0,
          totalTokens: 0,
          totalCost: 0,
          averageTokensPerCall: 0,
          averageCostPerCall: 0,
          mostUsedModel: '',
          dateRange: {
            start: startDate || '',
            end: endDate || ''
          }
        };
      }

      const stats = this.calculateStatsFromData(data);
      return {
        userId,
        ...stats,
        dateRange: {
          start: startDate || data[data.length - 1]?.timestamp || '',
          end: endDate || data[0]?.timestamp || ''
        }
      };

    } catch (error) {
      console.error('🔴 [AdminUsage] Error in getUserUsageStats:', error);
      return null;
    }
  }

  public async getUsageByTimeRange(
    startDate: string,
    endDate: string,
    groupBy: 'day' | 'hour' = 'day'
  ): Promise<Array<{
    date: string;
    totalCalls: number;
    totalTokens: number;
    totalCost: number;
    uniqueUsers: number;
  }>> {
    try {
      const { data, error } = await supabaseAdmin
        .from('api_usage')
        .select('*')
        .gte('timestamp', startDate)
        .lte('timestamp', endDate)
        .order('timestamp', { ascending: true });

      if (error) {
        console.error('🔴 [AdminUsage] Error fetching time range data:', error);
        return [];
      }

      if (!data || data.length === 0) {
        return [];
      }

      // Group by date
      const dateGroups = new Map<string, ApiUsageRow[]>();
      data.forEach((entry: ApiUsageRow) => {
        const date = groupBy === 'day' 
          ? entry.timestamp.split('T')[0] 
          : entry.timestamp.substring(0, 13); // YYYY-MM-DDTHH
        
        if (!dateGroups.has(date)) {
          dateGroups.set(date, []);
        }
        dateGroups.get(date)!.push(entry);
      });

      // Calculate stats for each date group
      const result = Array.from(dateGroups.entries()).map(([date, entries]) => {
        const uniqueUsers = new Set(entries.map(e => e.user_id)).size;
        const totalCalls = entries.length;
        const totalTokens = entries.reduce((sum, e) => sum + (e.tokens_used || 0), 0);
        const totalCost = entries.reduce((sum, e) => sum + Number(e.calculated_cost || 0), 0);

        return {
          date,
          totalCalls,
          totalTokens,
          totalCost,
          uniqueUsers
        };
      });

      return result.sort((a, b) => a.date.localeCompare(b.date));

    } catch (error) {
      console.error('🔴 [AdminUsage] Error in getUsageByTimeRange:', error);
      return [];
    }
  }

  private calculateStatsFromData(data: ApiUsageRow[]): UsageStats {
    const totalCalls = data.length;
    const totalTokens = data.reduce((sum, entry) => sum + (entry.tokens_used || 0), 0);
    const totalCost = data.reduce((sum, entry) => sum + Number(entry.calculated_cost || 0), 0);
    
    // Find most used model
    const modelCounts = new Map<string, number>();
    data.forEach(entry => {
      if (entry.model) {
        modelCounts.set(entry.model, (modelCounts.get(entry.model) || 0) + 1);
      }
    });
    
    const mostUsedModel = Array.from(modelCounts.entries())
      .sort(([,a], [,b]) => b - a)[0]?.[0] || '';

    return {
      totalCalls,
      totalTokens,
      totalCost,
      averageTokensPerCall: totalCalls > 0 ? totalTokens / totalCalls : 0,
      averageCostPerCall: totalCalls > 0 ? totalCost / totalCalls : 0,
      mostUsedModel,
      dateRange: { start: '', end: '' } // Will be filled by caller
    };
  }
}

export const adminUsageService = new AdminUsageService();