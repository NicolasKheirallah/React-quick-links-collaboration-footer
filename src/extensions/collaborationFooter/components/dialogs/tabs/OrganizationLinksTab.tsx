import * as React from 'react';
import * as strings from '../../../loc/myStrings';
import { DefaultButton, PrimaryButton } from '@fluentui/react/lib/Button';
import { IContextualMenuItem } from '@fluentui/react/lib/ContextualMenu';
import { WebPartContext } from '@microsoft/sp-webpart-base';
import { Log } from '@microsoft/sp-core-library';
import { SearchAndFilterControls } from '../../shared/SearchAndFilterControls';
import { LinkList } from '../../shared/LinkList';
import { OrganizationLinkForm } from '../../forms/OrganizationLinkForm';
import { useBulkSelection } from '../../../hooks/useBulkSelection';
import styles from './OrganizationLinksTab.module.scss';

const LOG_SOURCE = 'OrganizationLinksTab';

export interface IOrganizationLinksTabProps {
  links: IContextualMenuItem[];
  allAvailableLinks: IContextualMenuItem[];
  onLinksChange: (links: IContextualMenuItem[]) => void;
  state: {
    searchQuery: string;
    selectedCategory: string;
    sortBy: string;
    sortDirection: 'asc' | 'desc';
    currentPage: number;
    itemsPerPage: number;
  };
  onStateChange: (state: any) => void;
  showAddForm: boolean;
  onShowAddForm: (show: boolean) => void;
  newLinkFormData: any;
  onFormDataChange: (data: any) => void;
  onSave: () => void;
  isAdmin: boolean;
  availableCategories: any[];
  onShowIconGallery: () => void;
  isLoading: boolean;
  context: WebPartContext;
  footerService?: any; // For saving organization links
  onStatusUpdate?: (message: string, isError?: boolean) => void; // For user notifications
  onRefreshOrganizationLinks?: () => Promise<void>; // For refreshing data after deletion
  onCreateCategory?: (categoryName: string) => Promise<boolean>; // For creating new categories
  onCategoriesRefresh?: () => Promise<void>; // For refreshing categories after creation
}

export const OrganizationLinksTab: React.FC<IOrganizationLinksTabProps> = ({
  links,
  allAvailableLinks,
  onLinksChange,
  state,
  onStateChange,
  showAddForm,
  onShowAddForm,
  newLinkFormData,
  onFormDataChange,
  onSave,
  isAdmin,
  availableCategories,
  onShowIconGallery,
  isLoading,
  context,
  footerService,
  onStatusUpdate,
  onRefreshOrganizationLinks,
  onCreateCategory,
  onCategoriesRefresh
}) => {
  const bulkSelection = useBulkSelection();

  // Filter and sort links
  const filteredAndSortedLinks = React.useMemo(() => {
    let filtered = [...allAvailableLinks];

    // Apply category filter
    if (state.selectedCategory !== 'all') {
      filtered = filtered.filter(link => {
        const linkCategory = (link.data as any)?.category?.toLowerCase() || 'general';
        return linkCategory === state.selectedCategory.toLowerCase();
      });
    }

    // Apply search filter
    if (state.searchQuery.trim()) {
      const query = state.searchQuery.toLowerCase().trim();
      filtered = filtered.filter(link =>
        link.name?.toLowerCase().includes(query) ||
        (link.data as any)?.description?.toLowerCase().includes(query) ||
        (link.data as any)?.category?.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue = '';
      let bValue = '';

      switch (state.sortBy) {
        case 'category':
          aValue = (a.data as any)?.category || 'General';
          bValue = (b.data as any)?.category || 'General';
          break;
        case 'mandatory':
          aValue = (a.data as any)?.isMandatory ? 'Mandatory' : 'Optional';
          bValue = (b.data as any)?.isMandatory ? 'Mandatory' : 'Optional';
          break;
        default:
          aValue = a.name || '';
          bValue = b.name || '';
      }

      const comparison = aValue.localeCompare(bValue);
      return state.sortDirection === 'asc' ? comparison : -comparison;
    });

    // Apply pagination for display
    const totalItems = filtered.length;
    const startIndex = (state.currentPage - 1) * state.itemsPerPage;
    const endIndex = startIndex + state.itemsPerPage;
    const paginatedLinks = filtered.slice(startIndex, endIndex);

    return {
      links: paginatedLinks,
      totalItems,
      totalPages: Math.ceil(totalItems / state.itemsPerPage)
    };
  }, [allAvailableLinks, state.searchQuery, state.selectedCategory, state.sortBy, state.sortDirection, state.currentPage, state.itemsPerPage]);

  const { links: displayedLinks, totalItems, totalPages } = filteredAndSortedLinks;

  const sortOptions = [
    { key: 'name', text: 'Name' },
    { key: 'category', text: 'Category' },
    { key: 'mandatory', text: 'Type (Mandatory/Optional)' }
  ];

  const handleEditLink = (link: IContextualMenuItem) => {
    // Populate form data with link data for editing
    const linkData = {
      title: link.name || '',
      url: link.href || '',
      description: (link.data as any)?.description || '',
      iconName: (link.data as any)?.iconName || 'Link',
      iconUrl: (link.data as any)?.iconUrl || '',
      category: (link.data as any)?.category || 'General',
      isMandatory: (link.data as any)?.isMandatory || false,
      targetUsers: (link.data as any)?.targetUsers || [],
      validFrom: (link.data as any)?.validFrom || '',
      validTo: (link.data as any)?.validTo || '',
      id: (link.data as any)?.id
    };
    
    onFormDataChange(linkData);
    onShowAddForm(true);
  };

  const handleSelectAll = () => {
    bulkSelection.selectAllItems(displayedLinks);
  };

  const handleDeselectAll = () => {
    bulkSelection.deselectAllItems();
  };

  const handleDeleteSelected = async () => {
    const selectedKeys = Array.from(bulkSelection.selectedItems);
    const linksToDelete = allAvailableLinks.filter(link => selectedKeys.includes(link.key || ''));
    
    if (linksToDelete.length === 0) {
      Log.warn(LOG_SOURCE, 'No links selected for deletion');
      return;
    }
    
    try {
      // Extract link IDs from the selected links
      const linkIds = linksToDelete
        .map(link => (link.data as any)?.id)
        .filter(id => id && typeof id === 'number') as number[];
      
      if (linkIds.length === 0) {
        Log.warn(LOG_SOURCE, 'No valid link IDs found for deletion');
        // Still update UI to remove items without valid IDs
        const updatedLinks = allAvailableLinks.filter(link => !selectedKeys.includes(link.key || ''));
        onLinksChange(updatedLinks);
        bulkSelection.deselectAllItems();
        return;
      }

      // Use footerService if available
      if (footerService && typeof footerService.deleteGlobalLinks === 'function') {
        Log.info(LOG_SOURCE, `Attempting to delete ${linkIds.length} organization links via service`);
        const success = await footerService.deleteGlobalLinks(linkIds);
        
        if (success) {
          Log.info(LOG_SOURCE, 'Successfully deleted organization links from SharePoint');
          
          // Refresh data from server to ensure UI is in sync
          if (onRefreshOrganizationLinks) {
            await onRefreshOrganizationLinks();
          } else {
            // Fallback to local state update if refresh not available
            const updatedLinks = allAvailableLinks.filter(link => !selectedKeys.includes(link.key || ''));
            onLinksChange(updatedLinks);
          }
          
          bulkSelection.deselectAllItems();
          
          // Show success notification
          if (onStatusUpdate) {
            const count = linkIds.length;
            onStatusUpdate(`Successfully deleted ${count} organization link${count > 1 ? 's' : ''}`);
          }
        } else {
          Log.error(LOG_SOURCE, new Error('Failed to delete selected organization links from SharePoint - updating UI anyway'));
          // Update UI even if backend fails (user feedback)
          const updatedLinks = allAvailableLinks.filter(link => !selectedKeys.includes(link.key || ''));
          onLinksChange(updatedLinks);
          bulkSelection.deselectAllItems();
          
          // Show error notification
          if (onStatusUpdate) {
            onStatusUpdate('Failed to delete organization links from server, but removed from display', true);
          }
        }
      } else {
        Log.warn(LOG_SOURCE, 'Footer service does not support delete operations - updating local state only');
        const updatedLinks = allAvailableLinks.filter(link => !selectedKeys.includes(link.key || ''));
        onLinksChange(updatedLinks);
        bulkSelection.deselectAllItems();
        
        // Show warning notification
        if (onStatusUpdate) {
          const count = linkIds.length || linksToDelete.length;
          onStatusUpdate(`Removed ${count} link${count > 1 ? 's' : ''} from display (local only - not saved to server)`, true);
        }
      }
    } catch (error) {
      Log.error(LOG_SOURCE, error as Error);
      // Still update UI to provide user feedback
      const updatedLinks = allAvailableLinks.filter(link => !selectedKeys.includes(link.key || ''));
      onLinksChange(updatedLinks);
      bulkSelection.deselectAllItems();
      
      // Show error notification
      if (onStatusUpdate) {
        onStatusUpdate('Error occurred during deletion - removed from display only', true);
      }
    }
  };

  const handleDeleteLink = async (linkKey: string) => {
    const linkToDelete = allAvailableLinks.find(link => (link.key || '') === linkKey);
    
    if (!linkToDelete) {
      Log.warn(LOG_SOURCE, `Link not found for deletion: ${linkKey}`);
      return;
    }
    
    try {
      const linkId = (linkToDelete.data as any)?.id;
      
      if (!linkId || typeof linkId !== 'number') {
        Log.warn(LOG_SOURCE, `No valid link ID found for deletion: ${linkKey}`);
        // Still update UI to remove item without valid ID
        const updatedLinks = allAvailableLinks.filter(link => (link.key || '') !== linkKey);
        onLinksChange(updatedLinks);
        return;
      }

      // Use footerService if available
      if (footerService && typeof footerService.deleteGlobalLink === 'function') {
        Log.info(LOG_SOURCE, `Attempting to delete organization link via service: ID ${linkId}`);
        const success = await footerService.deleteGlobalLink(linkId);
        
        if (success) {
          Log.info(LOG_SOURCE, `Successfully deleted organization link ${linkId} from SharePoint`);
          
          // Refresh data from server to ensure UI is in sync
          if (onRefreshOrganizationLinks) {
            await onRefreshOrganizationLinks();
          } else {
            // Fallback to local state update if refresh not available
            const updatedLinks = allAvailableLinks.filter(link => (link.key || '') !== linkKey);
            onLinksChange(updatedLinks);
          }
          
          // Show success notification
          if (onStatusUpdate) {
            onStatusUpdate(`Successfully deleted "${linkToDelete.name}" organization link`);
          }
        } else {
          Log.error(LOG_SOURCE, new Error(`Failed to delete organization link ${linkId} from SharePoint - updating UI anyway`));
          // Update UI even if backend fails (user feedback)
          const updatedLinks = allAvailableLinks.filter(link => (link.key || '') !== linkKey);
          onLinksChange(updatedLinks);
          
          // Show error notification
          if (onStatusUpdate) {
            onStatusUpdate(`Failed to delete "${linkToDelete.name}" from server, but removed from display`, true);
          }
        }
      } else {
        Log.warn(LOG_SOURCE, 'Footer service does not support delete operations - updating local state only');
        const updatedLinks = allAvailableLinks.filter(link => (link.key || '') !== linkKey);
        onLinksChange(updatedLinks);
        
        // Show warning notification
        if (onStatusUpdate) {
          onStatusUpdate(`Removed "${linkToDelete.name}" from display (local only - not saved to server)`, true);
        }
      }
    } catch (error) {
      Log.error(LOG_SOURCE, error as Error);
      // Still update UI to provide user feedback
      const updatedLinks = allAvailableLinks.filter(link => (link.key || '') !== linkKey);
      onLinksChange(updatedLinks);
      
      // Show error notification
      if (onStatusUpdate) {
        onStatusUpdate(`Error occurred while deleting "${linkToDelete?.name || 'link'}" - removed from display only`, true);
      }
    }
  };

  return (
    <div className={styles.tabContent}>
      {/* Tab Header */}
      <div className={styles.tabHeader}>
        <div className={styles.tabHeaderText}>
          <h3>{strings.OrganizationLinks}</h3>
          <p>{strings.OrganizationLinksDescription}</p>
        </div>
        {isAdmin && (
          <PrimaryButton
            text={strings.AddOrganizationLink}
            iconProps={{ iconName: 'Add' }}
            onClick={() => onShowAddForm(true)}
            styles={{ 
              root: { 
                borderRadius: '8px',
                fontWeight: '600'
              } 
            }}
          />
        )}
      </div>

      {/* Search and Filter Controls */}
      <div className={styles.filterSection}>
        <SearchAndFilterControls
        searchValue={state.searchQuery}
        onSearchChange={(query) => onStateChange({ ...state, searchQuery: query })}
        selectedCategory={state.selectedCategory}
        onCategoryChange={(category) => {
          onStateChange({ ...state, selectedCategory: category });
        }}
        categoryOptions={availableCategories}
        sortBy={state.sortBy}
        onSortChange={(sortBy) => onStateChange({ ...state, sortBy })}
        sortOptions={sortOptions}
        sortDirection={state.sortDirection}
        onSortDirectionChange={(direction) => onStateChange({ ...state, sortDirection: direction })}
        additionalFilters={
          bulkSelection.bulkSelectionMode && (
            <div className={styles.bulkActions}>
              {bulkSelection.selectedCount > 0 ? (
                <>
                  <span className={styles.selectionInfo}>
                    {bulkSelection.selectedCount} item(s) selected
                  </span>
                  <DefaultButton
                    text={strings.DeselectAll}
                    onClick={handleDeselectAll}
                    iconProps={{ iconName: 'Clear' }}
                  />
                  {isAdmin && (
                    <DefaultButton
                      text={strings.DeleteSelected}
                      onClick={handleDeleteSelected}
                      iconProps={{ iconName: 'Delete' }}
                      styles={{ root: { color: '#d13438' } }}
                    />
                  )}
                </>
              ) : (
                <DefaultButton
                  text={strings.SelectAll}
                  onClick={handleSelectAll}
                  iconProps={{ iconName: 'CheckboxComposite' }}
                />
              )}
            </div>
          )
        }
        />
      </div>

      {/* Links List */}
      <div className={styles.linkListSection}>
        <LinkList
        links={displayedLinks}
        onLinksChange={onLinksChange}
        allLinks={allAvailableLinks}
        bulkSelection={bulkSelection}
        showBulkSelection={isAdmin} // Only show bulk selection for admins
        allowEdit={isAdmin} // Only allow editing for admins
        allowDelete={isAdmin} // Only allow deletion for admins
        onEditLink={handleEditLink}
        onDeleteLink={handleDeleteLink} // Add individual delete handler
        emptyMessage={strings.NoLinksFound}
        showDetails={true}
        maxHeight="500px"
        />
      </div>

      {/* Pagination - if needed */}
      {totalPages > 1 && (
        <div style={{ marginTop: '16px', textAlign: 'center' }}>
          <DefaultButton
            text={strings.Back}
            disabled={state.currentPage === 1}
            onClick={() => onStateChange({ ...state, currentPage: state.currentPage - 1 })}
            iconProps={{ iconName: 'ChevronLeft' }}
          />
          <span style={{ margin: '0 16px', color: '#666' }}>
            Page {state.currentPage} of {totalPages} ({totalItems} items)
          </span>
          <DefaultButton
            text={strings.Next}
            disabled={state.currentPage === totalPages}
            onClick={() => onStateChange({ ...state, currentPage: state.currentPage + 1 })}
            iconProps={{ iconName: 'ChevronRight' }}
          />
        </div>
      )}

      {/* Edit Organization Link Form - Only shown for admins */}
      {showAddForm && isAdmin && (
        <OrganizationLinkForm
          formData={newLinkFormData}
          onSave={onSave}
          onCancel={() => onShowAddForm(false)}
          onFormDataChange={onFormDataChange}
          onShowIconGallery={onShowIconGallery}
          availableCategories={availableCategories}
          isLoading={isLoading}
          context={context}
          isEditMode={!!newLinkFormData.id} // Edit mode if ID exists
          onCreateCategory={onCreateCategory}
          onCategoriesRefresh={onCategoriesRefresh}
        />
      )}
    </div>
  );
};