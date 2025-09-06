import * as React from 'react';
import { memo, useMemo } from 'react';
import { IContextualMenuItem } from '@fluentui/react/lib/ContextualMenu';
import { IUserSettings, DisplayMode, PillStyle, PillSize, Density } from '../../types/UserSettings';
import { CategoryPillDropdowns } from './CategoryPillDropdowns';
import styles from './ModernCollabFooter.module.scss';

export interface IFooterContentProps {
  allLinksToDisplay: IContextualMenuItem[];
  handleLinkClick: (link: IContextualMenuItem, event?: React.MouseEvent) => void;
  renderLinkBadge: (link: IContextualMenuItem) => React.ReactNode;
  isLoading: boolean;
  userSettings: IUserSettings;
}

const FooterContentComponent: React.FC<IFooterContentProps> = ({
  allLinksToDisplay,
  handleLinkClick,
  renderLinkBadge,
  isLoading,
  userSettings
}) => {
  

  const visibleLinks = allLinksToDisplay;
  const hasMoreLinks = false;

  const { organizationLinks, personalLinks } = useMemo(() => {
    const orgLinks: typeof allLinksToDisplay = [];
    const persLinks: typeof allLinksToDisplay = [];
    
    allLinksToDisplay.forEach(link => {
      if (link.key?.startsWith('personal-')) {
        persLinks.push(link);
      } else {
        orgLinks.push(link);
      }
    });
    
    return {
      organizationLinks: orgLinks,
      personalLinks: persLinks
    };
  }, [allLinksToDisplay]);


  const getDensityClass = () => {
    switch (userSettings.density) {
      case Density.Compact: return styles.densityCompact;
      case Density.Spacious: return styles.densitySpacious;
      default: return styles.densityNormal;
    }
  };

  const getPillStyleClass = () => {
    switch (userSettings.pillStyle) {
      case PillStyle.Square: return styles.pillSquare;
      case PillStyle.Minimal: return styles.pillMinimal;
      default: return styles.pillRounded;
    }
  };

  const getIconSizeClass = () => {
    switch (userSettings.iconSize) {
      case 'small': return styles.iconSizeSmall;
      case 'large': return styles.iconSizeLarge;
      default: return styles.iconSizeMedium;
    }
  };

  const getPillSizeString = () => {
    switch (userSettings.pillSize) {
      case PillSize.Small: return 'small';
      case PillSize.Large: return 'large';
      default: return 'medium';
    }
  };

  if (isLoading) {
    return (
      <div className={styles.contentArea}>
        <div className={`${styles.linksContainer} ${getDensityClass()}`}>
          <div className={styles.loadingContainer}>
            Loading links...
          </div>
        </div>
      </div>
    );
  }

  if (userSettings.displayMode === DisplayMode.TypeBasedDropdowns) {
    return (
      <div className={styles.contentArea}>
        <div className={`${styles.linksContainer} ${getDensityClass()} ${getPillStyleClass()} ${getIconSizeClass()}`}>
          <CategoryPillDropdowns
            organizationLinks={organizationLinks}
            personalLinks={personalLinks}
            onLinkClick={handleLinkClick}
            displayMode="mixed"
            showBadges={userSettings.showBadges}
            pillStyle={userSettings.pillStyle.toLowerCase() as 'rounded' | 'square' | 'minimal'}
            pillSize={getPillSizeString() as 'small' | 'medium' | 'large'}
            density={userSettings.density.toLowerCase() as 'compact' | 'normal' | 'spacious'}
          />
        </div>
      </div>
    );
  }

  if (userSettings.displayMode === DisplayMode.CategoryDropdowns) {
    return (
      <div className={styles.contentArea}>
        <div className={`${styles.linksContainer} ${getDensityClass()} ${getPillStyleClass()} ${getIconSizeClass()}`}>
          <CategoryPillDropdowns
            organizationLinks={organizationLinks}
            personalLinks={personalLinks}
            onLinkClick={handleLinkClick}
            displayMode="category"
            showBadges={userSettings.showBadges}
            pillStyle={userSettings.pillStyle.toLowerCase() as 'rounded' | 'square' | 'minimal'}
            pillSize={getPillSizeString() as 'small' | 'medium' | 'large'}
            density={userSettings.density.toLowerCase() as 'compact' | 'normal' | 'spacious'}
          />
        </div>
      </div>
    );
  }

  if (userSettings.displayMode === DisplayMode.OrgPersonalDropdowns) {
    return (
      <div className={styles.contentArea}>
        <div className={`${styles.linksContainer} ${getDensityClass()} ${getPillStyleClass()} ${getIconSizeClass()}`}>
          <CategoryPillDropdowns
            organizationLinks={organizationLinks}
            personalLinks={personalLinks}
            onLinkClick={handleLinkClick}
            displayMode="type"
            showBadges={userSettings.showBadges}
            pillStyle={userSettings.pillStyle.toLowerCase() as 'rounded' | 'square' | 'minimal'}
            pillSize={getPillSizeString() as 'small' | 'medium' | 'large'}
            density={userSettings.density.toLowerCase() as 'compact' | 'normal' | 'spacious'}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.contentArea}>
      <div className={`${styles.linksContainer} ${getDensityClass()} ${getIconSizeClass()}`}>
        {visibleLinks.length > 0 ? (
          <>
            {visibleLinks.map((link, index) => (
              <div
                key={`${link.key}-${index}`}
                className={styles.linkWrapper}
              >
                <button
                  className={`${styles.linkItem} ${getPillStyleClass()} ${styles.linkButton} ${userSettings.showIcons || userSettings.showBadges ? styles.showIconsOrBadges : styles.hideIconsAndBadges}`}
                  onClick={(e) => handleLinkClick(link, e)}
                  title={link.title || link.name}
                  disabled={!link.href}
                  style={{
                    fontSize: userSettings.iconSize === 'small' ? '10px' : userSettings.iconSize === 'large' ? '14px' : '11px'
                  }}
                >
                  {userSettings.showIcons && (
                    <span className={`${styles.linkIcon} ${styles.linkIconContainer}`}>
                      {link.iconProps?.iconName ? (
                        <i className={`ms-Icon ms-Icon--${link.iconProps.iconName}`} />
                      ) : (
                        <i className="ms-Icon ms-Icon--Link" />
                      )}
                    </span>
                  )}
                  <span>{link.name}</span>
                  {userSettings.showBadges && renderLinkBadge(link)}
                </button>
                {(link.data as any)?.description && (
                  <div
                    className={styles.linkDescription}
                    title={(link.data as any)?.description}
                  >
                    {(link.data as any)?.description}
                  </div>
                )}
              </div>
            ))}
            {hasMoreLinks && (
              <span className={styles.showMoreIndicator}>+{allLinksToDisplay.length - userSettings.maxVisibleItems} more</span>
            )}
          </>
        ) : (
          <div className={styles.noLinksMessage}>
            No links available. Click "Manage My Links" to add some!
          </div>
        )}
      </div>
    </div>
  );
};

export const FooterContent = memo(FooterContentComponent, (prevProps, nextProps) => {
  if (prevProps.isLoading !== nextProps.isLoading) return false;
  if (prevProps.allLinksToDisplay.length !== nextProps.allLinksToDisplay.length) return false;
  if (prevProps.userSettings.maxVisibleItems !== nextProps.userSettings.maxVisibleItems) return false;
  if (prevProps.userSettings.showBadges !== nextProps.userSettings.showBadges) return false;
  if (prevProps.userSettings.density !== nextProps.userSettings.density) return false;
  if (prevProps.userSettings.pillStyle !== nextProps.userSettings.pillStyle) return false;
  if (prevProps.userSettings.pillSize !== nextProps.userSettings.pillSize) return false;
  if (prevProps.userSettings.displayMode !== nextProps.userSettings.displayMode) return false;
  if (prevProps.userSettings.showIcons !== nextProps.userSettings.showIcons) return false;
  if (prevProps.userSettings.iconSize !== nextProps.userSettings.iconSize) return false;
  
  return prevProps.allLinksToDisplay.every((link, index) => 
    link.key === nextProps.allLinksToDisplay[index]?.key
  );
});