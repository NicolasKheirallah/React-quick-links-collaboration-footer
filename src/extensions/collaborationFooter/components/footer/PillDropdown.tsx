import * as React from 'react';
import { useMemo, memo } from 'react';
import { IContextualMenuItem, ContextualMenuItemType, DirectionalHint } from '@fluentui/react/lib/ContextualMenu';
import { Icon } from '@fluentui/react/lib/Icon';
import { Text } from '@fluentui/react/lib/Text';
import { DefaultButton, IButtonStyles } from '@fluentui/react/lib/Button';
import { useAnalytics } from '../../hooks/useAnalytics';
import styles from './PillDropdown.module.scss';
// Removed unused mergeStyles and useState

export interface IPillDropdownProps {
  title?: string;
  label?: string;
  iconName?: string;
  items: IContextualMenuItem[] | Record<string, IContextualMenuItem[]>;
  variant?: 'category' | 'organization' | 'personal';
  onItemClick?: (item: IContextualMenuItem) => void;
  isActive?: boolean;
  badge?: number;
  className?: string;
  groupByCategory?: boolean;
  pillStyle?: 'rounded' | 'square' | 'minimal';
  pillSize?: 'small' | 'medium' | 'large';
  openUpward?: boolean; 
  type?: 'category' | 'nested';
  maxHeight?: string; 
  showIcons?: boolean;
  density?: 'compact' | 'normal' | 'spacious';
  propagateIconSize?: boolean;
  disableSorting?: boolean;
  iconSize?: 'small' | 'medium' | 'large';
  enableKeyboardNavigation?: boolean;
  isNested?: boolean;
}

const PillDropdownComponent: React.FC<IPillDropdownProps> = ({
  title,
  label,
  iconName,
  items,
  variant = 'category',
  onItemClick,
  isActive = false,
  badge,
  className = '',
  groupByCategory = false,
  showIcons = true,
  pillStyle = 'rounded',
  pillSize = 'medium',
  density = 'normal',
  openUpward = false,
  iconSize = 'medium',
  disableSorting = false,
  enableKeyboardNavigation = true
}) => {
  const analytics = useAnalytics();

  const getPillIcon = () => {
    if (iconName) return iconName;
    switch (variant) {
      case 'organization': return 'Globe';
      case 'personal': return 'Contact';
      default: return 'Tag';
    }
  };

  const pillClass = useMemo(() => {
    let classes = `${styles.pill} ${styles[variant]}`;
    if (isActive) classes += ` ${styles.active}`;
    
    if (pillStyle === 'square') classes += ` ${styles.pillSquare}`;
    if (pillStyle === 'minimal') classes += ` ${styles.pillMinimal}`;
    if (pillStyle === 'rounded') classes += ` ${styles.pillRounded}`;
    
    if (pillSize === 'small') classes += ` ${styles.pillSizeSmall}`;
    if (pillSize === 'large') classes += ` ${styles.pillSizeLarge}`;
    if (pillSize === 'medium') classes += ` ${styles.pillSizeMedium}`;
    
    if (density === 'compact') classes += ` ${styles.densityCompact}`;
    if (density === 'spacious') classes += ` ${styles.densitySpacious}`;
    if (density === 'normal') classes += ` ${styles.densityNormal}`;

    if (iconSize === 'small') classes += ` ${styles.iconSizeSmall}`;
    if (iconSize === 'large') classes += ` ${styles.iconSizeLarge}`;
    if (iconSize === 'medium') classes += ` ${styles.iconSizeMedium}`;
    
    return classes;
  }, [variant, isActive, pillStyle, pillSize, density, iconSize]);


  const menuItems: IContextualMenuItem[] = useMemo(() => {
    // 1. Flatten items if passed as Record
    let rawItems: IContextualMenuItem[] = [];
    if (Array.isArray(items)) {
      rawItems = items;
    } else {
      Object.keys(items).forEach(key => {
        rawItems.push(...items[key]);
      });
    }

    // 2. Wrap onItemClick to track analytics
    const wrappedItems = rawItems.map(item => ({
      ...item,
      onClick: (ev?: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>, item?: IContextualMenuItem) => {
        if (item) {
          analytics.trackLinkClick(item);
          if (onItemClick) onItemClick(item);
          else if (item.href) window.open(item.href, '_blank', 'noopener,noreferrer');
        }
      },
      iconProps: showIcons ? (item.iconProps || { iconName: 'Link' }) : undefined,
      className: styles.contextMenuItem 
    }));

    if (!groupByCategory) {
      if (disableSorting) {
        return wrappedItems;
      }
      return wrappedItems.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    // 3. Group by Category
    const grouped: Record<string, IContextualMenuItem[]> = {};
    wrappedItems.forEach(item => {
      const cat = (item.data as any)?.category || 'General';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(item);
    });

    const contextItems: IContextualMenuItem[] = [];
    Object.keys(grouped).sort().forEach(category => {
      contextItems.push({
        key: `section-${category}`,
        itemType: ContextualMenuItemType.Header,
        text: category
      });
      
      const sortedCatItems = grouped[category].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      contextItems.push(...sortedCatItems);
    });

    return contextItems;
  }, [items, groupByCategory, onItemClick, analytics, showIcons, disableSorting]);

  // If no items, don't render
  const itemCount = Array.isArray(items) ? items.length : Object.values(items).reduce((acc, val) => acc + val.length, 0);
  if (itemCount === 0) return null;

  // Button Styles
  const buttonStyles: IButtonStyles = {
    root: {
      border: 'none',
      background: 'transparent',
      padding: 0,
      minWidth: 0,
      height: 'auto'
    },
    rootHovered: { background: 'transparent' },
    rootPressed: { background: 'transparent' },
    rootExpanded: { background: 'transparent' }
  };

  return (
    <DefaultButton
      className={`${pillClass} ${className}`}
      styles={buttonStyles}
      tabIndex={enableKeyboardNavigation ? 0 : -1}
      onRenderMenuIcon={() => null} 
      menuProps={{
        items: menuItems,
        shouldFocusOnMount: true,
        directionalHint: openUpward ? DirectionalHint.topAutoEdge : DirectionalHint.bottomAutoEdge,
        directionalHintFixed: true,
        className: styles.contextMenuContainer, 
        calloutProps: {
          preventDismissOnScroll: true
        }
      }}
    >

      <div className={styles.pillContent}>
        <Icon iconName={getPillIcon()} className={styles.pillIcon} />
        <Text className={styles.pillText}>
          {title || label}
        </Text>
        {badge && badge > 0 && (
          <div className={styles.pillBadge}>
            {badge > 99 ? '99+' : badge}
          </div>
        )}
        <Icon 
          iconName="ChevronDown" 
          className={styles.chevron} 
        />
      </div>
    </DefaultButton>
  );
};

export const PillDropdown = memo(PillDropdownComponent);