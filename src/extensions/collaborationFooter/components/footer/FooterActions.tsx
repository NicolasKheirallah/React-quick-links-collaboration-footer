import * as React from 'react';
import { memo } from 'react';
import { Icon } from '@fluentui/react/lib/Icon';
import { IUserSettings, BarSize } from '../../types/UserSettings';
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
  userSettings: IUserSettings;
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
  onCategoryChange,
  userSettings
}) => {

  const getActionButtonSizeClass = () => {
    switch (userSettings.barSize) {
      case BarSize.Small: return styles.barSizeSmall;
      case BarSize.Large: return styles.barSizeLarge;
      default: return styles.barSizeMedium;
    }
  };

  const buttonClass = `${styles.compactButton} ${getActionButtonSizeClass()}`;

  return (
    <div className={`${styles.compactActions} ${getActionButtonSizeClass()}`}>
      <button
        className={buttonClass}
        onClick={toggleSearch}
        title="Search Links"
        aria-label="Search Links"
      >
        <Icon 
          iconName={showSearch ? 'Cancel' : 'Search'} 
          className={`${styles.buttonIcon} ${styles.primaryColorIcon}`}
        />
      </button>
      <button
        className={buttonClass}
        onClick={handleUserSettings}
        title="User Settings"
        aria-label="Open user settings panel"
      >
        <Icon 
          iconName="Settings" 
          className={`${styles.buttonIcon} ${styles.primaryColorIcon}`}
        />
      </button>
      <button
        className={buttonClass}
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