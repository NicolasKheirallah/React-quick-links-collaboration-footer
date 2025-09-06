import { useState, useMemo } from 'react';
import { IContextualMenuItem } from '@fluentui/react/lib/ContextualMenu';

export interface IAdminSettings {
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

export interface ILinkOperationStatus {
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  lastOperation: string;
}

export interface IListValidationStatus {
  globalLinksExists: boolean;
  userSelectionsExists: boolean;
  isValidating: boolean;
  lastChecked: Date | null;
}

export interface INewLinkFormData {
  title: string;
  url: string;
  iconName: string;
  category: string;
  description: string;
  targetUsers: any[];
  isNewCategory: boolean;
  newCategoryName: string;
}

export interface ICollabFooterState {
  myLinks: IContextualMenuItem[];
  setMyLinks: React.Dispatch<React.SetStateAction<IContextualMenuItem[]>>;
  organizationLinks: IContextualMenuItem[];
  setOrganizationLinks: React.Dispatch<React.SetStateAction<IContextualMenuItem[]>>;
  allAvailableOrgLinks: IContextualMenuItem[];
  setAllAvailableOrgLinks: React.Dispatch<React.SetStateAction<IContextualMenuItem[]>>;
  
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  myLinksSaved: boolean | null;
  setMyLinksSaved: React.Dispatch<React.SetStateAction<boolean | null>>;
  
  activeDropdown: string | null;
  setActiveDropdown: React.Dispatch<React.SetStateAction<string | null>>;
  showSearch: boolean;
  setShowSearch: React.Dispatch<React.SetStateAction<boolean>>;
  activeTab: string;
  setActiveTab: React.Dispatch<React.SetStateAction<string>>;
  
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  organizationSearchQuery: string;
  setOrganizationSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  personalLinksSearchQuery: string;
  setPersonalLinksSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  
  selectedCategory: string;
  setSelectedCategory: React.Dispatch<React.SetStateAction<string>>;
  personalLinksSelectedCategory: string;
  setPersonalLinksSelectedCategory: React.Dispatch<React.SetStateAction<string>>;
  sortBy: string;
  setSortBy: React.Dispatch<React.SetStateAction<string>>;
  sortDirection: 'asc' | 'desc';
  setSortDirection: React.Dispatch<React.SetStateAction<'asc' | 'desc'>>;
  personalLinksSortBy: string;
  setPersonalLinksSortBy: React.Dispatch<React.SetStateAction<string>>;
  personalLinksSortDirection: 'asc' | 'desc';
  setPersonalLinksSortDirection: React.Dispatch<React.SetStateAction<'asc' | 'desc'>>;
  
  currentPage: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  itemsPerPage: number;
  
  showLinkManagementDialog: boolean;
  setShowLinkManagementDialog: React.Dispatch<React.SetStateAction<boolean>>;
  showAddPersonalLinkForm: boolean;
  setShowAddPersonalLinkForm: React.Dispatch<React.SetStateAction<boolean>>;
  showAddOrgLinkForm: boolean;
  setShowAddOrgLinkForm: React.Dispatch<React.SetStateAction<boolean>>;
  showIconGallery: boolean;
  setShowIconGallery: React.Dispatch<React.SetStateAction<boolean>>;
  isResetConfirmDialogOpen: boolean;
  setIsResetConfirmDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  
  isAdmin: boolean;
  setIsAdmin: React.Dispatch<React.SetStateAction<boolean>>;
  isInEditMode: boolean;
  setIsInEditMode: React.Dispatch<React.SetStateAction<boolean>>;
  adminSettings: IAdminSettings;
  setAdminSettings: React.Dispatch<React.SetStateAction<IAdminSettings>>;
  listValidationStatus: IListValidationStatus;
  setListValidationStatus: React.Dispatch<React.SetStateAction<IListValidationStatus>>;
  linkOperationStatus: ILinkOperationStatus;
  setLinkOperationStatus: React.Dispatch<React.SetStateAction<ILinkOperationStatus>>;
  
  newLinkFormData: INewLinkFormData;
  setNewLinkFormData: React.Dispatch<React.SetStateAction<INewLinkFormData>>;
  
  allLinks: IContextualMenuItem[];
}

export const useCollabFooterState = (
  initialMyLinks: IContextualMenuItem[] = [],
  sharedLinks: IContextualMenuItem[] = []
): ICollabFooterState => {
  const [myLinks, setMyLinks] = useState<IContextualMenuItem[]>(initialMyLinks);
  const [organizationLinks, setOrganizationLinks] = useState<IContextualMenuItem[]>(sharedLinks);
  const [allAvailableOrgLinks, setAllAvailableOrgLinks] = useState<IContextualMenuItem[]>([]);
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [myLinksSaved, setMyLinksSaved] = useState<boolean | null>(null);
  
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('personal');
  
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [organizationSearchQuery, setOrganizationSearchQuery] = useState<string>('');
  const [personalLinksSearchQuery, setPersonalLinksSearchQuery] = useState<string>('');
  
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [personalLinksSelectedCategory, setPersonalLinksSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [personalLinksSortBy, setPersonalLinksSortBy] = useState<string>('name');
  const [personalLinksSortDirection, setPersonalLinksSortDirection] = useState<'asc' | 'desc'>('asc');
  
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 20;
  
  const [showLinkManagementDialog, setShowLinkManagementDialog] = useState<boolean>(false);
  const [showAddPersonalLinkForm, setShowAddPersonalLinkForm] = useState<boolean>(false);
  const [showAddOrgLinkForm, setShowAddOrgLinkForm] = useState<boolean>(false);
  const [showIconGallery, setShowIconGallery] = useState<boolean>(false);
  const [isResetConfirmDialogOpen, setIsResetConfirmDialogOpen] = useState<boolean>(false);
  
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isInEditMode, setIsInEditMode] = useState<boolean>(false);
  const [adminSettings, setAdminSettings] = useState<IAdminSettings>({
    globalLinksListTitle: 'Global Footer Links',
    enableUserSelectionStorage: true,
    maxLinksPerCategory: 50,
    enableSearch: true,
    enableAnimations: true,
    defaultViewMode: 'icons',
    cacheDurationMinutes: 30,
    enableBackgroundRefresh: true,
    batchSize: 20,
    enableClickTracking: true,
    enablePopularDetection: true,
    popularThreshold: 10,
    restrictAdminFeatures: false,
    linkValidationLevel: 'basic',
    enableLinkExpiration: false,
    customCssClasses: '',
    customJavaScript: '',
    debugMode: false,
    bannerSize: 'medium'
  });
  
  const [listValidationStatus, setListValidationStatus] = useState<IListValidationStatus>({
    globalLinksExists: false,
    userSelectionsExists: false,
    isValidating: false,
    lastChecked: null
  });
  
  const [linkOperationStatus, setLinkOperationStatus] = useState<ILinkOperationStatus>({
    isCreating: false,
    isUpdating: false,
    isDeleting: false,
    lastOperation: ''
  });
  
  const [newLinkFormData, setNewLinkFormData] = useState<INewLinkFormData>({
    title: '',
    url: '',
    iconName: 'Link',
    category: 'personal',
    description: '',
    targetUsers: [],
    isNewCategory: false,
    newCategoryName: ''
  });
  const allLinks = useMemo(() => [...organizationLinks, ...myLinks], [organizationLinks, myLinks]);
  
  return {
    myLinks,
    setMyLinks,
    organizationLinks,
    setOrganizationLinks,
    allAvailableOrgLinks,
    setAllAvailableOrgLinks,
    
    isLoading,
    setIsLoading,
    myLinksSaved,
    setMyLinksSaved,
    
    activeDropdown,
    setActiveDropdown,
    showSearch,
    setShowSearch,
    activeTab,
    setActiveTab,
    
    searchQuery,
    setSearchQuery,
    organizationSearchQuery,
    setOrganizationSearchQuery,
    personalLinksSearchQuery,
    setPersonalLinksSearchQuery,
    
    selectedCategory,
    setSelectedCategory,
    personalLinksSelectedCategory,
    setPersonalLinksSelectedCategory,
    sortBy,
    setSortBy,
    sortDirection,
    setSortDirection,
    personalLinksSortBy,
    setPersonalLinksSortBy,
    personalLinksSortDirection,
    setPersonalLinksSortDirection,
    
    currentPage,
    setCurrentPage,
    itemsPerPage,
    
    showLinkManagementDialog,
    setShowLinkManagementDialog,
    showAddPersonalLinkForm,
    setShowAddPersonalLinkForm,
    showAddOrgLinkForm,
    setShowAddOrgLinkForm,
    showIconGallery,
    setShowIconGallery,
    isResetConfirmDialogOpen,
    setIsResetConfirmDialogOpen,
    
    isAdmin,
    setIsAdmin,
    isInEditMode,
    setIsInEditMode,
    adminSettings,
    setAdminSettings,
    listValidationStatus,
    setListValidationStatus,
    linkOperationStatus,
    setLinkOperationStatus,
    
    newLinkFormData,
    setNewLinkFormData,
    
    allLinks
  };
};