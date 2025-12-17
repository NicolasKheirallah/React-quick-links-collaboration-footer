import { BaseComponentContext } from '@microsoft/sp-component-base';
import { Log } from '@microsoft/sp-core-library';
import { spfi, SPFx } from '@pnp/sp';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';
import '@pnp/sp/fields';
import '@pnp/sp/site-users/web';
import { IFooterService } from '../ServiceFactory';
import { IPersonalLink, IGlobalLink, IUserLinkSelection, ISharedLink } from '../types/FooterTypes';
import { IContextualMenuItem } from '@fluentui/react/lib/ContextualMenu';
import { SharePointLists, GlobalLinksFields, UserSelectionFields } from './SharePointConstants';

const LOG_SOURCE: string = 'GlobalLinksService';

/**
 * Service to manage global links stored in SharePoint List on root site
 * Supports mandatory links and optional links that users can select via dashboard
 */
export class GlobalLinksService implements IFooterService {
  private sp: ReturnType<typeof spfi>;
  private homeSiteSp: ReturnType<typeof spfi>;
  private homeSiteUrl: string;

  constructor(context: BaseComponentContext, homeSiteUrl?: string) {
    this.sp = spfi().using(SPFx(context));
    
    // Determine home site URL - use provided URL, or fallback to tenant root
    if (homeSiteUrl) {
      this.homeSiteUrl = homeSiteUrl;
    } else {
      // Extract tenant root URL from current context
      const currentUrl = context.pageContext.web.absoluteUrl;
      const tenantUrl = new URL(currentUrl);
      this.homeSiteUrl = `${tenantUrl.protocol}//${tenantUrl.hostname}`;
    }
    
    // Create separate SP instance for home site operations
    this.homeSiteSp = spfi(this.homeSiteUrl).using(SPFx(context));
    
    Log.info(LOG_SOURCE, `GlobalLinksService initialized with PnP JS - Home site: ${this.homeSiteUrl}`);
  }

  /**
   * Get shared/global links that are either mandatory or selected by the current user
   */
  public async getSharedLinks(): Promise<ISharedLink[]> {
    try {
      const currentUser = await this.sp.web.currentUser();
      Log.info(LOG_SOURCE, `Getting global links for user: ${currentUser.Id}`);

      // Get all active global links
      const globalLinks = await this.getAllGlobalLinks();
      
      // Get user's link selections
      const userSelections = await this.getUserLinkSelections(currentUser.Id);
      const selectedLinkIds = new Set(
        userSelections
          .filter(selection => selection.isSelected)
          .map(selection => selection.globalLinkId)
      );

      // Return mandatory links + user selected optional links
      const applicableLinks = globalLinks.filter(link => 
        link.isMandatory || selectedLinkIds.has(link.id)
      );

      Log.info(LOG_SOURCE, `Retrieved ${applicableLinks.length} applicable global links (${globalLinks.filter(l => l.isMandatory).length} mandatory, ${applicableLinks.length - globalLinks.filter(l => l.isMandatory).length} selected)`);
      
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
        category: link.category,
        isMandatory: link.isMandatory,
        targetAudience: link.targetAudience
      }));

      return sharedLinks;
    } catch (error) {
      Log.error(LOG_SOURCE, error as Error);
      return [];
    }
  }

  /**
   * This service handles shared/global links, not personal links
   */
  public async getPersonalLinks(): Promise<IPersonalLink[]> {
    // Personal links are handled by OneDrivePersonalLinksService
    Log.info(LOG_SOURCE, 'GlobalLinksService does not provide personal links');
    return [];
  }

  /**
   * This service doesn't save personal links
   */
  public async savePersonalLinks(links: IPersonalLink[]): Promise<boolean> {
    Log.warn(LOG_SOURCE, 'GlobalLinksService does not handle personal links');
    return false;
  }

  /**
   * Get all global links from SharePoint list
   */
  public async getAllGlobalLinks(): Promise<IGlobalLink[]> {
    try {
      // Check if list exists on home site - DO NOT create automatically
      let listExists = false;
      try {
        await this.homeSiteSp.web.lists.getByTitle(SharePointLists.GlobalLinks)();
        listExists = true;
        Log.info(LOG_SOURCE, `Global links list '${SharePointLists.GlobalLinks}' found on home site: ${this.homeSiteUrl}`);
      } catch (listError) {
        Log.info(LOG_SOURCE, `Global links list '${SharePointLists.GlobalLinks}' not found on home site - will return empty array`);
        listExists = false;
      }

      if (!listExists) {
        Log.warn(LOG_SOURCE, 'Global links list is not available on home site, returning empty array');
        return [];
      }

      const list = this.homeSiteSp.web.lists.getByTitle(SharePointLists.GlobalLinks);
      let items: any[] = [];
      
      try {
        // Try basic query first to test if list is accessible
        items = await list.items
          .select('Id', 'Title')
          .top(5)();
        
        // If basic query works, try full query with correct internal field names
        if (items.length >= 0) {
          const selectFields = [
            GlobalLinksFields.Id,
            GlobalLinksFields.Title,
            GlobalLinksFields.Url,
            GlobalLinksFields.Description,
            GlobalLinksFields.IconName,
            GlobalLinksFields.IconUrl,
            GlobalLinksFields.SortOrder,
            GlobalLinksFields.Category,
            GlobalLinksFields.IsMandatory,
            GlobalLinksFields.IsActive,
            GlobalLinksFields.TargetAudience,
            GlobalLinksFields.ValidFrom,
            GlobalLinksFields.ValidTo
          ];

          items = await list.items
            .select(...selectFields)
            .filter(`(${GlobalLinksFields.IsActive} eq 1) or (${GlobalLinksFields.IsActive} eq null)`)
            .orderBy(GlobalLinksFields.IsMandatory, false)
            .orderBy(GlobalLinksFields.SortOrder, true)
            .orderBy(GlobalLinksFields.Title, true)();
        }
      } catch (queryError) {
        Log.warn(LOG_SOURCE, `Query failed: ${(queryError as Error).message}, returning empty array`);
        return [];
      }

      const globalLinks: IGlobalLink[] = items.map(item => ({
        id: item[GlobalLinksFields.Id],
        title: item[GlobalLinksFields.Title] || '',
        url: item[GlobalLinksFields.Url]?.Url || item[GlobalLinksFields.Url] || '',
        description: item[GlobalLinksFields.Description] || '',
        iconName: item[GlobalLinksFields.IconName] || 'Link',
        iconUrl: item[GlobalLinksFields.IconUrl]?.Url || item[GlobalLinksFields.IconUrl] || undefined,
        order: item[GlobalLinksFields.SortOrder] || 0,
        category: item[GlobalLinksFields.Category] || 'General',
        isMandatory: item[GlobalLinksFields.IsMandatory] === true,
        isActive: item[GlobalLinksFields.IsActive] !== false,
        targetAudience: item[GlobalLinksFields.TargetAudience] ? item[GlobalLinksFields.TargetAudience].split(';') : [],
        validFrom: item[GlobalLinksFields.ValidFrom],
        validTo: item[GlobalLinksFields.ValidTo]
      }));

      Log.info(LOG_SOURCE, `Successfully retrieved ${globalLinks.length} global links`);
      return globalLinks;
    } catch (error) {
      Log.error(LOG_SOURCE, new Error(`Error in getAllGlobalLinks: ${(error as Error).message}`));
      return [];
    }
  }

  /**
   * Get user's link selections
   */
  public async getUserLinkSelections(userId: number): Promise<IUserLinkSelection[]> {
    try {
      // Check if list exists - DO NOT create automatically  
      let listExists = false;
      try {
        await this.sp.web.lists.getByTitle(SharePointLists.UserSelections)();
        listExists = true;
        Log.info(LOG_SOURCE, `User selections list '${SharePointLists.UserSelections}' found`);
      } catch (listError) {
        Log.info(LOG_SOURCE, `User selections list '${SharePointLists.UserSelections}' not found - will return empty array`);
        listExists = false;
      }

      if (!listExists) {
        Log.warn(LOG_SOURCE, 'User selections list is not available, returning empty array');
        return [];
      }

      const list = this.sp.web.lists.getByTitle(SharePointLists.UserSelections);
      let items: any[] = [];
      
      try {
        const selectFields = [
          UserSelectionFields.Id,
          UserSelectionFields.UserId,
          UserSelectionFields.GlobalLinkId,
          UserSelectionFields.IsSelected,
          UserSelectionFields.DateSelected
        ];

        items = await list.items
          .select(...selectFields)
          .filter(`${UserSelectionFields.UserId} eq ${userId}`)();
      } catch (queryError) {
        Log.warn(LOG_SOURCE, `User selections query failed: ${(queryError as Error).message}, returning empty array`);
        return [];
      }

      const selections: IUserLinkSelection[] = items.map(item => ({
        id: item[UserSelectionFields.Id],
        userId: item[UserSelectionFields.UserId]?.toString() || '',
        globalLinkId: item[UserSelectionFields.GlobalLinkId],
        isSelected: item[UserSelectionFields.IsSelected] === true,
        dateSelected: item[UserSelectionFields.DateSelected]
      }));

      Log.info(LOG_SOURCE, `Retrieved ${selections.length} link selections for user ${userId}`);
      return selections;
    } catch (error) {
      Log.error(LOG_SOURCE, new Error(`Error in getUserLinkSelections: ${(error as Error).message}`));
      return [];
    }
  }

  /**
   * Save user's link selections
   */
  public async saveUserLinkSelections(userId: number, selectedLinkIds: number[]): Promise<boolean> {
    try {
      Log.info(LOG_SOURCE, `Saving link selections for user ${userId}: ${selectedLinkIds.length} links selected`);
      
      const list = this.sp.web.lists.getByTitle(SharePointLists.UserSelections);
      
      // Get all global links to know which are optional
      const globalLinks = await this.getAllGlobalLinks();
      const optionalLinks = globalLinks.filter(link => !link.isMandatory);
      
      // Get current user selections
      const currentSelections = await this.getUserLinkSelections(userId);
      const currentSelectionMap = new Map(currentSelections.map(s => [s.globalLinkId, s]));

      // Update selections for each optional link
      for (const link of optionalLinks) {
        const isSelected = selectedLinkIds.includes(link.id);
        const existingSelection = currentSelectionMap.get(link.id);
        
        if (existingSelection) {
          // Update existing selection
          if (existingSelection.isSelected !== isSelected) {
            await list.items.getById(existingSelection.id!).update({
              [UserSelectionFields.IsSelected]: isSelected,
              [UserSelectionFields.DateSelected]: new Date().toISOString()
            });
          }
        } else {
          // Create new selection record
          await list.items.add({
            [UserSelectionFields.UserId]: userId,
            [UserSelectionFields.GlobalLinkId]: link.id,
            [UserSelectionFields.IsSelected]: isSelected,
            [UserSelectionFields.DateSelected]: new Date().toISOString()
          });
        }
      }

      Log.info(LOG_SOURCE, `Successfully saved link selections for user ${userId}`);
      return true;
    } catch (error) {
      Log.error(LOG_SOURCE, error as Error);
      return false;
    }
  }

  /**
   * Initialize the service (does NOT create lists automatically)
   */
  public async initialize(): Promise<void> {
    try {
      // Only log that service is initialized - DO NOT create lists automatically
      Log.info(LOG_SOURCE, 'GlobalLinksService initialized - lists will be created manually via admin dialog');
    } catch (error) {
      Log.error(LOG_SOURCE, error as Error);
      throw error;
    }
  }

  /**
   * Create only the Global Footer Links list (called from admin dialog)
   */
  public async createGlobalLinksListOnly(): Promise<boolean> {
    try {
      Log.info(LOG_SOURCE, 'Creating Global Footer Links list manually via admin dialog');
      await this.createGlobalLinksListIfNotExists();
      
      // Add sample data if list is empty
      const globalLinks = await this.getAllGlobalLinks();
      if (globalLinks.length === 0) {
        Log.info(LOG_SOURCE, 'Adding sample data to newly created list');
        await this.addSampleGlobalLinks();
      }
      
      Log.info(LOG_SOURCE, 'Global Footer Links list created successfully via admin dialog');
      return true;
    } catch (error) {
      Log.error(LOG_SOURCE, error as Error);
      return false;
    }
  }

  /**
   * Create global links list if it doesn't exist
   */
  private async createGlobalLinksListIfNotExists(): Promise<void> {
    try {
      const web = this.sp.web;
      
      try {
        await web.lists.getByTitle(SharePointLists.GlobalLinks)();
        Log.info(LOG_SOURCE, `Global links list '${SharePointLists.GlobalLinks}' already exists`);
        return;
      } catch {
        // List doesn't exist, create it
      }

      Log.info(LOG_SOURCE, `Creating global links list: ${SharePointLists.GlobalLinks}`);
      
      // Check if user has permissions to create lists
      try {
        const currentUser = await web.currentUser();
        Log.info(LOG_SOURCE, `Current user: ${currentUser.Title} (${currentUser.LoginName})`);
      } catch (userError) {
        Log.error(LOG_SOURCE, new Error(`Cannot get current user info: ${(userError as Error).message}`));
        throw new Error('Insufficient permissions to access SharePoint');
      }
      
      await web.lists.add(SharePointLists.GlobalLinks, 'Global footer links with mandatory/optional flags', 100, false);
      const list = this.sp.web.lists.getByTitle(SharePointLists.GlobalLinks);

      // Add custom fields
      await list.fields.addUrl(GlobalLinksFields.Url, { Title: 'Footer URL' });
      await list.fields.addMultilineText(GlobalLinksFields.Description, { Title: 'Description' });
      await list.fields.addText(GlobalLinksFields.IconName, { Title: 'Icon Name' });
      await list.fields.addNumber(GlobalLinksFields.SortOrder, { Title: 'Sort Order' });
      await list.fields.addText(GlobalLinksFields.Category, { Title: 'Category' });
      await list.fields.addBoolean(GlobalLinksFields.IsMandatory, { Title: 'Is Mandatory' });
      await list.fields.addBoolean(GlobalLinksFields.IsActive, { Title: 'Is Active' });
      await list.fields.addMultilineText(GlobalLinksFields.TargetAudience, { Title: 'Target Audience' });
      await list.fields.addDateTime(GlobalLinksFields.ValidFrom, { Title: 'Valid From' });
      await list.fields.addDateTime(GlobalLinksFields.ValidTo, { Title: 'Valid To' });

      Log.info(LOG_SOURCE, `Successfully created global links list with all fields in default view: ${SharePointLists.GlobalLinks}`);
    } catch (error) {
      Log.error(LOG_SOURCE, error as Error);
    }
  }

  /**
   * Create User Link Selections list if it doesn't exist (called from admin dialog)
   */
  public async createUserSelectionsListOnly(): Promise<boolean> {
    try {
      await this.createUserSelectionsListIfNotExists();
      Log.info(LOG_SOURCE, 'User Link Selections list created successfully');
      return true;
    } catch (error) {
      Log.error(LOG_SOURCE, error as Error);
      return false;
    }
  }

  /**
   * Create user selections list if it doesn't exist
   */
  private async createUserSelectionsListIfNotExists(): Promise<void> {
    try {
      const web = this.sp.web;
      
      try {
        await web.lists.getByTitle(SharePointLists.UserSelections)();
        Log.info(LOG_SOURCE, `User selections list '${SharePointLists.UserSelections}' already exists`);
        return;
      } catch {
        // List doesn't exist, create it
      }

      Log.info(LOG_SOURCE, `Creating user selections list: ${SharePointLists.UserSelections}`);
      
      await web.lists.add(SharePointLists.UserSelections, 'User selections for global footer links', 100, false);
      const list = this.sp.web.lists.getByTitle(SharePointLists.UserSelections);

      // Add custom fields
      await list.fields.addNumber(UserSelectionFields.UserId, { Title: 'User Id' });
      await list.fields.addNumber(UserSelectionFields.GlobalLinkId, { Title: 'Global Link Id' });
      await list.fields.addBoolean(UserSelectionFields.IsSelected, { Title: 'Is Selected' });
      await list.fields.addDateTime(UserSelectionFields.DateSelected, { Title: 'Date Selected' });

      Log.info(LOG_SOURCE, `Successfully created user selections list: ${SharePointLists.UserSelections}`);
    } catch (error) {
      Log.error(LOG_SOURCE, error as Error);
    }
  }

  /**
   * Add a new global link to SharePoint
   */
  public async addGlobalLink(link: Partial<IGlobalLink>): Promise<boolean> {
    try {
      Log.info(LOG_SOURCE, `Adding new global link to home site: ${link.title}`);
      
      const list = this.homeSiteSp.web.lists.getByTitle(SharePointLists.GlobalLinks);
      
      const itemData: any = {
        [GlobalLinksFields.Title]: link.title,
        [GlobalLinksFields.Url]: {
          Url: link.url,
          Description: link.title || link.description || ''
        },
        [GlobalLinksFields.Description]: link.description || '',
        [GlobalLinksFields.IconName]: link.iconName || 'Link',
        [GlobalLinksFields.SortOrder]: link.order || 0,
        [GlobalLinksFields.Category]: link.category || 'General',
        [GlobalLinksFields.IsMandatory]: link.isMandatory || false,
        [GlobalLinksFields.IsActive]: link.isActive !== false,
        [GlobalLinksFields.TargetAudience]: link.targetAudience ? link.targetAudience.join(';') : '',
        [GlobalLinksFields.ValidFrom]: link.validFrom,
        [GlobalLinksFields.ValidTo]: link.validTo
      };

      // Add Icon URL if provided
      if (link.iconUrl) {
        itemData[GlobalLinksFields.IconUrl] = {
          Url: link.iconUrl,
          Description: `Icon for ${link.title}`
        };
      }

      await list.items.add(itemData);
      
      Log.info(LOG_SOURCE, `Successfully added global link: ${link.title}`);
      return true;
    } catch (error) {
      Log.error(LOG_SOURCE, error as Error);
      return false;
    }
  }

  /**
   * Update an existing global link in SharePoint
   */
  public async updateGlobalLink(linkId: number, link: Partial<IGlobalLink>): Promise<boolean> {
    try {
      Log.info(LOG_SOURCE, `Updating global link with ID ${linkId}: ${link.title}`);
      
      const list = this.homeSiteSp.web.lists.getByTitle(SharePointLists.GlobalLinks);
      
      const itemData: any = {};

      // Only update provided fields
      if (link.title !== undefined) itemData[GlobalLinksFields.Title] = link.title;
      if (link.url !== undefined) {
        itemData[GlobalLinksFields.Url] = {
          Url: link.url,
          Description: link.title || link.description || ''
        };
      }
      if (link.description !== undefined) itemData[GlobalLinksFields.Description] = link.description;
      if (link.iconName !== undefined) itemData[GlobalLinksFields.IconName] = link.iconName;
      if (link.order !== undefined) itemData[GlobalLinksFields.SortOrder] = link.order;
      if (link.category !== undefined) itemData[GlobalLinksFields.Category] = link.category;
      if (link.isMandatory !== undefined) itemData[GlobalLinksFields.IsMandatory] = link.isMandatory;
      if (link.isActive !== undefined) itemData[GlobalLinksFields.IsActive] = link.isActive;
      if (link.targetAudience !== undefined) itemData[GlobalLinksFields.TargetAudience] = link.targetAudience.join(';');
      if (link.validFrom !== undefined) itemData[GlobalLinksFields.ValidFrom] = link.validFrom;
      if (link.validTo !== undefined) itemData[GlobalLinksFields.ValidTo] = link.validTo;

      // Add Icon URL if provided
      if (link.iconUrl !== undefined) {
        itemData[GlobalLinksFields.IconUrl] = link.iconUrl ? {
          Url: link.iconUrl,
          Description: `Icon for ${link.title || 'link'}`
        } : null;
      }

      await list.items.getById(linkId).update(itemData);
      
      Log.info(LOG_SOURCE, `Successfully updated global link with ID ${linkId}`);
      return true;
    } catch (error) {
      Log.error(LOG_SOURCE, error as Error);
      return false;
    }
  }

  /**
   * Delete a single global link from SharePoint
   */
  public async deleteGlobalLink(linkId: number): Promise<boolean> {
    try {
      Log.info(LOG_SOURCE, `Deleting global link with ID: ${linkId}`);
      
      const list = this.homeSiteSp.web.lists.getByTitle(SharePointLists.GlobalLinks);
      await list.items.getById(linkId).delete();
      
      // Also clean up any user selections for this link
      await this.cleanupUserSelectionsForDeletedLink(linkId);
      
      Log.info(LOG_SOURCE, `Successfully deleted global link with ID: ${linkId}`);
      return true;
    } catch (error) {
      Log.error(LOG_SOURCE, error as Error);
      return false;
    }
  }

  /**
   * Delete multiple global links from SharePoint
   */
  public async deleteGlobalLinks(linkIds: number[]): Promise<boolean> {
    try {
      Log.info(LOG_SOURCE, `Bulk deleting ${linkIds.length} global links`);
      
      const list = this.homeSiteSp.web.lists.getByTitle(SharePointLists.GlobalLinks);
      
      // Delete each link individually to ensure proper cleanup
      const deletePromises = linkIds.map(async (linkId) => {
        try {
          await list.items.getById(linkId).delete();
          // Also clean up any user selections for this link
          await this.cleanupUserSelectionsForDeletedLink(linkId);
          return { success: true, linkId };
        } catch (error) {
          Log.error(LOG_SOURCE, new Error(`Failed to delete link ${linkId}: ${(error as Error).message}`));
          return { success: false, linkId, error };
        }
      });

      const results = await Promise.all(deletePromises);
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;
      
      Log.info(LOG_SOURCE, `Bulk delete completed - ${successCount} successful, ${failureCount} failed`);
      
      // Return true if all deletions were successful
      return failureCount === 0;
    } catch (error) {
      Log.error(LOG_SOURCE, error as Error);
      return false;
    }
  }

  /**
   * Clean up user selections for a deleted global link
   */
  private async cleanupUserSelectionsForDeletedLink(linkId: number): Promise<void> {
    try {
      Log.info(LOG_SOURCE, `Checking for user selections to clean up for deleted link ${linkId}`);
      
      // Check if user selections list exists using web.lists.filter to avoid 404
      const lists = await this.sp.web.lists.filter(`Title eq '${SharePointLists.UserSelections}'`)();
      
      if (!lists || lists.length === 0) {
        Log.info(LOG_SOURCE, `User selections list '${SharePointLists.UserSelections}' does not exist - skipping cleanup`);
        return;
      }

      const list = this.sp.web.lists.getByTitle(SharePointLists.UserSelections);
      
      // Get all selections for this link
      try {
        const selections = await list.items
          .select('Id')
          .filter(`${UserSelectionFields.GlobalLinkId} eq ${linkId}`)();

        if (selections.length === 0) {
          Log.info(LOG_SOURCE, `No user selections found for deleted link ${linkId}`);
          return;
        }

        // Delete all user selections for this link
        let deletedCount = 0;
        for (const selection of selections) {
          try {
            await list.items.getById(selection.Id).delete();
            deletedCount++;
          } catch (error) {
            Log.warn(LOG_SOURCE, `Failed to delete user selection ${selection.Id}: ${(error as Error).message}`);
          }
        }

        Log.info(LOG_SOURCE, `Successfully cleaned up ${deletedCount}/${selections.length} user selections for deleted link ${linkId}`);
      } catch (error) {
        // If there's an error querying the list, it might be because the field doesn't exist
        Log.warn(LOG_SOURCE, `Could not query user selections for link ${linkId}: ${(error as Error).message}`);
      }
    } catch (error) {
      // Log the error but don't fail the main deletion operation
      Log.warn(LOG_SOURCE, `Error during user selections cleanup for link ${linkId}: ${(error as Error).message}`);
    }
  }

  /**
   * Add sample global links (for testing)
   */
  public async addSampleGlobalLinks(): Promise<void> {
    try {
      const sampleLinks: Partial<IGlobalLink>[] = [
        {
          title: 'Company Portal',
          url: 'https://portal.company.com',
          description: 'Main company portal - mandatory for all users',
          iconName: 'Home',
          order: 1,
          category: 'Essential',
          isMandatory: true,
          isActive: true
        },
        {
          title: 'Help & Support',
          url: 'https://support.company.com',
          description: 'Get help and support - mandatory for all users',
          iconName: 'Help',
          order: 2,
          category: 'Essential',
          isMandatory: true,
          isActive: true
        },
        {
          title: 'Employee Benefits',
          url: 'https://benefits.company.com',
          description: 'Employee benefits portal - optional',
          iconName: 'Heart',
          order: 3,
          category: 'HR',
          isMandatory: false,
          isActive: true
        },
        {
          title: 'Learning & Development',
          url: 'https://learning.company.com',
          description: 'Training and development resources - optional',
          iconName: 'Education',
          order: 4,
          category: 'Professional Development',
          isMandatory: false,
          isActive: true
        },
        {
          title: 'Travel Booking',
          url: 'https://travel.company.com',
          description: 'Corporate travel booking system - optional',
          iconName: 'Airplane',
          order: 5,
          category: 'Business Tools',
          isMandatory: false,
          isActive: true
        }
      ];

      const list = this.sp.web.lists.getByTitle(SharePointLists.GlobalLinks);
      
      for (const link of sampleLinks) {
        await list.items.add({
          [GlobalLinksFields.Title]: link.title,
          [GlobalLinksFields.Url]: link.url,
          [GlobalLinksFields.Description]: link.description,
          [GlobalLinksFields.IconName]: link.iconName,
          [GlobalLinksFields.SortOrder]: link.order,
          [GlobalLinksFields.Category]: link.category,
          [GlobalLinksFields.IsMandatory]: link.isMandatory,
          [GlobalLinksFields.IsActive]: link.isActive
        });
      }

      Log.info(LOG_SOURCE, `Added ${sampleLinks.length} sample global links`);
    } catch (error) {
      Log.error(LOG_SOURCE, error as Error);
    }
  }

  public async getSharedMenuItems(): Promise<IContextualMenuItem[]> {
    try {
      const sharedLinks = await this.getSharedLinks();
      return sharedLinks.map(link => ({
        key: `shared-${link.id}`,
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
  }

  public async getPersonalMenuItems(): Promise<IContextualMenuItem[]> {
    return []; // GlobalLinksService does not provide personal menu items
  }
}