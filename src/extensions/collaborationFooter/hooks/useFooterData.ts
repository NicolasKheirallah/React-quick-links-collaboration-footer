import { useState, useCallback, useEffect } from 'react';
import { Log } from '@microsoft/sp-core-library';
import { IContextualMenuItem } from '@fluentui/react/lib/ContextualMenu';
import { IFooterService } from '../../../services/ServiceFactory';
import { AnalyticsService } from '../services/analyticsService';
import { IUserSettings, ClickBehavior } from '../types/UserSettings';

const LOG_SOURCE: string = 'useFooterData';

export const useFooterData = (
  footerService: IFooterService | undefined,
  userSettings: { settings: IUserSettings },
  userId: string,
  initialMyLinks: IContextualMenuItem[] = [],
  sharedLinks: IContextualMenuItem[] = []
) => {
  const [myLinks, setMyLinks] = useState<IContextualMenuItem[]>(initialMyLinks);
  const [organizationLinks, setOrganizationLinks] = useState<IContextualMenuItem[]>(sharedLinks);
  const [allAvailableOrgLinks, setAllAvailableOrgLinks] = useState<IContextualMenuItem[]>([]);
  const [recentLinks, setRecentLinks] = useState<IContextualMenuItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true); // Start as loading by default

  const CACHE_KEY_PREFIX = 'react-quick-links-cache-v1-';
  // Calculate cache TTL from settings (minutes -> milliseconds)
  const CACHE_TTL = (userSettings.settings.cacheDuration || 60) * 60 * 1000;

  // Helper to load from local storage
  const loadFromCache = useCallback(() => {
    try {
      const myLinksCache = localStorage.getItem(`${CACHE_KEY_PREFIX}myLinks`);
      const orgLinksCache = localStorage.getItem(`${CACHE_KEY_PREFIX}orgLinks`);
      const allOrgLinksCache = localStorage.getItem(`${CACHE_KEY_PREFIX}allOrgLinks`);
      const recentLinksCache = localStorage.getItem(`${CACHE_KEY_PREFIX}recentLinks_${userId}`);
      const timestamp = localStorage.getItem(`${CACHE_KEY_PREFIX}timestamp`);

      if (timestamp && (Date.now() - parseInt(timestamp, 10) < CACHE_TTL)) {
        if (myLinksCache) setMyLinks(JSON.parse(myLinksCache));
        if (orgLinksCache) setOrganizationLinks(JSON.parse(orgLinksCache));
        if (allOrgLinksCache) setAllAvailableOrgLinks(JSON.parse(allOrgLinksCache));
        if (recentLinksCache) setRecentLinks(JSON.parse(recentLinksCache));
        Log.info(LOG_SOURCE, 'Loaded data from client-side cache');
        return true;
      }
    } catch (e) {
      Log.warn(LOG_SOURCE, 'Failed to load from cache');
    }
    return false;
  }, [CACHE_TTL, userId]);

  const saveToCache = useCallback((
    newMyLinks: IContextualMenuItem[], 
    newOrgLinks: IContextualMenuItem[],
    newAllOrgLinks: IContextualMenuItem[],
    newRecentLinks: IContextualMenuItem[]
  ) => {
    try {
      localStorage.setItem(`${CACHE_KEY_PREFIX}myLinks`, JSON.stringify(newMyLinks));
      localStorage.setItem(`${CACHE_KEY_PREFIX}orgLinks`, JSON.stringify(newOrgLinks));
      localStorage.setItem(`${CACHE_KEY_PREFIX}allOrgLinks`, JSON.stringify(newAllOrgLinks));
      localStorage.setItem(`${CACHE_KEY_PREFIX}recentLinks_${userId}`, JSON.stringify(newRecentLinks));
      localStorage.setItem(`${CACHE_KEY_PREFIX}timestamp`, Date.now().toString());
    } catch (e) {
      Log.warn(LOG_SOURCE, 'Failed to save to cache');
    }
  }, [userId]);

  const loadData = useCallback(async () => {
    try {
      if (!footerService) {
        Log.warn(LOG_SOURCE, 'Footer service not available');
        return;
      }

      // 1. Try to load from cache immediately for instant render
      if (initialMyLinks.length === 0 && sharedLinks.length === 0) {
        const hasCache = loadFromCache();
        if (hasCache) setIsLoading(false); 
      }

      setIsLoading(true);

      // Load Personal Links
      const personalLinks = await footerService.getPersonalLinks();
      const personalMenuItems = personalLinks.map((link, index) => ({
        key: `personal-${link.id || `generated-${Date.now()}-${index}`}`,
        name: link.title,
        href: link.url,
        title: link.description,
        iconProps: { iconName: link.iconName || 'Link' },
        target: userSettings.settings.clickBehavior === ClickBehavior.SameTab ? '_self' : '_blank',
        data: {
          iconUrl: link.iconUrl,
          category: link.category,
          id: link.id
        }
      }));
      setMyLinks(personalMenuItems);

      // Load Shared/Global Links
      const sharedLinksData = await footerService.getSharedLinks();
      const sharedMenuItems = sharedLinksData.map(link => ({
        key: `shared-${link.id}`,
        name: link.title,
        href: link.url,
        title: link.description,
        iconProps: { iconName: link.iconName || 'Link' },
        target: userSettings.settings.clickBehavior === ClickBehavior.SameTab ? '_self' : '_blank',
        isActive: link.isActive,
        data: {
          iconUrl: link.iconUrl,
          isMandatory: link.isMandatory || false,
          category: link.category || 'General',
          id: link.id
        }
      }));
      setOrganizationLinks(sharedMenuItems);

      // Load All Global Links (if supported)
      let allOrgMenuItems: IContextualMenuItem[] = [];
      if ('getAllGlobalLinks' in footerService) {
        const allGlobalLinks = await (footerService as any).getAllGlobalLinks();
        allOrgMenuItems = allGlobalLinks.map((link: any) => ({
          key: `global-${link.id}`,
          name: link.title,
          href: link.url,
          title: link.description,
          iconProps: { iconName: link.iconName || 'Link' },
          target: userSettings.settings.clickBehavior === ClickBehavior.SameTab ? '_self' : '_blank',
          isActive: link.isActive,
          data: {
            iconUrl: link.iconUrl,
            isMandatory: link.isMandatory || false,
            category: link.category || 'General',
            id: link.id
          }
        }));
        setAllAvailableOrgLinks(allOrgMenuItems);
      }

      // Load Recent Links
      let recentMenuItems: IContextualMenuItem[] = [];
      const count = userSettings.settings.recentItemsCount || 0;
      if (count > 0 && userId) {
        const recentEvents = await AnalyticsService.getRecentUserLinks(userId, count);
        recentMenuItems = recentEvents.map(event => ({
          key: `recent-${event.linkId}-${event.clickTimestamp}`,
          name: event.linkName,
          href: event.linkUrl,
          title: `Previously visited in ${event.linkCategory}`,
          iconProps: { iconName: 'History' },
          target: userSettings.settings.clickBehavior === ClickBehavior.SameTab ? '_self' : '_blank',
          data: {
             category: 'Recent',
             originalCategory: event.linkCategory
          }
        }));
        setRecentLinks(recentMenuItems);
      }

      // Save fresh data to cache
      saveToCache(personalMenuItems, sharedMenuItems, allOrgMenuItems, recentMenuItems);

      Log.info(LOG_SOURCE, `Loaded ${personalLinks.length} personal links, ${sharedLinksData.length} org links, ${recentMenuItems.length} recent links`);
    } catch (error) {
      Log.warn(LOG_SOURCE, `Error loading data: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  }, [footerService, userSettings.settings.clickBehavior, userSettings.settings.recentItemsCount, userId, initialMyLinks.length, sharedLinks.length, loadFromCache, saveToCache]);

  const refreshOrganizationLinks = useCallback(async () => {
    try {
      if (!footerService) return;

      Log.info(LOG_SOURCE, 'Refreshing organization links');
      const sharedLinksData = await footerService.getSharedLinks();
      const sharedMenuItems = sharedLinksData.map(link => ({
        key: `shared-${link.id}`,
        name: link.title,
        href: link.url,
        title: link.description,
        iconProps: { iconName: link.iconName || 'Link' },
        target: userSettings.settings.clickBehavior === ClickBehavior.SameTab ? '_self' : '_blank',
        isActive: link.isActive,
        data: {
          iconUrl: link.iconUrl,
          isMandatory: link.isMandatory || false,
          category: link.category || 'General',
          id: link.id
        }
      }));
      setOrganizationLinks(sharedMenuItems);
      
      // We could also refresh recent links here if we wanted 'realtime' updates of recent history?
      // For now, keep it simple.
      
    } catch (error) {
      Log.error(LOG_SOURCE, error as Error);
    }
  }, [footerService, userSettings.settings.clickBehavior]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Setup polling
  useEffect(() => {
    if (userSettings.settings.syncFrequency === 'manual') return;

    let intervalMs = 60 * 60 * 1000;
    switch (userSettings.settings.syncFrequency) {
      case 'realtime': intervalMs = 30 * 1000; break;
      case 'hourly': intervalMs = 60 * 60 * 1000; break;
      case 'daily': intervalMs = 24 * 60 * 60 * 1000; break;
    }

    const intervalId = setInterval(() => {
      Log.info(LOG_SOURCE, `Auto-refreshing data (${userSettings.settings.syncFrequency})`);
      refreshOrganizationLinks();
    }, intervalMs);

    return () => clearInterval(intervalId);
  }, [userSettings.settings.syncFrequency, refreshOrganizationLinks]);

  // Sync initial props
  useEffect(() => {
    if (initialMyLinks.length > 0 && myLinks.length === 0) setMyLinks(initialMyLinks);
  }, [initialMyLinks]);

  useEffect(() => {
    if (sharedLinks.length > 0 && organizationLinks.length === 0) setOrganizationLinks(sharedLinks);
  }, [sharedLinks]);

  return {
    myLinks,
    setMyLinks,
    organizationLinks,
    setOrganizationLinks,
    allAvailableOrgLinks,
    setAllAvailableOrgLinks,
    recentLinks,
    setRecentLinks,
    isLoading,
    loadData,
    refreshOrganizationLinks
  };
};
