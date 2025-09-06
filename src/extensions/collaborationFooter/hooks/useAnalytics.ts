import { useState, useEffect, useCallback, useMemo } from 'react';
import { WebPartContext } from '@microsoft/sp-webpart-base';
import { IContextualMenuItem } from '@fluentui/react/lib/ContextualMenu';
import { 
  AnalyticsService, 
  IAnalyticsOverview, 
  ILinkUsageStats, 
  IUserStats 
} from '../services/analyticsService';
import { Log } from '@microsoft/sp-core-library';

const LOG_SOURCE: string = 'useAnalytics';

export interface IAnalyticsHook {
  analyticsOverview: IAnalyticsOverview | null;
  linkStats: ILinkUsageStats[];
  userStats: IUserStats[];
  isLoading: boolean;
  
  trackLinkClick: (link: IContextualMenuItem) => Promise<void>;
  refreshAnalytics: () => Promise<void>;
  exportAnalytics: () => Promise<string>;
  clearAnalytics: () => Promise<void>;
  getAnalyticsDataSize: () => Promise<{events: number, sizeKB: number}>;
  
  getLinkStats: (linkId: string) => ILinkUsageStats | null;
  isLinkPopular: (linkId: string, threshold?: number) => boolean;
  getUserStats: (userId: string) => IUserStats | null;
  getMostPopularLinks: (count?: number) => ILinkUsageStats[];
  getMostActiveUsers: (count?: number) => IUserStats[];
}

export const useAnalytics = (
  context?: WebPartContext,
  autoRefresh = false,
  refreshInterval = 60000 // 1 minute
): IAnalyticsHook => {
  const [analyticsOverview, setAnalyticsOverview] = useState<IAnalyticsOverview | null>(null);
  const [linkStats, setLinkStats] = useState<ILinkUsageStats[]>([]);
  const [userStats, setUserStats] = useState<IUserStats[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshAnalytics = useCallback(async () => {
    if (!context) return;

    try {
      setIsLoading(true);
      
      const [overview, links, users] = await Promise.all([
        AnalyticsService.getAnalyticsOverview(),
        AnalyticsService.getAllLinkStats(),
        AnalyticsService.getAllUserStats()
      ]);
      
      setAnalyticsOverview(overview);
      setLinkStats(links);
      setUserStats(users);
      
      Log.info(LOG_SOURCE, 'Analytics data refreshed');
      
    } catch (error) {
      Log.error(LOG_SOURCE, error as Error);
      setAnalyticsOverview(null);
      setLinkStats([]);
      setUserStats([]);
    } finally {
      setIsLoading(false);
    }
  }, [context]);

  const trackLinkClick = useCallback(async (link: IContextualMenuItem) => {
    if (!context) return;

    try {
      await AnalyticsService.trackLinkClick(link, context);
      Log.info(LOG_SOURCE, `Tracked click for link: ${link.name}`);
    } catch (error) {
      Log.error(LOG_SOURCE, error as Error);
    }
  }, [context]);

  const exportAnalytics = useCallback(async (): Promise<string> => {
    try {
      return await AnalyticsService.exportAnalyticsCSV();
    } catch (error) {
      Log.error(LOG_SOURCE, error as Error);
      throw error;
    }
  }, []);

  const clearAnalytics = useCallback(async (): Promise<void> => {
    try {
      await AnalyticsService.clearAnalyticsData();
      await refreshAnalytics();
      Log.info(LOG_SOURCE, 'Analytics data cleared');
    } catch (error) {
      Log.error(LOG_SOURCE, error as Error);
      throw error;
    }
  }, [refreshAnalytics]);

  const getAnalyticsDataSize = useCallback(async (): Promise<{events: number, sizeKB: number}> => {
    try {
      return await AnalyticsService.getAnalyticsDataSize();
    } catch (error) {
      Log.error(LOG_SOURCE, error as Error);
      return {events: 0, sizeKB: 0};
    }
  }, []);

  const getLinkStats = useCallback((linkId: string): ILinkUsageStats | null => {
    return linkStats.find(stat => stat.linkId === linkId) || null;
  }, [linkStats]);

  const isLinkPopular = useCallback((linkId: string, threshold = 50): boolean => {
    const stats = getLinkStats(linkId);
    return stats ? stats.popularityScore >= threshold : false;
  }, [getLinkStats]);

  const getUserStats = useCallback((userId: string): IUserStats | null => {
    return userStats.find(stat => stat.userId === userId) || null;
  }, [userStats]);

  const getMostPopularLinks = useCallback((count = 10): ILinkUsageStats[] => {
    return linkStats
      .sort((a, b) => b.popularityScore - a.popularityScore)
      .slice(0, count);
  }, [linkStats]);

  const getMostActiveUsers = useCallback((count = 10): IUserStats[] => {
    return userStats
      .sort((a, b) => b.totalClicks - a.totalClicks)
      .slice(0, count);
  }, [userStats]);

  useEffect(() => {
    refreshAnalytics();
  }, [refreshAnalytics]);

  useEffect(() => {
    if (!autoRefresh || !context) return;

    const intervalId = setInterval(refreshAnalytics, refreshInterval);
    return () => clearInterval(intervalId);
  }, [autoRefresh, refreshInterval, refreshAnalytics, context]);

  const hookValue = useMemo((): IAnalyticsHook => ({
    analyticsOverview,
    linkStats,
    userStats,
    isLoading,
    
    trackLinkClick,
    refreshAnalytics,
    exportAnalytics,
    clearAnalytics,
    getAnalyticsDataSize,
    
    getLinkStats,
    isLinkPopular,
    getUserStats,
    getMostPopularLinks,
    getMostActiveUsers
  }), [
    analyticsOverview,
    linkStats,
    userStats,
    isLoading,
    trackLinkClick,
    refreshAnalytics,
    exportAnalytics,
    clearAnalytics,
    getAnalyticsDataSize,
    getLinkStats,
    isLinkPopular,
    getUserStats,
    getMostPopularLinks,
    getMostActiveUsers
  ]);

  return hookValue;
};