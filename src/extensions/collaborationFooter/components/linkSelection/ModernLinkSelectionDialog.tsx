import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Log } from '@microsoft/sp-core-library';
import { useSafeTimeout } from '../../hooks/useSafeTimeout';
import {
  DefaultButton,
  PrimaryButton,
  Checkbox,
  DialogFooter,
  DialogContent,
  Stack,
  Text,
  MessageBar,
  MessageBarType,
  Separator,
  Icon,
  SearchBox,
  Toggle,
  Spinner,
  SpinnerSize
} from '@fluentui/react';
import { BaseDialog, IDialogConfiguration } from '@microsoft/sp-dialog';
import { IGlobalLink } from '../../../../services/types/FooterTypes';
import styles from './ModernLinkSelection.module.scss';

const LOG_SOURCE: string = 'ModernLinkSelectionDialog';

interface IModernLinkSelectionDialogContentProps {
  globalLinks: IGlobalLink[];
  currentSelections: number[];
  onSave: (selectedLinkIds: number[]) => Promise<boolean>;
  onCancel: () => void;
}

const ModernLinkSelectionDialogContent: React.FC<IModernLinkSelectionDialogContentProps> = ({
  globalLinks,
  currentSelections,
  onSave,
  onCancel
}) => {
  const [selectedLinks, setSelectedLinks] = React.useState<Set<number>>(new Set(currentSelections));
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [showMandatoryLinks, setShowMandatoryLinks] = React.useState<boolean>(true);
  
  const { setSafeTimeout } = useSafeTimeout();

  // Separate mandatory and optional links
  const { mandatoryLinks, optionalLinks } = React.useMemo(() => {
    return {
      mandatoryLinks: globalLinks.filter(link => link.isMandatory),
      optionalLinks: globalLinks.filter(link => !link.isMandatory)
    };
  }, [globalLinks]);

  // Filter links based on search query
  const filteredOptionalLinks = React.useMemo(() => optionalLinks.filter(link =>
    link.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (link.description && link.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (link.category && link.category.toLowerCase().includes(searchQuery.toLowerCase()))
  ), [optionalLinks, searchQuery]);

  // Group filtered optional links by category
  const optionalLinksByCategory = React.useMemo(() => filteredOptionalLinks.reduce((acc, link) => {
    const category = link.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(link);
    return acc;
  }, {} as { [category: string]: IGlobalLink[] }), [filteredOptionalLinks]);

  const handleToggleLink = React.useCallback((linkId: number) => {
    setSelectedLinks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(linkId)) {
        newSet.delete(linkId);
      } else {
        newSet.add(linkId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAllInCategory = React.useCallback((categoryLinks: IGlobalLink[], selectAll: boolean) => {
    setSelectedLinks(prev => {
      const newSet = new Set(prev);
      categoryLinks.forEach(link => {
        if (selectAll) {
          newSet.add(link.id);
        } else {
          newSet.delete(link.id);
        }
      });
      return newSet;
    });
  }, []);

  const handleSave = React.useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const success = await onSave(Array.from(selectedLinks));
      if (success) {
        setSuccessMessage('Link preferences saved successfully!');
        setSafeTimeout(() => {
          // Close dialog after success message
          onCancel();
        }, 1500);
      } else {
        setErrorMessage('Failed to save link preferences. Please try again.');
      }
    } catch (error) {
      Log.error(LOG_SOURCE, error as Error);
      setErrorMessage('An error occurred while saving. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedLinks, onSave, onCancel]);

  const renderLinkCard = React.useCallback((link: IGlobalLink, isSelected: boolean, isMandatory: boolean = false) => {
    return (
      <div key={link.id} className={`${styles.linkCard} ${isSelected ? styles.selected : ''} ${isMandatory ? styles.mandatory : ''}`}>
        <div className={styles.linkCardContent}>
          <div className={styles.linkInfo}>
            <div className={styles.linkIcon}>
              <Icon 
                iconName={link.iconName || 'Link'} 
              />
            </div>
            <div className={styles.linkDetails}>
              <Text 
                variant="medium" 
                className={styles.linkTitle}
              >
                {link.title}
              </Text>
              {link.description && (
                <Text 
                  variant="small" 
                  className={styles.linkDescription}
                >
                  {link.description}
                </Text>
              )}
              {link.url && (
                <Text 
                  variant="xSmall" 
                  className={styles.linkUrl}
                >
                  {new URL(link.url).hostname}
                </Text>
              )}
            </div>
          </div>
          <div className={styles.linkActions}>
            {isMandatory ? (
              <div className={styles.mandatoryBadge}>
                <Icon iconName="LockSolid" className={styles.sectionIcon} styles={{ root: { fontSize: 12, marginRight: 4 } }} />
                <Text variant="xSmall" className={styles.requiredLabel}>
                  Required
                </Text>
              </div>
            ) : (
              <Checkbox
                checked={isSelected}
                onChange={() => handleToggleLink(link.id)}
                ariaLabel={`Toggle ${link.title}`}
              />
            )}
          </div>
        </div>
      </div>
    );
  }, [handleToggleLink]);

  const renderCategory = React.useCallback((categoryName: string, categoryLinks: IGlobalLink[]) => {
    const selectedInCategory = categoryLinks.filter(link => selectedLinks.has(link.id)).length;
    const allSelected = selectedInCategory === categoryLinks.length;
    const someSelected = selectedInCategory > 0 && selectedInCategory < categoryLinks.length;

    return (
      <div key={categoryName} className={styles.categorySection}>
        <div className={styles.categoryHeader}>
          <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 12 }}>
            <Checkbox
              checked={allSelected}
              indeterminate={someSelected}
              onChange={(_, checked) => handleSelectAllInCategory(categoryLinks, checked || false)}
              ariaLabel={`Select all links in ${categoryName}`}
            />
            <div className={styles.categoryInfo}>
              <Text 
                variant="mediumPlus" 
                className={styles.categoryTitle}
              >
                {categoryName}
              </Text>
              <Text 
                variant="small" 
                className={styles.categoryCount}
              >
                {selectedInCategory} of {categoryLinks.length} selected
              </Text>
            </div>
          </Stack>
        </div>
        <div className={styles.categoryLinks}>
          {categoryLinks.map(link => renderLinkCard(link, selectedLinks.has(link.id)))}
        </div>
      </div>
    );
  }, [selectedLinks, handleSelectAllInCategory, renderLinkCard]);

  return (
    <div className={styles.dialogContainer}>
      <DialogContent
        title={<div className={styles.dialogTitle}>Manage Quick Links</div>}
        onDismiss={onCancel}
        showCloseButton={true}
        className={styles.dialogContent}
      >
        <div className={styles.dialogContent}>
          {/* Status messages */}
          {(errorMessage || successMessage) && (
            <div className={styles.messageContainer}>
              <MessageBar
                messageBarType={errorMessage ? MessageBarType.error : MessageBarType.success}
                isMultiline={false}
                onDismiss={() => {
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
              >
                <Stack horizontal tokens={{ childrenGap: 8 }} verticalAlign="center">
                  <Icon 
                    iconName={errorMessage ? 'ErrorBadge' : 'CompletedSolid'} 
                    styles={{
                      root: {
                        fontSize: 16,
                        color: errorMessage ? '#a4262c' : '#107c10', // Fallback/Theme colors
                      }
                    }}
                  />
                  <Text variant="medium">
                    {errorMessage || successMessage}
                  </Text>
                </Stack>
              </MessageBar>
            </div>
          )}

          {/* Header controls */}
          <div className={styles.headerControls}>
            <Stack tokens={{ childrenGap: 16 }}>
              <Text 
                variant="medium" 
                className={styles.headerDescription}
              >
                Choose which optional links appear in your quick links. Required links are always shown.
              </Text>
              
              <Stack horizontal tokens={{ childrenGap: 16 }} verticalAlign="center" wrap>
                <div className={styles.searchBoxContainer}>
                  <SearchBox
                    placeholder="Search links..."
                    value={searchQuery}
                    onChange={(_, newValue) => setSearchQuery(newValue || '')}
                  />
                </div>
                <Toggle
                  label="Show required links"
                  checked={showMandatoryLinks}
                  onChange={(_, checked) => setShowMandatoryLinks(checked || false)}
                />
              </Stack>
            </Stack>
          </div>

          {/* Content sections */}
          <div className={styles.contentSections}>
            {/* Mandatory links section */}
            {showMandatoryLinks && mandatoryLinks.length > 0 && (
              <div className={styles.mandatorySection}>
                <div className={styles.sectionTitle}>
                  <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 8 }}>
                    <Icon 
                      iconName="LockSolid" 
                      className={`${styles.sectionIcon} ${styles.mandatory}`}
                    />
                    <Text 
                      variant="large" 
                      className={styles.sectionHeaderTitle}
                    >
                      Required Links ({mandatoryLinks.length})
                    </Text>
                  </Stack>
                </div>
                <div className={styles.linksGrid}>
                  {mandatoryLinks.map(link => renderLinkCard(link, true, true))}
                </div>
                {optionalLinks.length > 0 && <Separator className={styles.separator} />}
              </div>
            )}

            {/* Optional links sections */}
            {optionalLinks.length > 0 && (
              <div className={styles.contentSections}>
                <div className={styles.sectionTitle}>
                  <Stack horizontal horizontalAlign="space-between" verticalAlign="center">
                    <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 8 }}>
                      <Icon 
                        iconName="CheckboxComposite" 
                        className={styles.sectionIcon}
                      />
                      <Text 
                        variant="large" 
                        className={styles.sectionHeaderTitle}
                      >
                        Optional Links
                      </Text>
                    </Stack>
                    <Text 
                      variant="medium" 
                      className={styles.selectionCount}
                    >
                      {selectedLinks.size} selected
                    </Text>
                  </Stack>
                </div>

                {Object.entries(optionalLinksByCategory).map(([categoryName, categoryLinks]) =>
                  renderCategory(categoryName, categoryLinks)
                )}

                {Object.keys(optionalLinksByCategory).length === 0 && searchQuery && (
                  <div className={styles.emptyState}>
                    <Stack horizontalAlign="center" tokens={{ childrenGap: 16 }}>
                      <Icon 
                        iconName="Search" 
                        className={styles.emptyStateIcon}
                      />
                      <Text 
                        variant="large" 
                        className={styles.emptyStateText}
                      >
                        No links found matching "{searchQuery}"
                      </Text>
                    </Stack>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Stack horizontal horizontalAlign="space-between" verticalAlign="center" styles={{ root: { width: '100%' } }}>
            <Text 
              variant="small" 
              className={styles.dialogFooterText}
            >
              {`${selectedLinks.size} optional link${selectedLinks.size !== 1 ? 's' : ''} selected`}
            </Text>
            <Stack horizontal tokens={{ childrenGap: 8 }}>
              <DefaultButton
                text="Cancel"
                onClick={onCancel}
                disabled={isLoading}
              />
              <PrimaryButton
                text={isLoading ? 'Saving...' : 'Save Changes'}
                onClick={handleSave}
                disabled={isLoading}
                iconProps={isLoading ? undefined : { iconName: 'Save' }}
              >
                {isLoading && (
                  <Spinner 
                    size={SpinnerSize.xSmall} 
                    className={styles.footerSpinner}
                  />
                )}
              </PrimaryButton>
            </Stack>
          </Stack>
        </DialogFooter>
      </DialogContent>
    </div>
  );
};

export class ModernLinkSelectionDialog extends BaseDialog {
  private globalLinks: IGlobalLink[];
  private currentSelections: number[];
  private saveCallback: (selectedLinkIds: number[]) => Promise<boolean>;
  private isRendered: boolean = false;

  constructor(
    globalLinks: IGlobalLink[], 
    currentSelections: number[], 
    saveCallback: (selectedLinkIds: number[]) => Promise<boolean>
  ) {
    super();
    this.globalLinks = globalLinks;
    this.currentSelections = currentSelections;
    this.saveCallback = saveCallback;
  }

  public render(): void {
    // Only render once to prevent memory leaks
    if (!this.isRendered) {
      ReactDOM.render(
        React.createElement(ModernLinkSelectionDialogContent, {
          globalLinks: this.globalLinks,
          currentSelections: this.currentSelections,
          onSave: this.saveCallback,
          onCancel: () => this.close()
        }),
        this.domElement
      );
      this.isRendered = true;
    }
  }

  public close(): Promise<void> {
    // Cleanup on close
    if (this.isRendered && this.domElement) {
      ReactDOM.unmountComponentAtNode(this.domElement);
      this.isRendered = false;
    }
    return super.close();
  }

  protected getConfig(): IDialogConfiguration {
    return {
      isBlocking: true
    };
  }
}

export default ModernLinkSelectionDialog;