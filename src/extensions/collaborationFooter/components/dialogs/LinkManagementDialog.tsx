import * as React from 'react';
import { useState, Suspense, useCallback, useEffect, useRef } from 'react';
import * as strings from 'CollaborationFooterApplicationCustomizerStrings';
import { Panel, PanelType } from '@fluentui/react/lib/Panel';
import { Pivot, PivotItem } from '@fluentui/react/lib/Pivot';
import { DefaultButton, PrimaryButton } from '@fluentui/react/lib/Button';
import { IContextualMenuItem } from '@fluentui/react/lib/ContextualMenu';
import { WebPartContext } from '@microsoft/sp-webpart-base';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';

const AdminNavigationPanel = React.lazy(() => 
  import('../admin/AdminNavigationPanel').then(module => ({ default: module.AdminNavigationPanel }))
);
import { PersonalLinksTab } from './tabs/PersonalLinksTab';
import { OrganizationLinksTab } from './tabs/OrganizationLinksTab';
import { UserSettingsTab } from './tabs/UserSettingsTab';
import { useSafeTimeout } from '../../hooks/useSafeTimeout';
import { IconGallery } from '../shared/IconGallery';
import styles from './LinkManagementDialog.module.scss';

export interface ILinkManagementDialogProps {
  isOpen: boolean;
  onClose: () => void;
  context: WebPartContext;
  activeTab: string;
  onTabChange: (tab: string) => void;
  
  // Personal Links
  personalLinks: IContextualMenuItem[];
  onPersonalLinksChange: (links: IContextualMenuItem[]) => void;
  personalLinksState: {
    searchQuery: string;
    selectedCategory: string;
    sortBy: string;
    sortDirection: 'asc' | 'desc';
  };
  onPersonalLinksStateChange: (state: any) => void;
  
  // Organization Links
  organizationLinks: IContextualMenuItem[];
  allAvailableOrgLinks: IContextualMenuItem[];
  onOrganizationLinksChange: (links: IContextualMenuItem[]) => void;
  organizationLinksState: {
    searchQuery: string;
    selectedCategory: string;
    sortBy: string;
    sortDirection: 'asc' | 'desc';
    currentPage: number;
    itemsPerPage: number;
  };
  onOrganizationLinksStateChange: (state: any) => void;
  
  // Forms
  showAddPersonalLinkForm: boolean;
  showAddOrgLinkForm: boolean;
  newLinkFormData: any;
  onShowAddPersonalLinkForm: (show: boolean) => void;
  onShowAddOrgLinkForm: (show: boolean) => void;
  onNewLinkFormDataChange: (data: any) => void;
  onSavePersonalLink: () => void;
  onSaveOrganizationLink: () => void;
  onSaveLinks?: (links: IContextualMenuItem[]) => Promise<boolean>;
  
  // Admin
  isAdmin: boolean;
  adminSettings: any;
  onAdminSettingChange: (key: string, value: any) => void;
  listValidationStatus: any;
  linkOperationStatus: any;
  legacyMode: boolean;
  isLoading: boolean;
  availableCategories: any[];
  onLinksImported: (links: IContextualMenuItem[]) => Promise<void>;
  onStatusUpdate: (message: string, isError?: boolean) => void;
  onCategoriesChanged: () => void;
  
  // SharePoint operations
  onCreateGlobalLinksList: () => Promise<void>;
  onCreateUserSelectionsList: () => Promise<void>;
  onValidateLists: () => Promise<void>;
  
  // User Settings
  onUserSettingsChanged?: (settings: any) => void;
  currentUserSettings?: any;
  
  // Services
  footerService?: any;
  onRefreshOrganizationLinks?: () => Promise<void>;
  
  // Category management
  onCreateCategory?: (categoryName: string) => Promise<boolean>;
  onCategoriesRefresh?: () => Promise<void>;
}

export const LinkManagementDialog: React.FC<ILinkManagementDialogProps> = ({
  isOpen,
  onClose,
  context,
  activeTab,
  onTabChange,
  personalLinks,
  onPersonalLinksChange,
  personalLinksState,
  onPersonalLinksStateChange,
  organizationLinks,
  allAvailableOrgLinks,
  onOrganizationLinksChange,
  organizationLinksState,
  onOrganizationLinksStateChange,
  showAddPersonalLinkForm,
  showAddOrgLinkForm,
  newLinkFormData,
  onShowAddPersonalLinkForm,
  onShowAddOrgLinkForm,
  onNewLinkFormDataChange,
  onSavePersonalLink,
  onSaveOrganizationLink,
  onSaveLinks,
  isAdmin,
  adminSettings,
  onAdminSettingChange,
  listValidationStatus,
  linkOperationStatus,
  legacyMode,
  isLoading,
  availableCategories,
  onLinksImported,
  onStatusUpdate,
  onCategoriesChanged,
  onCreateGlobalLinksList,
  onCreateUserSelectionsList,
  onValidateLists,
  onUserSettingsChanged,
  currentUserSettings,
  footerService,
  onRefreshOrganizationLinks,
  onCreateCategory,
  onCategoriesRefresh
}) => {
  const { setSafeTimeout } = useSafeTimeout();
  const [showIconGallery, setShowIconGallery] = useState<boolean>(false);

  const handleSaveAndClose = () => {
    onStatusUpdate('Changes saved successfully');
    setSafeTimeout(() => onStatusUpdate(''), 3000);
    onClose();
  };

  const handleIconSelect = (iconName: string) => {
    onNewLinkFormDataChange({ ...newLinkFormData, iconName, iconUrl: '' }); // Clear iconUrl when using built-in icon
    setShowIconGallery(false);
  };

  // Track blob URLs for cleanup to prevent memory leaks
  const blobUrlsRef = useRef<string[]>([]);
  
  // Clean up blob URLs when component unmounts
  useEffect(() => {
    return () => {
      blobUrlsRef.current.forEach(url => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
      blobUrlsRef.current = [];
    };
  }, []);
  
  const handleCustomIconUpload = useCallback((file: File) => {
    try {
      // Revoke previous blob URL if exists to prevent memory leak
      if (newLinkFormData.iconUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(newLinkFormData.iconUrl);
        blobUrlsRef.current = blobUrlsRef.current.filter(url => url !== newLinkFormData.iconUrl);
      }
      
      // Create a blob URL for the uploaded image
      const iconUrl = URL.createObjectURL(file);
      blobUrlsRef.current.push(iconUrl);
      
      // Update form data with the custom icon URL and clear built-in iconName
      onNewLinkFormDataChange({ 
        ...newLinkFormData, 
        iconUrl, 
        iconName: '' // Clear built-in icon when using custom upload
      });
      
      setShowIconGallery(false);
      onStatusUpdate(`Custom icon "${file.name}" uploaded successfully`);
    } catch (error) {
      onStatusUpdate(`Failed to upload icon: ${(error as Error).message}`, true);
    }
  }, [newLinkFormData, onNewLinkFormDataChange, onStatusUpdate]);

  return (
    <>
      <Panel
        isOpen={isOpen}
        onDismiss={showIconGallery ? undefined : onClose}
        type={PanelType.extraLarge}
        headerText={strings.ManageLinks}
        closeButtonAriaLabel={strings.Close}
        className={styles.linkManagementPanel}
        layerProps={{
          styles: {
            root: {
              zIndex: 1000
            }
          }
        }}
        styles={{
          main: {
            zIndex: 1000
          },
          content: {
            zIndex: 1001
          },
          scrollableContent: {
            zIndex: 1001
          }
        }}
        focusTrapZoneProps={{
          isClickableOutsideFocusTrap: showIconGallery,
          forceFocusInsideTrap: !showIconGallery,
          disableFirstFocus: showIconGallery
        }}
      >
        <div className={styles.panelContent}>
          <div className={styles.pivotContainer}>
            <Pivot
              selectedKey={activeTab}
              onLinkClick={(item) => onTabChange(item?.props.itemKey || 'personal')}
              headersOnly={false}
              getTabId={(itemKey) => `pivot-${itemKey}`}
              styles={{
                root: { marginBottom: '16px' },
                linkIsSelected: { 
                  fontSize: '16px', 
                  fontWeight: '600',
                  borderBottom: '2px solid var(--color-primary)'
                }
              }}
            >
              <PivotItem
                headerText={`Personal Links (${personalLinks.length})`}
                itemKey="personal"
                itemIcon="Contact"
              >
                <PersonalLinksTab
                  links={personalLinks}
                  onLinksChange={onPersonalLinksChange}
                  state={personalLinksState}
                  onStateChange={onPersonalLinksStateChange}
                  showAddForm={showAddPersonalLinkForm}
                  onShowAddForm={onShowAddPersonalLinkForm}
                  newLinkFormData={newLinkFormData}
                  onFormDataChange={onNewLinkFormDataChange}
                  onSave={onSavePersonalLink}
                  availableCategories={availableCategories}
                  onShowIconGallery={() => setShowIconGallery(true)}
                  isLoading={linkOperationStatus.isCreating}
                  onSaveLinks={onSaveLinks}
                  footerService={footerService}
                  onCreateCategory={onCreateCategory}
                  onCategoriesRefresh={onCategoriesRefresh}
                />
              </PivotItem>

              {!legacyMode && (
                <PivotItem
                  headerText={`Organization Links (${allAvailableOrgLinks.length})`}
                  itemKey="organization"
                  itemIcon="BulkUpload"
                >
                  <OrganizationLinksTab
                    links={organizationLinks}
                    allAvailableLinks={allAvailableOrgLinks}
                    onLinksChange={onOrganizationLinksChange}
                    state={organizationLinksState}
                    onStateChange={onOrganizationLinksStateChange}
                    showAddForm={showAddOrgLinkForm}
                    onShowAddForm={onShowAddOrgLinkForm}
                    newLinkFormData={newLinkFormData}
                    onFormDataChange={onNewLinkFormDataChange}
                    onSave={onSaveOrganizationLink}
                    isAdmin={isAdmin}
                    availableCategories={availableCategories}
                    onShowIconGallery={() => setShowIconGallery(true)}
                    isLoading={linkOperationStatus.isCreating}
                    context={context}
                    footerService={footerService}
                    onStatusUpdate={onStatusUpdate}
                    onRefreshOrganizationLinks={onRefreshOrganizationLinks}
                    onCreateCategory={onCreateCategory}
                    onCategoriesRefresh={onCategoriesRefresh}
                  />
                </PivotItem>
              )}

              {isAdmin && !legacyMode && (
                <PivotItem
                  headerText={strings.Settings}
                  itemKey="settings"
                  itemIcon="Settings"
                >
                  <UserSettingsTab
                    context={context}
                    onSettingsChanged={onUserSettingsChanged || (() => {})}
                    currentSettings={currentUserSettings}
                  />
                </PivotItem>
              )}

              {isAdmin && !legacyMode && (
                <PivotItem
                  headerText={strings.AdminPanel}
                  itemKey="admin"
                  itemIcon="Settings"
                >
                  <div className={styles.tabContent}>
                    <Suspense fallback={
                      <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
                        <Spinner size={SpinnerSize.large} label={strings.Loading} />
                      </div>
                    }>
                      <AdminNavigationPanel
                        context={context}
                        adminSettings={adminSettings}
                        onAdminSettingChange={onAdminSettingChange}
                        listValidationStatus={listValidationStatus}
                        onCreateGlobalLinksList={onCreateGlobalLinksList}
                        onCreateUserSelectionsList={onCreateUserSelectionsList}
                        onValidateLists={onValidateLists}
                        organizationLinks={organizationLinks}
                        personalLinks={personalLinks}
                        onLinksImported={onLinksImported}
                        onStatusUpdate={onStatusUpdate}
                        onCategoriesChanged={onCategoriesChanged}
                        isLoading={isLoading}
                      />
                    </Suspense>
                  </div>
                </PivotItem>
              )}
            </Pivot>
          </div>
          
          <div className={styles.dialogActions}>
            <PrimaryButton
              text={strings.Save}
              onClick={handleSaveAndClose}
              disabled={linkOperationStatus.isCreating || linkOperationStatus.isUpdating || linkOperationStatus.isDeleting}
              styles={{ root: { marginRight: '8px' } }}
            />
            <DefaultButton
              text={strings.Cancel}
              onClick={onClose}
              disabled={linkOperationStatus.isCreating || linkOperationStatus.isUpdating || linkOperationStatus.isDeleting}
            />
          </div>
        </div>
      </Panel>
      <IconGallery
        isOpen={showIconGallery}
        selectedIcon={newLinkFormData?.iconName}
        onIconSelect={handleIconSelect}
        onCustomIconUpload={handleCustomIconUpload}
        onClose={() => setShowIconGallery(false)}
      />
    </>
  );
};