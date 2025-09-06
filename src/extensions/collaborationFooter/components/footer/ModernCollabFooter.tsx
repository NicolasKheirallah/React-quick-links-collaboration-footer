import * as React from 'react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Log } from '@microsoft/sp-core-library';
import * as strings from '../../loc/myStrings';
import { spfi, SPFx } from '@pnp/sp';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';
import '@pnp/sp/folders';
import '@pnp/sp/files';
import '@pnp/sp/fields';
import '@pnp/sp/views';
import styles from './ModernCollabFooter.module.scss';

import { ICollabFooterProps } from './ICollabFooterProps';

import { IContextualMenuItem } from '@fluentui/react/lib/ContextualMenu';
import { getTheme } from '@fluentui/react/lib/Styling';
import { useToastNotifications } from '../../hooks/useToastNotifications';
import { ToastContainer } from '../shared/ToastNotification';
import { DefaultButton, PrimaryButton } from '@fluentui/react/lib/Button';
import { Dialog, DialogType, DialogFooter } from '@fluentui/react/lib/Dialog';
import { useUserAccess } from '../../hooks/useUserAccess';
import { useAnalytics } from '../../hooks/useAnalytics';
import { useCategories } from '../../hooks/useCategories';
import { useSafeTimeout } from '../../hooks/useSafeTimeout';
import { useUserSettings } from '../../hooks/useUserSettings';
import { CategoryService } from '../../services/categoryService';
import { ClickBehavior, SortOrder } from '../../types/UserSettings';
import { LinkManagementDialog } from '../dialogs/LinkManagementDialog';
import { FooterActions } from './FooterActions';
import { FooterNotifications } from './FooterNotifications';
import { FooterSearch } from './FooterSearch';
import { FooterContent } from './FooterContent';
import { LinkBadgeRenderer } from './LinkBadgeRenderer';

const LOG_SOURCE: string = 'ModernCollabFooter';

interface IAdminSettings {
  globalLinksListTitle: string;
  enableUserSelectionStorage: boolean;
  maxLinksPerCategory: number;
  enableSearch: boolean;
  enableAnimations: boolean;
  defaultViewMode?: string;
  bannerSize?: 'small' | 'medium' | 'large';
  cacheDurationMinutes?: number;
  enableBackgroundRefresh?: boolean;
  batchSize?: number;
  enableClickTracking?: boolean;
  enablePopularDetection?: boolean;
  popularThreshold?: number;
  restrictAdminFeatures?: boolean;
  linkValidationLevel?: string;
  enableLinkExpiration?: boolean;
  customCssClasses?: string;
  customJavaScript?: string;
  debugMode?: boolean;
}




const ModernCollabFooter: React.FC<ICollabFooterProps> = ({ 
  sharedLinks, 
  myLinks: initialMyLinks, 
  editMyLinks, 
  openLinkSelection, 
  storageType,
  context,
  footerService,
  homeSiteUrl,
  legacyMode = false,
  onPersonalLinksUpdated
}) => {
  const [myLinks, setMyLinks] = useState<IContextualMenuItem[]>(initialMyLinks);
  const [myLinksSaved, setMyLinksSaved] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [organizationSearchQuery, setOrganizationSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(20);
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [isResetConfirmDialogOpen, setIsResetConfirmDialogOpen] = useState<boolean>(false);
  const [showLinkManagementDialog, setShowLinkManagementDialog] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('personal');
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [showAddPersonalLinkForm, setShowAddPersonalLinkForm] = useState<boolean>(false);
  const [personalLinksSearchQuery, setPersonalLinksSearchQuery] = useState<string>('');
  const [personalLinksSortBy, setPersonalLinksSortBy] = useState<string>('name');
  const [personalLinksSortDirection, setPersonalLinksSortDirection] = useState<'asc' | 'desc'>('asc');
  const [personalLinksSelectedCategory, setPersonalLinksSelectedCategory] = useState<string>('all');
  const [showAddOrgLinkForm, setShowAddOrgLinkForm] = useState<boolean>(false);
  const [newLinkFormData, setNewLinkFormData] = useState<{
    title: string;
    url: string;
    description: string;
    iconName: string;
    iconUrl: string;
    category: string;
    targetUsers: any[];
    isMandatory: boolean;
    validFrom: string;
    validTo: string;
    id?: number; // Optional ID for editing existing links
  }>({
    title: '',
    url: '',
    description: '',
    iconName: 'Link',
    iconUrl: '',
    category: 'General',
    targetUsers: [],
    isMandatory: false,
    validFrom: '',
    validTo: ''
  });
  const [listValidationStatus, setListValidationStatus] = useState<{
    globalLinksExists: boolean;
    userSelectionsExists: boolean;
    isValidating: boolean;
    lastChecked: Date | null;
  }>({
    globalLinksExists: false,
    userSelectionsExists: false,
    isValidating: false,
    lastChecked: null
  });
  const [adminSettings, setAdminSettings] = useState<IAdminSettings>({
    globalLinksListTitle: 'Global Footer Links',
    enableUserSelectionStorage: true,
    maxLinksPerCategory: 10,
    enableSearch: true,
    enableAnimations: true,
    bannerSize: 'medium'
  });
  const [organizationLinks, setOrganizationLinks] = useState<IContextualMenuItem[]>(sharedLinks);
  const [allAvailableOrgLinks, setAllAvailableOrgLinks] = useState<IContextualMenuItem[]>([]);
  const [linkOperationStatus, setLinkOperationStatus] = useState<{
    isCreating: boolean;
    isUpdating: boolean;
    isDeleting: boolean;
    lastOperation: string | null;
  }>({
    isCreating: false,
    isUpdating: false,
    isDeleting: false,
    lastOperation: null
  });

  const userAccess = useUserAccess(context as any, organizationLinks, myLinks);
  const analytics = useAnalytics(context as any, false);
  const toast = useToastNotifications();
  const userSettings = useUserSettings(context as any);
  
  const allLinks = useMemo(() => [...organizationLinks, ...myLinks], [organizationLinks, myLinks]);
  const categories = useCategories(context as any, allLinks);
  const { setSafeTimeout } = useSafeTimeout();

  
  const theme = useMemo(() => getTheme(), []);
  
  const sharePointTheme = useMemo(() => ({
    primary: theme.palette.themePrimary,
    primaryLight: theme.palette.themeLighter,
    primaryDark: theme.palette.themeDark,
    accent: theme.palette.accent,
    neutral: theme.palette.neutralPrimary,
    neutralLight: theme.palette.neutralLighter,
    neutralDark: theme.palette.neutralDark,
    success: theme.palette.green,
    warning: theme.palette.yellow,
    error: theme.palette.red,
    compactButtonBg: theme.palette.themeLighter,
    compactButtonBorder: theme.palette.themeTertiary,
    compactButtonHover: theme.palette.themePrimary,
    adminButtonBg: theme.palette.orangeLight,
    adminButtonBorder: theme.palette.orange
  }), [theme]);

  const handleLinkClickWithAnalytics = useCallback(async (link: IContextualMenuItem, event?: React.MouseEvent) => {
    try {
      await analytics.trackLinkClick(link);
      
      if (link.href && !event?.defaultPrevented) {
        if (userSettings.settings.clickBehavior === ClickBehavior.SameTab) {
          window.location.href = link.href;
        } else {
          window.open(link.href, '_blank', 'noopener,noreferrer');
        }
      }
    } catch (error) {
      Log.error(LOG_SOURCE, error as Error);
      if (link.href && !event?.defaultPrevented) {
        if (userSettings.settings.clickBehavior === ClickBehavior.SameTab) {
          window.location.href = link.href;
        } else {
          window.open(link.href, '_blank', 'noopener,noreferrer');
        }
      }
    }
  }, [analytics, userSettings.settings.clickBehavior]);

  const handleLinksImported = useCallback(async (links: IContextualMenuItem[]) => {
    try {
      setLinkOperationStatus(prev => ({ ...prev, isCreating: true, lastOperation: `Saving ${links.length} imported links to SharePoint...` }));
      
      let successCount = 0;
      let failureCount = 0;
      
      for (const link of links) {
        try {
          if (footerService?.addGlobalLink) {
            const linkData = {
              title: link.name,
              url: link.href,
              description: (link as any).description || link.title || '',
              iconName: link.iconProps?.iconName || 'Link',
              iconUrl: (link as any).iconUrl || '',
              category: (link as any).category || 'General',
              isMandatory: (link as any).isMandatory || false,
              isActive: (link as any).isActive !== false,
              sortOrder: (link as any).sortOrder || 0,
              targetUsers: (link as any).targetUsers || [],
              validFrom: (link as any).validFrom || null,
              validTo: (link as any).validTo || null
            };
            
            const success = await footerService?.addGlobalLink(linkData);
            if (success) {
              successCount++;
            } else {
              failureCount++;
              Log.warn(LOG_SOURCE, `Failed to save imported link: ${link.name}`);
            }
          } else {
            failureCount++;
            Log.warn(LOG_SOURCE, `Footer service doesn't support adding links: ${link.name}`);
          }
        } catch (error) {
          failureCount++;
          Log.error(LOG_SOURCE, new Error(`Error saving imported link "${link.name}": ${(error as Error).message}`));
        }
      }
      
      if (successCount > 0) {
        toast.showSuccess(`Successfully imported ${successCount} links to SharePoint list!`);
      }
      
      if (failureCount > 0) {
        toast.showWarning(`${failureCount} links failed to import. Please check the console for details.`);
      }
      
      Log.info(LOG_SOURCE, `Import completed: ${successCount} links saved to SharePoint, ${failureCount} failed`);
      
    } catch (error) {
      Log.error(LOG_SOURCE, error as Error);
      toast.showError(`Failed to import links: ${(error as Error).message}`);
      
      setOrganizationLinks(prevLinks => [...prevLinks, ...links]);
    } finally {
      setLinkOperationStatus(prev => ({ ...prev, isCreating: false }));
    }
  }, [footerService, toast]);

  const handleStatusUpdate = useCallback((message: string, isError = false) => {
    Log.info(LOG_SOURCE, `Admin status: ${message}`);
    setLinkOperationStatus(prev => ({ 
      ...prev, 
      lastOperation: message 
    }));
  }, []);

  const handleCreateCategory = useCallback(async (categoryName: string): Promise<boolean> => {
    try {
      Log.info(LOG_SOURCE, `Creating new category: ${categoryName}`);
      const newCategory = await CategoryService.createCategory({ name: categoryName }, context as any);
      Log.info(LOG_SOURCE, `Successfully created category: ${categoryName} with ID: ${newCategory.id}`);
      toast.showSuccess(`Category "${categoryName}" created successfully!`);
      return true;
    } catch (error) {
      Log.error(LOG_SOURCE, error as Error);
      toast.showError(`Failed to create category: ${(error as Error).message}`);
      return false;
    }
  }, [context, toast]);

  const handleCategoriesRefresh = useCallback(async () => {
    Log.info(LOG_SOURCE, 'Refreshing categories after creation');
    try {
      const { CategoryService } = await import('../../services/categoryService');
      const cacheKey = context?.pageContext?.user?.email || 'default';
      CategoryService.clearCache(cacheKey);
    } catch (error) {
      Log.warn(LOG_SOURCE, `Failed to clear category cache: ${(error as Error).message}`);
    }
    
    await categories.refreshCategories();
    await new Promise(resolve => setTimeout(resolve, 150));
  }, [categories, context]);




  useEffect(() => {
    Log.info(LOG_SOURCE, `Modern footer initialized with ${sharedLinks.length} shared links and ${myLinks.length} personal links`);
  }, [sharedLinks.length, myLinks.length]);

  useEffect(() => {
    if (legacyMode && !showLinkManagementDialog) {
      setShowLinkManagementDialog(true);
      setActiveTab('personal');
    }
  }, [legacyMode, showLinkManagementDialog]);

  useEffect(() => {
    setMyLinks(initialMyLinks);
  }, [initialMyLinks]);

  useEffect(() => {
    if (legacyMode && onPersonalLinksUpdated) {
      onPersonalLinksUpdated(myLinks);
    }
  }, [myLinks, legacyMode, onPersonalLinksUpdated]);

  useEffect(() => {
    checkAdminStatus();
    loadRealData();
    validateSharePointListsSilent(); // Use silent version for automatic validation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setOrganizationLinks(sharedLinks);
  }, [sharedLinks]);

  const checkAdminStatus = useCallback(async () => {
    try {
      if (!context) {
        Log.warn(LOG_SOURCE, 'Context not available for admin check');
        return;
      }

      const isSiteAdmin = context.pageContext.user?.isAnonymousGuestUser === false &&
                         context.pageContext.legacyPageContext?.isSiteAdmin === true;
      
      let isOnHomeSite = true; // Default to true if no homeSiteUrl specified
      if (homeSiteUrl) {
        const currentSiteUrl = context.pageContext.web.absoluteUrl.toLowerCase();
        const normalizedHomeSiteUrl = homeSiteUrl.toLowerCase().replace(/\/+$/, ''); // Remove trailing slashes
        const normalizedCurrentSiteUrl = currentSiteUrl.replace(/\/+$/, ''); // Remove trailing slashes
        isOnHomeSite = normalizedCurrentSiteUrl === normalizedHomeSiteUrl || normalizedCurrentSiteUrl.startsWith(normalizedHomeSiteUrl + '/');
      }
      
      const isHomeSiteAdmin = isSiteAdmin && isOnHomeSite;
      setIsAdmin(!!isHomeSiteAdmin);
      
      Log.info(LOG_SOURCE, `Admin status check: isSiteAdmin=${isSiteAdmin}, isOnHomeSite=${isOnHomeSite}, homeSiteUrl=${homeSiteUrl}, currentSite=${context.pageContext.web.absoluteUrl}`);
      Log.info(LOG_SOURCE, `Final admin status: ${isHomeSiteAdmin}`);
    } catch (error) {
      Log.warn(LOG_SOURCE, `Error checking admin status: ${(error as Error).message}`);
      setIsAdmin(false);
    }
  }, [context, homeSiteUrl]);

  const refreshOrganizationLinks = useCallback(async () => {
    try {
      if (!footerService) {
        Log.warn(LOG_SOURCE, 'Footer service not available for refresh');
        return;
      }

      Log.info(LOG_SOURCE, 'Refreshing organization links from server after deletion');

      const sharedLinks = await footerService.getSharedLinks();
      const sharedMenuItems = sharedLinks.map(link => ({
        key: `shared-${link.id}`,
        name: link.title,
        href: link.url,
        title: link.description,
        iconProps: { iconName: link.iconName || 'Link' },
        target: userSettings.settings.clickBehavior === ClickBehavior.SameTab ? '_self' : '_blank',
        isActive: link.isActive,
        data: {
          iconUrl: link.iconUrl,
          isMandatory: (link as any).isMandatory || false,
          category: (link as any).category || 'General',
          id: link.id
        }
      }));
      setOrganizationLinks(sharedMenuItems);

      if ('getAllGlobalLinks' in footerService) {
        const allGlobalLinks = await (footerService as any).getAllGlobalLinks();
        const allOrgMenuItems = allGlobalLinks.map((link: any) => ({
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
        Log.info(LOG_SOURCE, `Refreshed ${allOrgMenuItems.length} organization links from server`);
      }
    } catch (error) {
      Log.error(LOG_SOURCE, error as Error);
    }
  }, [footerService, userSettings.settings.clickBehavior]);

  const loadRealData = useCallback(async () => {
    try {
      if (!footerService) {
        Log.warn(LOG_SOURCE, 'Footer service not available');
        return;
      }

      setIsLoading(true);

      const personalLinks = await footerService.getPersonalLinks();
      const personalMenuItems = personalLinks.map((link, index) => ({
        key: `personal-${link.id || `generated-${Date.now()}-${index}`}`,
        name: link.title,
        href: link.url,
        title: link.description,
        iconProps: { iconName: link.iconName || 'Link' },
        target: userSettings.settings.clickBehavior === ClickBehavior.SameTab ? '_self' : '_blank',
        data: {
          iconUrl: (link as any).iconUrl
        }
      }));
      setMyLinks(personalMenuItems);

      const sharedLinks = await footerService.getSharedLinks();
      const sharedMenuItems = sharedLinks.map(link => ({
        key: `shared-${link.id}`,
        name: link.title,
        href: link.url,
        title: link.description,
        iconProps: { iconName: link.iconName || 'Link' },
        target: userSettings.settings.clickBehavior === ClickBehavior.SameTab ? '_self' : '_blank',
        isActive: link.isActive,
        data: {
          iconUrl: link.iconUrl,
          isMandatory: (link as any).isMandatory || false,
          category: (link as any).category || 'General'
        }
      }));
      setOrganizationLinks(sharedMenuItems);

      if ('getAllGlobalLinks' in footerService) {
        const allGlobalLinks = await (footerService as any).getAllGlobalLinks();
        const allOrgMenuItems = allGlobalLinks.map((link: any) => ({
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

      Log.info(LOG_SOURCE, `Loaded ${personalLinks.length} personal links and ${sharedLinks.length} organization links`);
    } catch (error) {
      Log.warn(LOG_SOURCE, `Error loading data: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  }, [footerService]);


  const validateSharePointListsSilent = useCallback(async () => {
    try {
      setListValidationStatus(prev => ({ ...prev, isValidating: true }));
      
      const globalLinksExists = await checkListExists(adminSettings.globalLinksListTitle);
      
      const userSelectionsExists = await checkListExists('User Link Selections');
      
      setListValidationStatus({
        globalLinksExists,
        userSelectionsExists,
        isValidating: false,
        lastChecked: new Date()
      });
      
      Log.info(LOG_SOURCE, `List validation complete: Global=${globalLinksExists}, UserSelections=${userSelectionsExists}`);
    } catch (error) {
      Log.warn(LOG_SOURCE, `Error in silent validation: ${(error as Error).message}`);
      setListValidationStatus(prev => ({ 
        ...prev, 
        isValidating: false, 
        lastChecked: new Date() 
      }));
    }
  }, [adminSettings.globalLinksListTitle]);

  const validateSharePointLists = useCallback(async () => {
    try {
      setListValidationStatus(prev => ({ ...prev, isValidating: true }));
      
      const globalLinksExists = await checkListExists(adminSettings.globalLinksListTitle);
      
      const userSelectionsExists = await checkListExists('User Link Selections');
      
      setListValidationStatus({
        globalLinksExists,
        userSelectionsExists,
        isValidating: false,
        lastChecked: new Date()
      });
      
      const results = [];
      if (globalLinksExists) {
        results.push('✓ Global Links List');
      } else {
        results.push('✗ Global Links List (Missing)');
      }
      
      if (userSelectionsExists) {
        results.push('✓ User Selections List');
      } else {
        results.push('✗ User Selections List (Missing)');
      }
      
      const allListsExist = globalLinksExists && userSelectionsExists;
      const someListsExist = globalLinksExists || userSelectionsExists;
      
      if (allListsExist) {
        toast.showSuccess(`All SharePoint lists validated successfully!\n${results.join(', ')}`);
      } else if (someListsExist) {
        toast.showWarning(`List validation completed with missing lists:\n${results.join(', ')}\n\nUse the Create buttons to set up missing lists.`);
      } else {
        toast.showWarning(`No required SharePoint lists found:\n${results.join(', ')}\n\nPlease create the lists to enable full functionality.`);
      }
      
      Log.info(LOG_SOURCE, `Manual list validation complete: Global=${globalLinksExists}, UserSelections=${userSelectionsExists}`);
    } catch (error) {
      Log.error(LOG_SOURCE, error as Error);
      toast.showError(`Failed to validate SharePoint lists: ${(error as Error).message}`);
      setListValidationStatus(prev => ({ 
        ...prev, 
        isValidating: false, 
        lastChecked: new Date() 
      }));
    }
  }, [adminSettings.globalLinksListTitle, toast]);

  const checkListExists = useCallback(async (listTitle: string): Promise<boolean> => {
    try {
      if (!context) {
        Log.warn(LOG_SOURCE, 'SharePoint context not available for list checking');
        return false;
      }

      Log.info(LOG_SOURCE, `Checking if list exists: ${listTitle}`);
      
      const webUrl = context.pageContext.web.absoluteUrl;
      const encodedListTitle = encodeURIComponent(listTitle.replace(/'/g, "''"));
      
      const response = await fetch(`${webUrl}/_api/web/lists/getbytitle('${encodedListTitle}')?$select=Title,Id`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json;odata=verbose',
          'Content-Type': 'application/json;odata=verbose'
        }
      });
      
      if (response.status === 404) {
        Log.info(LOG_SOURCE, `List '${listTitle}' does not exist`);
        return false;
      }
      
      if (!response.ok) {
        Log.warn(LOG_SOURCE, `Error checking list '${listTitle}': ${response.status} ${response.statusText}`);
        return false;
      }
      
      const result = await response.json();
      const listExists = result.d && result.d.Title;
      
      Log.info(LOG_SOURCE, `List '${listTitle}' exists: ${listExists ? 'Yes' : 'No'}`);
      return !!listExists;
      
    } catch (error) {
      Log.warn(LOG_SOURCE, `Failed to check if list '${listTitle}' exists: ${(error as Error).message}`);
      return false;
    }
  }, [context]);



  const createSharePointLists = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const globalLinksListCreated = await createGlobalLinksListSchema();
      
      if (globalLinksListCreated) {
        Log.info(LOG_SOURCE, 'Successfully created Global Footer Links list');
        setMyLinksSaved(true);
        toast.showSuccess('Global Footer Links list created successfully!', 4000);
        setSafeTimeout(() => setMyLinksSaved(null), 3000);
      }
      
    } catch (error) {
      Log.warn(LOG_SOURCE, `Error in function: ${(error as Error).message}`);
      setMyLinksSaved(false);
      setSafeTimeout(() => setMyLinksSaved(null), 4000);
    } finally {
      setIsLoading(false);
    }
  }, [adminSettings.globalLinksListTitle]);

  const createGlobalLinksListSchema = useCallback(async (): Promise<boolean> => {
    try {
      if (!context) {
        Log.warn(LOG_SOURCE, 'SharePoint context not available for list creation');
        return false;
      }

      setLinkOperationStatus(prev => ({ ...prev, isCreating: true, lastOperation: 'Creating SharePoint list on home site...' }));
      
      const listTitle = adminSettings.globalLinksListTitle;
      
      let targetSiteUrl: string;
      if (homeSiteUrl) {
        targetSiteUrl = homeSiteUrl;
      } else {
        const currentUrl = context.pageContext.web.absoluteUrl;
        const tenantUrl = new URL(currentUrl);
        targetSiteUrl = `${tenantUrl.protocol}//${tenantUrl.hostname}`;
      }
      
      const sp = spfi(targetSiteUrl).using(SPFx(context));
      
      Log.info(LOG_SOURCE, `Creating SharePoint list '${listTitle}' on home site: ${targetSiteUrl}`);
      
      await sp.web.lists.add(listTitle, 'Global footer links managed by administrators', 100, true);
      Log.info(LOG_SOURCE, `List created successfully: ${listTitle} on ${targetSiteUrl}`);
      
      const list = sp.web.lists.getByTitle(listTitle);
      
      Log.info(LOG_SOURCE, 'Adding fields to SharePoint list...');
      
      try {
        await list.fields.addUrl('Footer_x0020_URL', {
          Title: 'Footer URL',
          Description: 'The URL destination for the footer link',
          Required: true
        });
        Log.info(LOG_SOURCE, 'Successfully added Footer URL field');
      } catch (error) {
        Log.warn(LOG_SOURCE, `Failed to add Footer URL field: ${(error as Error).message}`);
      }
      
      try {
        await list.fields.addMultilineText('Description', {
          Title: 'Description',
          Description: 'Description of the footer link',
          Required: false,
          RichText: false,
          AppendOnly: false
        });
        Log.info(LOG_SOURCE, 'Successfully added Description field');
      } catch (error) {
        Log.warn(LOG_SOURCE, `Failed to add Description field: ${(error as Error).message}`);
      }
      
      try {
        await list.fields.addText('Icon_x0020_Name', {
          Title: 'Icon Name',
          Description: 'Fluent UI icon name for the link',
          Required: false,
          MaxLength: 50
        });
        Log.info(LOG_SOURCE, 'Successfully added Icon Name field');
      } catch (error) {
        Log.warn(LOG_SOURCE, `Failed to add Icon Name field: ${(error as Error).message}`);
      }
      
      try {
        await list.fields.addUrl('Icon_x0020_URL', {
          Title: 'Icon URL',
          Description: 'URL to custom icon image (PNG, SVG, etc.) - overrides Fluent UI icon',
          Required: false
        });
        Log.info(LOG_SOURCE, 'Successfully added Icon URL field');
      } catch (error) {
        Log.warn(LOG_SOURCE, `Failed to add Icon URL field: ${(error as Error).message}`);
      }
      
      try {
        await list.fields.addNumber('Sort_x0020_Order', {
          Title: 'Sort Order',
          Description: 'Display order for the link',
          Required: false,
          MinimumValue: 0,
          MaximumValue: 999
        });
        Log.info(LOG_SOURCE, 'Successfully added Sort Order field');
      } catch (error) {
        Log.warn(LOG_SOURCE, `Failed to add Sort Order field: ${(error as Error).message}`);
      }
      
      try {
        await list.fields.addText('Category', {
          Title: 'Category',
          Description: 'Category grouping for the link',
          Required: false,
          MaxLength: 50
        });
        Log.info(LOG_SOURCE, 'Successfully added Category field');
      } catch (error) {
        Log.warn(LOG_SOURCE, `Failed to add Category field: ${(error as Error).message}`);
      }
      
      try {
        await list.fields.addBoolean('Is_x0020_Mandatory', {
          Title: 'Is Mandatory',
          Description: 'Whether this link is mandatory for all users',
          Required: false
        });
        Log.info(LOG_SOURCE, 'Successfully added Is Mandatory field');
      } catch (error) {
        Log.warn(LOG_SOURCE, `Failed to add Is Mandatory field: ${(error as Error).message}`);
      }
      
      try {
        await list.fields.addBoolean('Is_x0020_Active', {
          Title: 'Is Active',
          Description: 'Whether this link is currently active',
          Required: false
        });
        Log.info(LOG_SOURCE, 'Successfully added Is Active field');
      } catch (error) {
        Log.warn(LOG_SOURCE, `Failed to add Is Active field: ${(error as Error).message}`);
      }
      
      try {
        await list.fields.addUser('Target_x0020_Users', {
          Title: 'Target Users',
          Description: 'Users and groups who can see this link (leave empty for everyone)',
          Required: false
        });
        Log.info(LOG_SOURCE, 'Successfully added Target Users field');
      } catch (error) {
        Log.warn(LOG_SOURCE, `Failed to add Target Users field: ${(error as Error).message}`);
      }
      
      try {
        await list.fields.addDateTime('Valid_x0020_From', {
          Title: 'Valid From',
          Description: 'Date when the link becomes valid',
          Required: false,
          DisplayFormat: 1
        });
        Log.info(LOG_SOURCE, 'Successfully added Valid From field');
      } catch (error) {
        Log.warn(LOG_SOURCE, `Failed to add Valid From field: ${(error as Error).message}`);
      }
      
      try {
        await list.fields.addDateTime('Valid_x0020_To', {
          Title: 'Valid To',
          Description: 'Date when the link expires',
          Required: false,
          DisplayFormat: 1
        });
        Log.info(LOG_SOURCE, 'Successfully added Valid To field');
      } catch (error) {
        Log.warn(LOG_SOURCE, `Failed to add Valid To field: ${(error as Error).message}`);
      }
      
      Log.info(LOG_SOURCE, 'Completed field creation for SharePoint list');
      
      try {
        Log.info(LOG_SOURCE, 'Adding fields to default view...');
        const views = await list.views();
        const defaultView = views.find(v => v.DefaultView) || views[0];
        
        if (!defaultView) {
          Log.warn(LOG_SOURCE, 'No default view found');
          throw new Error('No default view found');
        }
        
        const view = list.views.getById(defaultView.Id);
        
        const fieldsToAdd = [
          'Footer_x0020_URL',
          'Description', 
          'Icon_x0020_Name',
          'Icon_x0020_URL',
          'Sort_x0020_Order',
          'Category',
          'Is_x0020_Mandatory',
          'Is_x0020_Active',
          'Target_x0020_Audience',
          'Valid_x0020_From',
          'Valid_x0020_To'
        ];
        
        for (const fieldName of fieldsToAdd) {
          try {
            await view.fields.add(fieldName);
            Log.info(LOG_SOURCE, `Added field '${fieldName}' to default view`);
          } catch (viewError) {
            Log.warn(LOG_SOURCE, `Could not add field '${fieldName}' to view: ${(viewError as Error).message}`);
          }
        }
        
        Log.info(LOG_SOURCE, 'Completed adding fields to default view');
      } catch (error) {
        Log.warn(LOG_SOURCE, `Error updating default view: ${(error as Error).message}`);
      }
      
      setListValidationStatus(prev => ({
        ...prev,
        globalLinksExists: true,
        lastChecked: new Date()
      }));
      
      setLinkOperationStatus(prev => ({ 
        ...prev, 
        isCreating: false, 
        lastOperation: `Successfully created list: ${listTitle}` 
      }));
      
      Log.info(LOG_SOURCE, `SharePoint list created successfully: ${listTitle}`);
      return true;
      
    } catch (error) {
      setLinkOperationStatus(prev => ({ 
        ...prev, 
        isCreating: false, 
        lastOperation: `Failed to create list: ${(error as Error).message}` 
      }));
      Log.warn(LOG_SOURCE, `Error in function: ${(error as Error).message}`);
      return false;
    }
  }, [adminSettings.globalLinksListTitle, context]);

  const createUserSelectionsListSchema = useCallback(async (): Promise<boolean> => {
    try {
      Log.info(LOG_SOURCE, 'Creating User Link Selections list...');
      
      if (footerService && typeof (footerService as any).createUserSelectionsListOnly === 'function') {
        const result = await (footerService as any).createUserSelectionsListOnly();
        if (result) {
          Log.info(LOG_SOURCE, 'User Link Selections list created successfully');
          
              setListValidationStatus(prev => ({
            ...prev,
            userSelectionsExists: true,
            lastChecked: new Date()
          }));
          
          setLinkOperationStatus(prev => ({ 
            ...prev, 
            isCreating: false, 
            lastOperation: 'Successfully created User Link Selections list' 
          }));
          
          return true;
        }
      }
      
      Log.warn(LOG_SOURCE, 'Service does not support User Link Selections list creation');
      setLinkOperationStatus(prev => ({ 
        ...prev, 
        isCreating: false, 
        lastOperation: 'Failed to create User Link Selections list - service not available' 
      }));
      return false;
    } catch (error) {
      Log.error(LOG_SOURCE, error as Error);
      setLinkOperationStatus(prev => ({ 
        ...prev, 
        isCreating: false, 
        lastOperation: `Failed to create User Link Selections list: ${(error as Error).message}` 
      }));
      return false;
    }
  }, [footerService]);

  const isValidUrl = useCallback((url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }, []);

  const handleSavePersonalLink = useCallback(async () => {
    if (!newLinkFormData.title.trim()) {
      Log.warn(LOG_SOURCE, 'Title is required');
      return;
    }
    
    if (!newLinkFormData.url.trim()) {
      Log.warn(LOG_SOURCE, 'URL is required');
      return;
    }
    
    if (!isValidUrl(newLinkFormData.url)) {
      Log.warn(LOG_SOURCE, 'Invalid URL format');
      return;
    }

    if (newLinkFormData.title && newLinkFormData.url) {
      const isEditing = !!newLinkFormData.id;
      
      if (isEditing) {
        setMyLinks(prev => prev.map(link => {
          if (String(link.key) === String(newLinkFormData.id) || String((link.data as any)?.id) === String(newLinkFormData.id)) {
            return {
              ...link,
              name: newLinkFormData.title,
              href: newLinkFormData.url,
              title: newLinkFormData.description,
              iconProps: { iconName: newLinkFormData.iconName },
              target: userSettings.settings.clickBehavior === ClickBehavior.SameTab ? '_self' : '_blank',
              data: {
                ...(link.data || {}),
                category: newLinkFormData.category,
                iconUrl: newLinkFormData.iconUrl || undefined
              }
            };
          }
          return link;
        }));
        Log.info(LOG_SOURCE, `Updated personal link: ${newLinkFormData.title}`);
      } else {
        const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newLink: IContextualMenuItem = {
          key: `personal-${uniqueId}`,
          name: newLinkFormData.title,
          href: newLinkFormData.url,
          iconProps: { iconName: newLinkFormData.iconName },
          title: newLinkFormData.description,
          target: userSettings.settings.clickBehavior === ClickBehavior.SameTab ? '_self' : '_blank',
          data: {
            category: newLinkFormData.category,
            iconUrl: newLinkFormData.iconUrl || undefined,
            id: uniqueId
          }
        };
        
        setMyLinks(prev => [...prev, newLink]);
        Log.info(LOG_SOURCE, `Added new personal link: ${newLinkFormData.title}`);
      }

      try {
        if (footerService?.savePersonalLinks) {
          const userId = context?.pageContext?.user?.email || 'unknown';
          const currentLinks = isEditing 
            ? myLinks.map(link => {
                if (String(link.key) === String(newLinkFormData.id) || String((link.data as any)?.id) === String(newLinkFormData.id)) {
                  return {
                    id: parseInt((link.data as any)?.id) || undefined,
                    userId,
                    title: newLinkFormData.title,
                    url: newLinkFormData.url,
                    description: newLinkFormData.description,
                    iconName: newLinkFormData.iconName,
                    iconUrl: newLinkFormData.iconUrl,
                    category: newLinkFormData.category,
                    isActive: true
                  };
                }
                return {
                  id: parseInt((link.data as any)?.id) || undefined,
                  userId,
                  title: link.name || '',
                  url: link.href || '',
                  description: link.title || '',
                  iconName: link.iconProps?.iconName || 'Link',
                  iconUrl: (link.data as any)?.iconUrl || '',
                  category: (link.data as any)?.category || 'General',
                  isActive: true
                };
              })
            : [...myLinks.map(link => ({
                id: parseInt((link.data as any)?.id) || undefined,
                userId,
                title: link.name || '',
                url: link.href || '',
                description: link.title || '',
                iconName: link.iconProps?.iconName || 'Link',
                iconUrl: (link.data as any)?.iconUrl || '',
                category: (link.data as any)?.category || 'General',
                isActive: true
              })), {
                userId,
                title: newLinkFormData.title,
                url: newLinkFormData.url,
                description: newLinkFormData.description,
                iconName: newLinkFormData.iconName,
                iconUrl: newLinkFormData.iconUrl,
                category: newLinkFormData.category,
                isActive: true
              }];

          const saved = await footerService.savePersonalLinks(currentLinks);
          if (saved) {
            toast?.showSuccess(`Personal link ${isEditing ? 'updated' : 'saved'} successfully!`);
          } else {
            toast?.showError(`Failed to save personal link to storage`);
          }
        }
      } catch (error) {
        Log.error(LOG_SOURCE, error as Error);
        toast?.showError(`Error saving personal link: ${(error as Error).message}`);
      }
      
      setShowAddPersonalLinkForm(false);
      setNewLinkFormData({
        title: '',
        url: '',
        description: '',
        iconName: 'Link',
        iconUrl: '',
        category: 'General',
        targetUsers: [],
        isMandatory: false,
        validFrom: '',
        validTo: '',
        id: undefined
      });
    }
  }, [newLinkFormData, isValidUrl, userSettings.settings.clickBehavior, myLinks, footerService, toast]);


  

  const handleSaveOrganizationLink = useCallback(async () => {
    if (!newLinkFormData.title.trim()) {
      Log.warn(LOG_SOURCE, 'Title is required');
      return;
    }
    
    if (!newLinkFormData.url.trim()) {
      Log.warn(LOG_SOURCE, 'URL is required');
      return;
    }
    
    if (!isValidUrl(newLinkFormData.url)) {
      Log.warn(LOG_SOURCE, 'Invalid URL format');
      return;
    }

    try {
      setLinkOperationStatus(prev => ({ ...prev, isCreating: true, lastOperation: 'Saving organization link...' }));
      
      if (footerService && 'addGlobalLink' in footerService) {
        const globalLink = {
          title: newLinkFormData.title,
          url: newLinkFormData.url,
          description: newLinkFormData.description,
          iconName: newLinkFormData.iconName,
          iconUrl: newLinkFormData.iconUrl || undefined,
          category: newLinkFormData.category,
          isMandatory: newLinkFormData.isMandatory,
          isActive: true,
          order: organizationLinks.length + 1,
          targetUsers: newLinkFormData.targetUsers,
          validFrom: newLinkFormData.validFrom || null,
          validTo: newLinkFormData.validTo || null
        };
        
        let saved = false;
        
        if (newLinkFormData.id && typeof (footerService as any).updateGlobalLink === 'function') {
          Log.info(LOG_SOURCE, `Updating existing organization link with ID: ${newLinkFormData.id}`);
          saved = await (footerService as any).updateGlobalLink(newLinkFormData.id, globalLink);
          if (!saved) {
            Log.warn(LOG_SOURCE, 'Failed to update link in SharePoint, updating local state only');
          } else {
            Log.info(LOG_SOURCE, 'Successfully updated organization link in SharePoint');
          }
        } else {
          Log.info(LOG_SOURCE, 'Creating new organization link');
          saved = await (footerService as any).addGlobalLink(globalLink);
          if (!saved) {
            Log.warn(LOG_SOURCE, 'Failed to save new link to SharePoint, adding to local state only');
          } else {
            Log.info(LOG_SOURCE, 'Successfully saved new organization link to SharePoint');
          }
        }
      }
      
      if (newLinkFormData.id) {
        const updatedLink: IContextualMenuItem = {
          key: `org-${newLinkFormData.id}`,
          name: newLinkFormData.title,
          href: newLinkFormData.url,
          iconProps: { iconName: newLinkFormData.iconName },
          title: newLinkFormData.description,
          target: userSettings.settings.clickBehavior === ClickBehavior.SameTab ? '_self' : '_blank',
          data: {
            category: newLinkFormData.category,
            iconUrl: newLinkFormData.iconUrl || undefined,
            isMandatory: newLinkFormData.isMandatory || false,
            id: newLinkFormData.id
          }
        };
        
        setOrganizationLinks(prev => 
          prev.map(link => 
            (link.data as any)?.id === newLinkFormData.id ? updatedLink : link
          )
        );
        setAllAvailableOrgLinks(prev => 
          prev.map(link => 
            (link.data as any)?.id === newLinkFormData.id ? {
              ...updatedLink,
              key: `global-${newLinkFormData.id}`
            } : link
          )
        );
      } else {
        const tempId = Date.now();
        const newLink: IContextualMenuItem = {
          key: `org-${tempId}`,
          name: newLinkFormData.title,
          href: newLinkFormData.url,
          iconProps: { iconName: newLinkFormData.iconName },
          title: newLinkFormData.description,
          target: userSettings.settings.clickBehavior === ClickBehavior.SameTab ? '_self' : '_blank',
          data: {
            category: newLinkFormData.category,
            iconUrl: newLinkFormData.iconUrl || undefined,
            isMandatory: false,
            id: tempId
          }
        };
        
        setOrganizationLinks(prev => [...prev, newLink]);
        setAllAvailableOrgLinks(prev => [...prev, {
          ...newLink,
          key: `global-${tempId}`
        }]);
      }
      setShowAddOrgLinkForm(false);
      setNewLinkFormData({
        title: '',
        url: '',
        description: '',
        iconName: 'Link',
        iconUrl: '',
        category: 'General',
        targetUsers: [],
        isMandatory: false,
        validFrom: '',
        validTo: '',
        id: undefined // Clear the id to ensure next operation is treated as "add" not "edit"
      });
      
      setLinkOperationStatus(prev => ({ ...prev, isCreating: false, lastOperation: newLinkFormData.id ? 'Organization link updated successfully' : 'Organization link saved successfully' }));
      Log.info(LOG_SOURCE, `${newLinkFormData.id ? 'Updated' : 'Added new'} organization link: ${newLinkFormData.title}`);
    } catch (error) {
      setLinkOperationStatus(prev => ({ ...prev, isCreating: false, lastOperation: 'Failed to save organization link' }));
      Log.error(LOG_SOURCE, error as Error);
    }
  }, [newLinkFormData.title, newLinkFormData.url, newLinkFormData.description, newLinkFormData.iconName, newLinkFormData.iconUrl, newLinkFormData.category, newLinkFormData.isMandatory, newLinkFormData.targetUsers, newLinkFormData.validFrom, newLinkFormData.validTo, newLinkFormData.id, footerService, organizationLinks, isValidUrl, userSettings.settings.clickBehavior]);

  const handleUnifiedLinkManagement = useCallback(() => {
    setShowLinkManagementDialog(true);
  }, []);

  const handleUserSettings = useCallback(() => {
    setShowLinkManagementDialog(true);
    setActiveTab('settings');
  }, []);

  const closeLinkManagementDialog = useCallback(async () => {
    setShowLinkManagementDialog(false);
    
    if (legacyMode && editMyLinks) {
      try {
        await editMyLinks();
        Log.info(LOG_SOURCE, 'Legacy editMyLinks callback completed');
      } catch (error) {
        Log.error(LOG_SOURCE, error as Error);
      }
    }
  }, [legacyMode, editMyLinks, myLinks]);


  const filteredAllLinks = useMemo(() => {
    if (!searchQuery.trim()) return [];
    
    const query = searchQuery.toLowerCase();
    
    return allLinks.filter(link => 
      link.name?.toLowerCase().includes(query) || 
      (link as any).description?.toLowerCase().includes(query) ||
      (link as any).category?.toLowerCase().includes(query)
    );
  }, [allLinks, searchQuery]);

  const availableCategories = useMemo(() => {
    if (categories.categoryOptions.length > 0) {
      return [
        { key: 'all', text: 'All Categories' },
        ...categories.categoryOptions
      ];
    }
    
    const categorySet = new Set<string>();
    
    allAvailableOrgLinks.forEach(link => {
      const category = (link.data as any)?.category || 'General';
      categorySet.add(category);
    });
    
    if (categorySet.size === 0) {
      categorySet.add('General');
      categorySet.add('HR');
      categorySet.add('IT');
      categorySet.add('Finance');
      categorySet.add('Business Tools');
      categorySet.add('Professional Development');
    }
    
    return [
      { key: 'all', text: 'All Categories' },
      ...Array.from(categorySet).sort().map(cat => ({ key: cat.toLowerCase(), text: cat }))
    ];
  }, [categories.categoryOptions, allAvailableOrgLinks]);

  const handleSearchChange = useCallback((_, newValue?: string) => {
    setSearchQuery(newValue || '');
  }, []);

  const handleSearchClear = useCallback(() => {
    setSearchQuery('');
    setShowSearch(false);
  }, []);

  const toggleSearch = useCallback(() => {
    setShowSearch(!showSearch);
    if (showSearch) {
      setSearchQuery('');
    }
  }, [showSearch]);

  const handleAdminSettingChange = useCallback((key: string, value: any) => {
    setAdminSettings(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);



  const resetAllSettings = useCallback(async () => {
    setIsResetConfirmDialogOpen(false);
    try {
        setIsLoading(true);
        setLinkOperationStatus(prev => ({ ...prev, isCreating: true, lastOperation: 'Resetting all settings...' }));
        
        const defaultSettings: IAdminSettings = {
          globalLinksListTitle: 'Global Footer Links',
          enableUserSelectionStorage: true,
          maxLinksPerCategory: 10,
          enableSearch: true,
          enableAnimations: true,
          defaultViewMode: 'compact',
          bannerSize: 'medium',
          cacheDurationMinutes: 5,
          enableBackgroundRefresh: false,
          batchSize: 20,
          enableClickTracking: false,
          enablePopularDetection: false,
          popularThreshold: 50,
          restrictAdminFeatures: false,
          linkValidationLevel: 'basic',
          enableLinkExpiration: false,
          customCssClasses: '',
          customJavaScript: '',
          debugMode: false
        };
        
        setAdminSettings(defaultSettings);
        
        setLinkOperationStatus(prev => ({ ...prev, isCreating: false, lastOperation: 'Settings reset to defaults' }));
        Log.info(LOG_SOURCE, 'All settings reset to defaults');
        
      } catch (error) {
        Log.warn(LOG_SOURCE, `Error in function: ${(error as Error).message}`);
        setLinkOperationStatus(prev => ({ ...prev, isCreating: false, lastOperation: 'Failed to reset settings' }));
      } finally {
        setIsLoading(false);
      }
  }, []);


  const getBannerSizeClass = () => {
    switch (adminSettings.bannerSize) {
      case 'small': return styles.bannerSmall;
      case 'large': return styles.bannerLarge;
      default: return '';
    }
  };

  const renderLinkBadge = (link: IContextualMenuItem): React.ReactNode => {
    return <LinkBadgeRenderer link={link} />;
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
  };

  const filteredLinksByCategory = useMemo(() => {
    let allLinks = [...userAccess.filteredOrganizationLinks, ...myLinks];
    
    if (selectedCategory !== 'all') {
      allLinks = allLinks.filter(link => {
        const linkCategory = (link.data as any)?.category || 'General';
        return linkCategory.toLowerCase() === selectedCategory.toLowerCase();
      });
    }
    
    const sortOrder = userSettings.settings.sortOrder;
    
    return allLinks.sort((a, b) => {
      switch (sortOrder) {
        case SortOrder.Alphabetical:
          const nameA = (a.name || '').toLowerCase();
          const nameB = (b.name || '').toLowerCase();
          return nameA.localeCompare(nameB);
          
        case SortOrder.UsageFrequency:
          const statsA = analytics.getLinkStats(a.key || '');
          const statsB = analytics.getLinkStats(b.key || '');
          const usageA = statsA?.totalClicks || 0;
          const usageB = statsB?.totalClicks || 0;
          return usageB - usageA;
          
        case SortOrder.DateAdded:
          const dateA = (a.data as any)?.dateAdded || new Date(0);
          const dateB = (b.data as any)?.dateAdded || new Date(0);
          return new Date(dateB).getTime() - new Date(dateA).getTime();
          
        case SortOrder.Manual:
          const orderA = (a.data as any)?.sortOrder || 999;
          const orderB = (b.data as any)?.sortOrder || 999;
          return orderA - orderB;
          
        default:
          return 0;
      }
    });
  }, [userAccess.filteredOrganizationLinks, myLinks, selectedCategory, userSettings.settings.sortOrder, analytics]);

  const categoryDropdownOptions = useMemo(() => {
    const allLinks = [...userAccess.filteredOrganizationLinks, ...myLinks];
    const categorySet = new Set<string>();
    
    const options = [{ key: 'all', text: 'All Categories' }];
    
    allLinks.forEach(link => {
      const category = (link.data as any)?.category || 'General';
      categorySet.add(category);
    });
    
    Array.from(categorySet).sort().forEach(category => {
      options.push({ key: category.toLowerCase(), text: category });
    });
    
    return options;
  }, [userAccess.filteredOrganizationLinks, myLinks]);

  return (
    <footer className={`${styles.modernFooter} ${getBannerSizeClass()}`} role="contentinfo" aria-label="Collaboration footer">
      <div className={styles.footerContainer}>
        <FooterNotifications
          myLinksSaved={myLinksSaved}
          setMyLinksSaved={setMyLinksSaved}
        />

        <div className={styles.footerLayout}>
          <div className={styles.linksSection}>
            <FooterSearch
              showSearch={showSearch}
              searchQuery={searchQuery}
              handleSearchChange={handleSearchChange}
              handleSearchClear={handleSearchClear}
              filteredLinks={filteredAllLinks}
              handleLinkClick={handleLinkClickWithAnalytics}
              renderLinkBadge={renderLinkBadge}
            />

            {!showSearch && (
              <FooterContent
                allLinksToDisplay={filteredLinksByCategory}
                handleLinkClick={handleLinkClickWithAnalytics}
                renderLinkBadge={renderLinkBadge}
                isLoading={isLoading}
                userSettings={userSettings.settings}
              />
            )}
          </div>

          <div className={styles.actionsSection}>
            <FooterActions
              showSearch={showSearch}
              toggleSearch={toggleSearch}
              handleUnifiedLinkManagement={handleUnifiedLinkManagement}
              handleUserSettings={handleUserSettings}
              isLoading={isLoading}
              sharePointTheme={sharePointTheme}
              selectedCategory={selectedCategory}
              categoryOptions={categoryDropdownOptions}
              onCategoryChange={handleCategoryChange}
            />
          </div>
        </div>

        <LinkManagementDialog
          isOpen={showLinkManagementDialog}
          onClose={closeLinkManagementDialog}
          context={context as any}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          
          personalLinks={myLinks}
          onPersonalLinksChange={setMyLinks}
          personalLinksState={{
            searchQuery: personalLinksSearchQuery,
            selectedCategory: personalLinksSelectedCategory,
            sortBy: personalLinksSortBy,
            sortDirection: personalLinksSortDirection
          }}
          onPersonalLinksStateChange={(state) => {
            setPersonalLinksSearchQuery(state.searchQuery);
            setPersonalLinksSelectedCategory(state.selectedCategory);
            setPersonalLinksSortBy(state.sortBy);
            setPersonalLinksSortDirection(state.sortDirection);
          }}
          
          organizationLinks={organizationLinks}
          allAvailableOrgLinks={allAvailableOrgLinks}
          onOrganizationLinksChange={setOrganizationLinks}
          organizationLinksState={{
            searchQuery: organizationSearchQuery,
            selectedCategory: selectedCategory,
            sortBy: sortBy,
            sortDirection: sortDirection,
            currentPage: currentPage,
            itemsPerPage: itemsPerPage
          }}
          onOrganizationLinksStateChange={(state) => {
            setOrganizationSearchQuery(state.searchQuery);
            setSelectedCategory(state.selectedCategory);
            setSortBy(state.sortBy);
            setSortDirection(state.sortDirection);
            setCurrentPage(state.currentPage);
          }}
          
          showAddPersonalLinkForm={showAddPersonalLinkForm}
          showAddOrgLinkForm={showAddOrgLinkForm}
          newLinkFormData={newLinkFormData}
          onShowAddPersonalLinkForm={setShowAddPersonalLinkForm}
          onShowAddOrgLinkForm={setShowAddOrgLinkForm}
          onNewLinkFormDataChange={setNewLinkFormData}
          onSavePersonalLink={handleSavePersonalLink}
          onSaveOrganizationLink={handleSaveOrganizationLink}
          
          isAdmin={isAdmin}
          adminSettings={adminSettings}
          onAdminSettingChange={handleAdminSettingChange}
          listValidationStatus={listValidationStatus}
          linkOperationStatus={linkOperationStatus}
          
          legacyMode={legacyMode}
          isLoading={isLoading}
          availableCategories={availableCategories}
          
          onLinksImported={handleLinksImported}
          onStatusUpdate={handleStatusUpdate}
          onCategoriesChanged={() => {
            categories.refreshCategories();
            setSelectedCategory('all');
            setPersonalLinksSelectedCategory('all');
          }}
          
          onCreateGlobalLinksList={createSharePointLists}
          onCreateUserSelectionsList={async () => { await createUserSelectionsListSchema(); }}
          onValidateLists={validateSharePointLists}
          
          onUserSettingsChanged={(newSettings) => {
            userSettings.updateSettings(newSettings);
            toast.showSuccess('Settings saved successfully!');
          }}
          currentUserSettings={userSettings.settings}
          
          footerService={footerService}
          onRefreshOrganizationLinks={refreshOrganizationLinks}
          
          onCreateCategory={handleCreateCategory}
          onCategoriesRefresh={handleCategoriesRefresh}
        />

        {/* Reset Confirmation Dialog */}
        <Dialog
          hidden={!isResetConfirmDialogOpen}
          onDismiss={() => setIsResetConfirmDialogOpen(false)}
          dialogContentProps={{
            type: DialogType.normal,
            title: 'Reset All Settings',
            subText: 'Are you sure you want to reset all settings to defaults? This action cannot be undone.'
          }}
          modalProps={{
            isBlocking: true,
            styles: { main: { maxWidth: 450 } }
          }}
        >
          <DialogFooter>
            <PrimaryButton 
              onClick={resetAllSettings} 
              text={strings.Reset} 
              iconProps={{ iconName: 'Refresh' }}
            />
            <DefaultButton 
              onClick={() => setIsResetConfirmDialogOpen(false)} 
              text={strings.Cancel} 
            />
          </DialogFooter>
        </Dialog>

        <ToastContainer 
          messages={toast.messages}
          onDismiss={toast.dismissToast}
        />
      </div>
    </footer>
  );
};

export default ModernCollabFooter;