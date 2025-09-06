import * as React from 'react';
import { memo } from 'react';
import { Icon } from '@fluentui/react/lib/Icon';
import styles from './ModernCollabFooter.module.scss';

export interface IFooterActionsProps {
  showSearch: boolean;
  toggleSearch: () => void;
  handleUnifiedLinkManagement: () => void;
  handleUserSettings: () => void;
  isLoading: boolean;
  sharePointTheme: any;
  selectedCategory?: string;
  categoryOptions?: { key: string; text: string }[];
  onCategoryChange?: (category: string) => void;
}

export const FooterActions: React.FC<IFooterActionsProps> = ({
  showSearch,
  toggleSearch,
  handleUnifiedLinkManagement,
  handleUserSettings,
  isLoading,
  sharePointTheme,
  selectedCategory,
  categoryOptions,
  onCategoryChange
}) => {

  return (
    <div className={styles.compactActions}>
      <button
        className={styles.compactButton}
        onClick={toggleSearch}
        title="Search Links"
        aria-label="Search Links"
      >
        <Icon 
          iconName={showSearch ? 'Cancel' : 'Search'} 
          className={styles.buttonIcon}
          style={{ color: sharePointTheme.primary }}
        />
      </button>
      <button
        className={styles.compactButton}
        onClick={handleUserSettings}
        title="User Settings"
        aria-label="Open user settings panel"
      >
        <Icon 
          iconName="Settings" 
          className={styles.buttonIcon}
          style={{ color: sharePointTheme.primary }}
        />
      </button>
      <button
        className={styles.compactButton}
        onClick={handleUnifiedLinkManagement}
        disabled={isLoading}
        title="Manage My Links"
        aria-label="Manage personal links and select organization links"
      >
        <Icon 
          iconName={isLoading ? 'ProgressRingDots' : 'EditNote'} 
          className={styles.buttonIcon}
        />
      </button>
    </div>
  );
};

export default memo(FooterActions);