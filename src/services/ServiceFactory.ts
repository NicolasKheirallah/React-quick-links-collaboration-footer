import { BaseComponentContext } from '@microsoft/sp-component-base';
import { Log } from '@microsoft/sp-core-library';
import { IFooterConfiguration } from './configuration/ConfigurationService';
import { ISharedLink, IPersonalLink } from './types/FooterTypes';
import { GlobalLinksService } from './sharepoint/GlobalLinksService';

const LOG_SOURCE: string = 'ServiceFactory';

import { IContextualMenuItem } from '@fluentui/react/lib/ContextualMenu';

export interface IFooterService {
  getSharedLinks(): Promise<ISharedLink[]>;
  getPersonalLinks(): Promise<IPersonalLink[]>;
  savePersonalLinks(links: IPersonalLink[]): Promise<boolean>;
  getSharedMenuItems(): Promise<IContextualMenuItem[]>;
  getPersonalMenuItems(): Promise<IContextualMenuItem[]>;
  
  // Optional methods for managing organization links (available in HybridFooterService and SimpleSharePointFooterService)
  deleteGlobalLink?(linkId: number): Promise<boolean>;
  deleteGlobalLinks?(linkIds: number[]): Promise<boolean>;
  updateGlobalLink?(linkId: number, linkData: Partial<ISharedLink>): Promise<boolean>;
  addGlobalLink?(linkData: Partial<ISharedLink>): Promise<boolean>;
}

export class ServiceFactory {
  /**
   * Creates the appropriate footer service based on configuration
   */
  public static async createFooterService(
    context: BaseComponentContext,
    config: IFooterConfiguration
  ): Promise<IFooterService> {
    const { storageType } = config;
    
    Log.info(LOG_SOURCE, `Creating footer service for storage type: ${storageType}`);

    try {
      switch (storageType) {
        case 'sharepoint-lists': {
          // Use the robust GlobalLinksService (SharePoint Lists with PnP JS)
          const service = new GlobalLinksService(context, config.homeSiteUrl);
          
          // Initialize if needed
          if (config.autoCreateLists) {
            await service.initialize?.();
          }
          
          return service;
        }

        case 'legacy-taxonomy': {
          // Use legacy taxonomy/user profile services
          const { LegacyFooterService } = await import('./legacy/LegacyFooterService');
          return new LegacyFooterService(context, config);
        }


        case 'hybrid': {
          // Use hybrid OneDrive + SharePoint service (new architecture)
          const { HybridFooterService } = await import('./HybridFooterService');
          const graphClient = await context.msGraphClientFactory.getClient('3');
          const hybridService = new HybridFooterService(context, graphClient, config.homeSiteUrl);
          await hybridService.initialize();
          return hybridService;
        }

        default:
          throw new Error(`Unsupported storage type: ${storageType}`);
      }
    } catch (error) {
      Log.error(LOG_SOURCE, error as Error);
      
      // Fallback to GlobalLinksService (SharePoint Lists service)
      Log.warn(LOG_SOURCE, 'Falling back to GlobalLinksService');
      const fallbackService = new GlobalLinksService(context);
      try {
        await fallbackService.initialize?.();
      } catch (initError) {
        Log.warn(LOG_SOURCE, `Failed to initialize fallback service: ${(initError as Error).message}`);
      }
      return fallbackService;
    }
  }

}