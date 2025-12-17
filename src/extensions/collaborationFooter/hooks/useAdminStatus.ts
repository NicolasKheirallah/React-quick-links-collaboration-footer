import { useState, useEffect, useCallback } from 'react';
import { Log } from '@microsoft/sp-core-library';
import { WebPartContext } from '@microsoft/sp-webpart-base';

const LOG_SOURCE: string = 'useAdminStatus';

export const useAdminStatus = (context: WebPartContext, homeSiteUrl?: string) => {
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const checkAdminStatus = useCallback(() => {
    try {
      if (!context) {
        Log.warn(LOG_SOURCE, 'Context not available for admin check');
        setIsAdmin(false);
        return;
      }

      // Check if user is site admin
      const isSiteAdmin = context.pageContext.user?.isAnonymousGuestUser === false &&
                         context.pageContext.legacyPageContext?.isSiteAdmin === true;
      
      // Check if we are on the home site
      let isOnHomeSite = true; // Default to true if no homeSiteUrl checking is needed
      if (homeSiteUrl) {
        const currentSiteUrl = context.pageContext.web.absoluteUrl.toLowerCase();
        const normalizedHomeSiteUrl = homeSiteUrl.toLowerCase().replace(/\/+$/, '');
        const normalizedCurrentSiteUrl = currentSiteUrl.replace(/\/+$/, '');
        
        // Check exact match or sub-site match
        isOnHomeSite = normalizedCurrentSiteUrl === normalizedHomeSiteUrl || 
                       normalizedCurrentSiteUrl.startsWith(normalizedHomeSiteUrl + '/');
      }
      
      const isHomeSiteAdmin = isSiteAdmin && isOnHomeSite;
      setIsAdmin(!!isHomeSiteAdmin);
      
      Log.info(LOG_SOURCE, `Admin check: SiteAdmin=${isSiteAdmin}, OnHomeSite=${isOnHomeSite}, IsHomeSiteAdmin=${isHomeSiteAdmin}`);
    } catch (error) {
      Log.warn(LOG_SOURCE, `Error checking admin status: ${(error as Error).message}`);
      setIsAdmin(false);
    } finally {
      setIsLoading(false);
    }
  }, [context, homeSiteUrl]);

  useEffect(() => {
    checkAdminStatus();
  }, [checkAdminStatus]);

  return { isAdmin, isLoading, checkAdminStatus };
};
