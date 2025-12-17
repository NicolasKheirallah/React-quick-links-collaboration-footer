import { BaseComponentContext } from '@microsoft/sp-component-base';
import { Log } from '@microsoft/sp-core-library';
import { MSGraphClientV3 } from '@microsoft/sp-http';
import { IFooterService } from './ServiceFactory';
import { IPersonalLink, ISharedLink, IGlobalLink } from './types/FooterTypes';
import { OneDrivePersonalLinksService } from './graph/OneDrivePersonalLinksService';
import { GlobalLinksService } from './sharepoint/GlobalLinksService';
import { IContextualMenuItem } from '@fluentui/react/lib/ContextualMenu';
import { cacheService, CacheKeys } from './performance/CacheService';
import { MonitorPerformance, withPerformanceMonitoring } from './performance/PerformanceMonitorService';

const LOG_SOURCE: string = 'HybridFooterService';

/**
 * Hybrid service that combines OneDrive personal links with SharePoint global links
 * This implements the new architecture requested by the user:
 * - Personal links stored as JSON on OneDrive
 * - Global links stored in SharePoint List with mandatory/optional flags
 */
export class HybridFooterService implements IFooterService {
  private oneDriveService: OneDrivePersonalLinksService;
  private globalLinksService: GlobalLinksService;
  private context: BaseComponentContext;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(
    context: BaseComponentContext,
    graphClient: MSGraphClientV3,
    homeSiteUrl?: string
  ) {
    this.context = context;
    this.oneDriveService = new OneDrivePersonalLinksService(context, graphClient);
    this.globalLinksService = new GlobalLinksService(context, homeSiteUrl);
    Log.info(LOG_SOURCE, 'HybridFooterService initialized with OneDrive + SharePoint architecture');
  }

  /**
   * Get shared links from SharePoint (mandatory + user selected optional links)
   */
  @MonitorPerformance('HybridFooterService.getSharedLinks')
  public async getSharedLinks(): Promise<ISharedLink[]> {
    const userEmail = this.context.pageContext.user.email;
    const cacheKey = CacheKeys.userSpecific(CacheKeys.SHARED_LINKS, userEmail);
    
    return withPerformanceMonitoring('getSharedLinks', async () => {
      try {
        
        // Check cache first (normal behavior restored)
        const cachedLinks = await cacheService.get<ISharedLink[]>(cacheKey);
        if (cachedLinks && cachedLinks.length > 1) { // Only use cache if it has multiple links (avoid old single-link cache)
          Log.info(LOG_SOURCE, `Retrieved ${cachedLinks.length} shared links from cache`);
          return cachedLinks;
        }

        // Get all available global links
        const allGlobalLinks = await this.globalLinksService.getAllGlobalLinks();
        
        // NEW LOGIC: Show ALL links by default (mandatory + all optional)
        // Get user's deselected links (links they chose to hide)
        const deselectedLinkIds = await this.getUserLinkDeselections();
        const deselectedIdSet = new Set(deselectedLinkIds);
        
        
        const applicableLinks = allGlobalLinks.filter(link => {
          const isMandatory = link.isMandatory;
          const isDeselected = deselectedIdSet.has(link.id);
          
          // Show link if: mandatory OR (optional AND not deselected by user)
          const shouldInclude = isMandatory || !isDeselected;
          
          return shouldInclude;
        });
        
        
        // Convert IGlobalLink[] to ISharedLink[] for compatibility
        const sharedLinks: ISharedLink[] = applicableLinks.map(link => ({
          id: link.id,
          title: link.title,
          url: link.url,
          description: link.description,
          iconName: link.iconName,
          iconUrl: link.iconUrl,
          order: link.order,
          isActive: link.isActive,
          category: link.category // 🚨 FIX: Include category so CategoryPillDropdowns can group them properly
        }));


        // Cache the results
        await cacheService.set(cacheKey, sharedLinks, this.CACHE_TTL);

        Log.info(LOG_SOURCE, `Retrieved ${sharedLinks.length} shared links (${allGlobalLinks.filter(l => l.isMandatory).length} mandatory, ${sharedLinks.length - allGlobalLinks.filter(l => l.isMandatory).length} selected)`);
        return sharedLinks;
      } catch (error) {
        Log.error(LOG_SOURCE, error as Error);
        return [];
      }
    });
  }

  /**
   * Get personal links from OneDrive JSON file
   */
  @MonitorPerformance('HybridFooterService.getPersonalLinks')
  public async getPersonalLinks(): Promise<IPersonalLink[]> {
    const userEmail = this.context.pageContext.user.email;
    const cacheKey = CacheKeys.userSpecific(CacheKeys.PERSONAL_LINKS, userEmail);
    
    return withPerformanceMonitoring('getPersonalLinks', async () => {
      try {
        // Try to get from cache first
        const cachedLinks = await cacheService.get<IPersonalLink[]>(cacheKey);
        if (cachedLinks) {
          Log.info(LOG_SOURCE, `Retrieved ${cachedLinks.length} personal links from cache`);
          return cachedLinks;
        }

        const personalLinks = await this.oneDriveService.getPersonalLinks();
        
        // Cache the results
        await cacheService.set(cacheKey, personalLinks, this.CACHE_TTL);
        
        Log.info(LOG_SOURCE, `Retrieved ${personalLinks.length} personal links from OneDrive service`);
        return personalLinks;
      } catch (error) {
        Log.error(LOG_SOURCE, error as Error);
        return [];
      }
    });
  }

  /**
   * Save personal links to OneDrive JSON file
   */
  @MonitorPerformance('HybridFooterService.savePersonalLinks')
  public async savePersonalLinks(links: IPersonalLink[]): Promise<boolean> {
    return withPerformanceMonitoring('savePersonalLinks', async () => {
      try {
        const success = await this.oneDriveService.savePersonalLinks(links);
        if (success) {
          // Invalidate cache after successful save
          const userEmail = this.context.pageContext.user.email;
          const cacheKey = CacheKeys.userSpecific(CacheKeys.PERSONAL_LINKS, userEmail);
          await cacheService.invalidate(cacheKey);
          
          Log.info(LOG_SOURCE, `Successfully saved ${links.length} personal links to OneDrive`);
        }
        return success;
      } catch (error) {
        Log.error(LOG_SOURCE, error as Error);
        return false;
      }
    });
  }

  /**
   * Initialize both services
   */
  /**
   * Initialize both services
   */
  public async initialize(): Promise<{ status: 'success' | 'partial' | 'failure'; details: { oneDrive: boolean; sharePoint: boolean; error?: string } }> {
    const details = { oneDrive: false, sharePoint: false };
    
    try {
      Log.info(LOG_SOURCE, 'Initializing hybrid footer service');
      
      // Initialize services with individual error handling
      const oneDrivePromise = this.oneDriveService.initialize()
        .then(() => { details.oneDrive = true; })
        .catch(error => {
          Log.warn(LOG_SOURCE, `OneDrive service initialization failed: ${(error as Error).message}`);
        });

      const globalLinksPromise = this.globalLinksService.initialize()
        .then(() => { details.sharePoint = true; })
        .catch(error => {
          Log.warn(LOG_SOURCE, `Global links service initialization failed: ${(error as Error).message}`);
        });

      await Promise.all([oneDrivePromise, globalLinksPromise]);

      if (details.oneDrive && details.sharePoint) {
        Log.info(LOG_SOURCE, 'Hybrid footer service initialization completed successfully');
        return { status: 'success', details };
      } else if (details.oneDrive || details.sharePoint) {
        Log.warn(LOG_SOURCE, 'Hybrid footer service initialization completed with warnings');
        return { status: 'partial', details };
      } else {
        Log.error(LOG_SOURCE, new Error('All hybrid services failed to initialize'));
        return { status: 'failure', details };
      }
    } catch (error) {
      Log.error(LOG_SOURCE, error as Error);
      return { 
        status: 'failure', 
        details: { ...details, error: (error as Error).message } 
      };
    }
  }

  /**
   * Get the global links service for managing link selections
   */
  public getGlobalLinksService(): GlobalLinksService {
    return this.globalLinksService;
  }

  /**
   * Get the OneDrive service for managing personal links
   */
  public getOneDriveService(): OneDrivePersonalLinksService {
    return this.oneDriveService;
  }

  /**
   * Get all available global links (for the selection dialog)
   */
  @MonitorPerformance('HybridFooterService.getAllGlobalLinks')
  public async getAllGlobalLinks(): Promise<IGlobalLink[]> {
    const cacheKey = CacheKeys.SHARED_LINKS + ':all';
    
    return withPerformanceMonitoring('getAllGlobalLinks', async () => {
      try {
        // Try to get from cache first
        const cachedLinks = await cacheService.get<IGlobalLink[]>(cacheKey);
        if (cachedLinks) {
          Log.info(LOG_SOURCE, `Retrieved ${cachedLinks.length} global links from cache`);
          return cachedLinks;
        }

        const globalLinks = await this.globalLinksService.getAllGlobalLinks();
        
        // Cache the results
        await cacheService.set(cacheKey, globalLinks, this.CACHE_TTL);
        
        return globalLinks;
      } catch (error) {
        Log.error(LOG_SOURCE, error as Error);
        return [];
      }
    });
  }

  /**
   * Get user's current link selections from OneDrive JSON
   */
  @MonitorPerformance('HybridFooterService.getUserLinkSelections')
  public async getUserLinkSelections(): Promise<number[]> {
    const userEmail = this.context.pageContext.user.email;
    const cacheKey = CacheKeys.userSpecific('user-selections', userEmail);
    
    return withPerformanceMonitoring('getUserLinkSelections', async () => {
      try {
        // Try to get from cache first
        const cachedSelections = await cacheService.get<number[]>(cacheKey);
        if (cachedSelections) {
          Log.info(LOG_SOURCE, `Retrieved ${cachedSelections.length} user selected link IDs from cache`);
          return cachedSelections;
        }

        const selectedLinkIds = await this.oneDriveService.getUserSelectedGlobalLinks();
        
        // Cache the results
        await cacheService.set(cacheKey, selectedLinkIds, this.CACHE_TTL);
        
        Log.info(LOG_SOURCE, `Retrieved ${selectedLinkIds.length} user selected link IDs from OneDrive JSON`);
        return selectedLinkIds;
      } catch (error) {
        Log.error(LOG_SOURCE, error as Error);
        return [];
      }
    });
  }

  /**
   * Save user's link selections to OneDrive JSON
   */
  @MonitorPerformance('HybridFooterService.saveUserLinkSelections')
  public async saveUserLinkSelections(selectedLinkIds: number[]): Promise<boolean> {
    return withPerformanceMonitoring('saveUserLinkSelections', async () => {
      try {
        const success = await this.oneDriveService.saveUserSelectedGlobalLinks(selectedLinkIds);
        if (success) {
          // Invalidate related caches after successful save
          const userEmail = this.context.pageContext.user.email;
          await Promise.all([
            cacheService.invalidate(CacheKeys.userSpecific('user-selections', userEmail)),
            cacheService.invalidate(CacheKeys.userSpecific(CacheKeys.SHARED_LINKS, userEmail))
          ]);
          
          Log.info(LOG_SOURCE, `Successfully saved ${selectedLinkIds.length} user selected link IDs to OneDrive JSON`);
        }
        return success;
      } catch (error) {
        Log.error(LOG_SOURCE, error as Error);
        return false;
      }
    });
  }

  /**
   * Get user's deselected link IDs (links they chose to hide) from OneDrive JSON
   */
  @MonitorPerformance('HybridFooterService.getUserLinkDeselections')
  public async getUserLinkDeselections(): Promise<number[]> {
    const userEmail = this.context.pageContext.user.email;
    const cacheKey = CacheKeys.userSpecific('user-deselections', userEmail);
    
    return withPerformanceMonitoring('getUserLinkDeselections', async () => {
      try {
        // Try to get from cache first
        const cachedDeselections = await cacheService.get<number[]>(cacheKey);
        if (cachedDeselections) {
          Log.info(LOG_SOURCE, `Retrieved ${cachedDeselections.length} user deselected link IDs from cache`);
          return cachedDeselections;
        }

        const deselectedLinkIds = await this.oneDriveService.getUserDeselectedGlobalLinks();
        
        // Cache the results
        await cacheService.set(cacheKey, deselectedLinkIds, this.CACHE_TTL);
        
        Log.info(LOG_SOURCE, `Retrieved ${deselectedLinkIds.length} user deselected link IDs from OneDrive JSON`);
        return deselectedLinkIds;
      } catch (error) {
        Log.error(LOG_SOURCE, error as Error);
        return []; // Return empty array if error - show all links
      }
    });
  }

  /**
   * Save user's deselected link IDs to OneDrive JSON
   */
  @MonitorPerformance('HybridFooterService.saveUserLinkDeselections')
  public async saveUserLinkDeselections(deselectedLinkIds: number[]): Promise<boolean> {
    return withPerformanceMonitoring('saveUserLinkDeselections', async () => {
      try {
        const success = await this.oneDriveService.saveUserDeselectedGlobalLinks(deselectedLinkIds);
        if (success) {
          // Invalidate related caches after successful save
          const userEmail = this.context.pageContext.user.email;
          await Promise.all([
            cacheService.invalidate(CacheKeys.userSpecific('user-deselections', userEmail)),
            cacheService.invalidate(CacheKeys.userSpecific(CacheKeys.SHARED_LINKS, userEmail))
          ]);
          Log.info(LOG_SOURCE, `Successfully saved ${deselectedLinkIds.length} user deselected link IDs to OneDrive JSON`);
        }
        return success;
      } catch (error) {
        Log.error(LOG_SOURCE, error as Error);
        return false;
      }
    });
  }

  /**
   * Add a new global link
   */
  public async addGlobalLink(linkData: Partial<ISharedLink>): Promise<boolean> {
    try {
      // Convert ISharedLink to IGlobalLink format for the underlying service
      const globalLinkData: Partial<IGlobalLink> = {
        title: linkData.title,
        url: linkData.url,
        description: linkData.description,
        iconName: linkData.iconName,
        iconUrl: linkData.iconUrl,
        order: linkData.order,
        isActive: linkData.isActive,
        category: (linkData as any).category,
        isMandatory: (linkData as any).isMandatory || false
      };
      
      const success = await this.globalLinksService.addGlobalLink(globalLinkData);
      if (success) {
        // Invalidate cache after successful addition
        await cacheService.invalidate(CacheKeys.SHARED_LINKS + ':all');
        const userEmail = this.context.pageContext.user.email;
        await cacheService.invalidate(CacheKeys.userSpecific(CacheKeys.SHARED_LINKS, userEmail));
      }
      return success;
    } catch (error) {
      Log.error(LOG_SOURCE, error as Error);
      return false;
    }
  }

  /**
   * Update an existing global link
   */
  public async updateGlobalLink(linkId: number, linkData: Partial<ISharedLink>): Promise<boolean> {
    try {
      // Convert ISharedLink to IGlobalLink format for the underlying service
      const globalLinkData: Partial<IGlobalLink> = {
        title: linkData.title,
        url: linkData.url,
        description: linkData.description,
        iconName: linkData.iconName,
        iconUrl: linkData.iconUrl,
        order: linkData.order,
        isActive: linkData.isActive,
        category: (linkData as any).category
      };
      
      const success = await this.globalLinksService.updateGlobalLink(linkId, globalLinkData);
      if (success) {
        // Invalidate cache after successful update
        await cacheService.invalidate(CacheKeys.SHARED_LINKS + ':all');
        const userEmail = this.context.pageContext.user.email;
        await cacheService.invalidate(CacheKeys.userSpecific(CacheKeys.SHARED_LINKS, userEmail));
      }
      return success;
    } catch (error) {
      Log.error(LOG_SOURCE, error as Error);
      return false;
    }
  }

  /**
   * Delete a single global link
   */
  public async deleteGlobalLink(linkId: number): Promise<boolean> {
    try {
      Log.info(LOG_SOURCE, `Deleting global link via HybridFooterService: ${linkId}`);
      const success = await this.globalLinksService.deleteGlobalLink(linkId);
      if (success) {
        // Invalidate cache after successful deletion
        await cacheService.invalidate(CacheKeys.SHARED_LINKS + ':all');
        const userEmail = this.context.pageContext.user.email;
        await cacheService.invalidate(CacheKeys.userSpecific(CacheKeys.SHARED_LINKS, userEmail));
        await cacheService.invalidate(CacheKeys.userSpecific('user-selections', userEmail));
        await cacheService.invalidate(CacheKeys.userSpecific('user-deselections', userEmail));
        
        Log.info(LOG_SOURCE, `Successfully deleted global link ${linkId} and invalidated cache`);
      }
      return success;
    } catch (error) {
      Log.error(LOG_SOURCE, error as Error);
      return false;
    }
  }

  /**
   * Delete multiple global links
   */
  public async deleteGlobalLinks(linkIds: number[]): Promise<boolean> {
    try {
      Log.info(LOG_SOURCE, `Bulk deleting ${linkIds.length} global links via HybridFooterService`);
      const success = await this.globalLinksService.deleteGlobalLinks(linkIds);
      if (success) {
        // Invalidate cache after successful deletion
        await cacheService.invalidate(CacheKeys.SHARED_LINKS + ':all');
        const userEmail = this.context.pageContext.user.email;
        await cacheService.invalidate(CacheKeys.userSpecific(CacheKeys.SHARED_LINKS, userEmail));
        await cacheService.invalidate(CacheKeys.userSpecific('user-selections', userEmail));
        await cacheService.invalidate(CacheKeys.userSpecific('user-deselections', userEmail));
        
        Log.info(LOG_SOURCE, `Successfully deleted ${linkIds.length} global links and invalidated cache`);
      }
      return success;
    } catch (error) {
      Log.error(LOG_SOURCE, error as Error);
      return false;
    }
  }

  @MonitorPerformance('HybridFooterService.getSharedMenuItems')
  public async getSharedMenuItems(): Promise<IContextualMenuItem[]> {
    return withPerformanceMonitoring('getSharedMenuItems', async () => {
      try {
        
        const sharedLinks = await this.getSharedLinks();
        
        
        const menuItems = sharedLinks.map(link => ({
          key: `shared-${link.id}`,
          name: link.title,
          href: link.url,
          title: link.description,
          iconProps: { iconName: link.iconName || 'Link' },
          target: '_blank',
          data: link
        }));
        
        
        return menuItems;
      } catch (error) {
        Log.error(LOG_SOURCE, error as Error);
        return [];
      }
    });
  }

  @MonitorPerformance('HybridFooterService.getPersonalMenuItems')
  public async getPersonalMenuItems(): Promise<IContextualMenuItem[]> {
    return withPerformanceMonitoring('getPersonalMenuItems', async () => {
      try {
        const personalLinks = await this.getPersonalLinks();
        return personalLinks.map(link => ({
          key: `personal-${link.id || link.title}`,
          name: link.title,
          href: link.url,
          title: link.description,
          iconProps: { iconName: link.iconName || 'Link' },
          target: '_blank',
          data: link
        }));
      } catch (error) {
        Log.error(LOG_SOURCE, error as Error);
        return [];
      }
    });
  }
}