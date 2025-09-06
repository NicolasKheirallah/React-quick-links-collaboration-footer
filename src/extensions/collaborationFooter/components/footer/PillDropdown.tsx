import * as React from 'react';
import { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';
import { IContextualMenuItem } from '@fluentui/react/lib/ContextualMenu';
import { Icon } from '@fluentui/react/lib/Icon';
import { Text } from '@fluentui/react/lib/Text';
import { AnimatedContainer, HoverAnimation } from '../shared/AnimatedComponents';
import { useAnalytics } from '../../hooks/useAnalytics';
import styles from './PillDropdown.module.scss';

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
  openUpward?: boolean;
  type?: 'category' | 'nested';
  maxHeight?: string;
  showIcons?: boolean;
  density?: 'compact' | 'normal' | 'spacious';
  isNested?: boolean;
}

interface IGroupedItems {
  [category: string]: IContextualMenuItem[];
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
  maxHeight = '400px',
  isNested = false,
  pillStyle = 'rounded',
  density = 'normal'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [position, setPosition] = useState<{ bottom: number; left: number; right?: number }>({ bottom: 0, left: 0 });
  const pillRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const analytics = useAnalytics();

  const groupedItems = useMemo((): IGroupedItems => {
    if (!groupByCategory) {
      return { [title || label || 'Items']: items as IContextualMenuItem[] };
    }

    const itemsArray = Array.isArray(items) ? items : [];
    
    if (itemsArray.length === 0) {
      return {};
    }

    const grouped: IGroupedItems = {};
    
    itemsArray.forEach((item: IContextualMenuItem) => {
      const category = (item.data as any)?.category || 'General';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(item);
    });

    const sortedCategories = Object.keys(grouped).sort();
    const sortedGrouped: IGroupedItems = {};
    
    sortedCategories.forEach(category => {
      const categoryItems = grouped[category];
      if (categoryItems.length <= 1) {
        sortedGrouped[category] = categoryItems;
      } else {
        sortedGrouped[category] = categoryItems.sort((a, b) => {
          const nameA = a.name || '';
          const nameB = b.name || '';
          return nameA < nameB ? -1 : nameA > nameB ? 1 : 0;
        });
      }
    });

    return sortedGrouped;
  }, [items, groupByCategory, title, label]);

  const updatePosition = useCallback(() => {
    if (!pillRef.current) return;

    const rect = pillRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const dropdownWidth = 280; // Estimated dropdown width

    let left = rect.left;
    let right: number | undefined = undefined;

    if (left + dropdownWidth > viewportWidth - 20) {
      right = viewportWidth - rect.right;
      left = rect.right - dropdownWidth;
    }

    setPosition({
      bottom: window.innerHeight - rect.top + 8,
      left: Math.max(20, left),
      right
    });
  }, []);

  const handlePillClick = useCallback(() => {
    if (!isOpen) {
      updatePosition();
    }
    setIsOpen(!isOpen);
    if (isOpen) {
      setExpandedCategories(new Set());
    }
  }, [isOpen, updatePosition]);

  const handleCategoryToggle = useCallback((category: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  }, []);

  const handleItemClick = useCallback((item: IContextualMenuItem, event: React.MouseEvent) => {
    event.stopPropagation();
    
    analytics.trackLinkClick(item);
    
    if (onItemClick) {
      onItemClick(item);
    } else if (item.href) {
      window.open(item.href, '_blank', 'noopener,noreferrer');
    }
    
    setIsOpen(false);
    setExpandedCategories(new Set());
  }, [onItemClick, analytics]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        pillRef.current &&
        dropdownRef.current &&
        !pillRef.current.contains(event.target as Node) &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setExpandedCategories(new Set());
      }
    };

    document.addEventListener('mousedown', handleClickOutside, { passive: true });
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleResize = () => {
      updatePosition();
    };

    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setExpandedCategories(new Set());
        pillRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown, { passive: true });
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const getPillIcon = () => {
    if (iconName) return iconName;
    
    switch (variant) {
      case 'organization':
        return 'Globe';
      case 'personal':
        return 'Contact';
      default:
        return 'Tag';
    }
  };

  const getPillClass = useCallback(() => {
    let className = `${styles.pill} ${styles[variant]}`;
    if (isOpen) className += ` ${styles.open}`;
    if (isActive) className += ` ${styles.active}`;
    
    // Add pill style classes
    if (pillStyle === 'square') className += ` ${styles.pillSquare}`;
    else if (pillStyle === 'minimal') className += ` ${styles.pillMinimal}`;
    else if (pillStyle === 'rounded') className += ` ${styles.pillRounded}`;
    
    // Add density classes
    if (density === 'compact') className += ` ${styles.densityCompact}`;
    else if (density === 'spacious') className += ` ${styles.densitySpacious}`;
    else className += ` ${styles.densityNormal}`;
    
    return className;
  }, [variant, isOpen, isActive, pillStyle, density]);

  const renderDropdownContent = () => {
    const categories = Object.keys(groupedItems);
    
    if (!isNested || (categories.length === 1 && !groupByCategory)) {
      const categoryItems = categories.length === 1 ? groupedItems[categories[0]] : [];
      return (
        <div className={styles.itemsList}>
          {categoryItems.map((item, index) => (
            <AnimatedContainer
              key={item.key || index}
              isVisible={isOpen}
            >
              <HoverAnimation>
                <button
                  className={`${styles.dropdownItem || ''}`}
                  onClick={(e) => handleItemClick(item, e)}
                  title={item.title || item.name}
                >
                  <div className={styles.itemIcon}>
                    {showIcons && (
                      (item.data as any)?.iconUrl ? (
                        <img 
                          src={(item.data as any).iconUrl} 
                          alt="" 
                          className={styles.customIcon}
                        />
                      ) : (
                        <Icon 
                          iconName={item.iconProps?.iconName || 'Link'} 
                          className={styles.icon}
                        />
                      )
                    )}
                  </div>
                  <div className={styles.itemContent}>
                    <Text variant="medium" className={styles.itemTitle}>
                      {item.name}
                    </Text>
                    {item.title && item.title !== item.name && (
                      <Text variant="small" className={styles.itemDescription}>
                        {item.title}
                      </Text>
                    )}
                  </div>
                  {(item.data as any)?.isMandatory && (
                    <div className={styles.mandatoryBadge}>
                      <Icon iconName="Important" />
                    </div>
                  )}
                </button>
              </HoverAnimation>
            </AnimatedContainer>
          ))}
        </div>
      );
    }

    return (
      <div className={styles.multiLevelList}>
        {categories.map((category, categoryIndex) => {
          const isExpanded = expandedCategories.has(category);
          const categoryItems = groupedItems[category] || [];
          
          return (
            <AnimatedContainer
              key={category}
              isVisible={isOpen}
              className={styles.categorySection}
            >
              <HoverAnimation>
                <button
                  className={`${styles.categoryHeader} ${isExpanded ? styles.expanded : ''}`}
                  onClick={() => handleCategoryToggle(category)}
                  aria-expanded={isExpanded}
                  aria-controls={`category-${category}`}
                >
                  <div className={styles.categoryHeaderContent}>
                    <Icon 
                      iconName={isExpanded ? 'ChevronDown' : 'ChevronRight'} 
                      className={styles.categoryChevron}
                    />
                    <Text variant="medium" className={styles.categoryTitle}>
                      {category}
                    </Text>
                    <div className={styles.categoryBadge}>
                      {categoryItems.length}
                    </div>
                  </div>
                </button>
              </HoverAnimation>

              {isExpanded && (
                <div 
                  id={`category-${category}`}
                  className={styles.categoryItems}
                  role="group"
                  aria-labelledby={`category-header-${category}`}
                >
                  {categoryItems.map((item, itemIndex) => (
                    <AnimatedContainer
                      key={item.key || itemIndex}
                      isVisible={isExpanded}
                    >
                      <HoverAnimation>
                        <button
                          className={styles.categoryItem}
                          onClick={(e) => handleItemClick(item, e)}
                          title={item.title || item.name}
                        >
                          <div className={styles.itemIcon}>
                            {showIcons && (
                              (item.data as any)?.iconUrl ? (
                                <img 
                                  src={(item.data as any).iconUrl} 
                                  alt="" 
                                  className={styles.customIcon}
                                />
                              ) : (
                                <Icon 
                                  iconName={item.iconProps?.iconName || 'Link'} 
                                  className={styles.icon}
                                />
                              )
                            )}
                          </div>
                          <div className={styles.itemContent}>
                            <Text variant="small" className={styles.itemTitle}>
                              {item.name}
                            </Text>
                            {item.title && item.title !== item.name && (
                              <Text variant="xSmall" className={styles.itemDescription}>
                                {item.title}
                              </Text>
                            )}
                          </div>
                          {(item.data as any)?.isMandatory && (
                            <div className={styles.mandatoryBadge}>
                              <Icon iconName="Important" />
                            </div>
                          )}
                        </button>
                      </HoverAnimation>
                    </AnimatedContainer>
                  ))}
                </div>
              )}
            </AnimatedContainer>
          );
        })}
      </div>
    );
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <>
      <HoverAnimation>
        <button
          ref={pillRef}
          className={`${getPillClass()} ${className}`}
          onClick={handlePillClick}
          aria-expanded={isOpen}
          aria-haspopup="true"
          aria-label={`${title} - ${items.length} items`}
        >
          <div className={styles.pillContent}>
            <Icon iconName={getPillIcon()} className={styles.pillIcon} />
            <Text variant="medium" className={styles.pillText}>
              {title}
            </Text>
            {badge && badge > 0 && (
              <div className={styles.pillBadge}>
                {badge > 99 ? '99+' : badge}
              </div>
            )}
            <Icon 
              iconName={isOpen ? 'ChevronDown' : 'ChevronUp'} 
              className={styles.chevron}
            />
          </div>
        </button>
      </HoverAnimation>

      {isOpen && (
        <div
          className={styles.dropdownPortal}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999,
            pointerEvents: 'none'
          }}
        >
          <AnimatedContainer
            isVisible={isOpen}
            className={styles.dropdownContainer}
            style={{
              position: 'absolute',
              bottom: position.bottom,
              left: position.left,
              right: position.right,
              pointerEvents: 'auto'
            }}
          >
            <div
              ref={dropdownRef}
              className={styles.dropdown}
              style={{ maxHeight }}
            >
              <div className={styles.dropdownHeader}>
                <div className={styles.dropdownTitle}>
                  <Icon iconName={getPillIcon()} className={styles.dropdownIcon} />
                  <Text variant="mediumPlus" className={styles.dropdownTitleText}>
                    {title}
                  </Text>
                </div>
                <Text variant="small" className={styles.itemCount}>
                  {items.length} {items.length === 1 ? 'item' : 'items'}
                </Text>
              </div>
              <div className={styles.dropdownContent}>
                {renderDropdownContent()}
              </div>
            </div>
          </AnimatedContainer>
        </div>
      )}
    </>
  );
};

export const PillDropdown = memo(PillDropdownComponent, (prevProps, nextProps) => {
  if (prevProps.title !== nextProps.title) return false;
  if (prevProps.variant !== nextProps.variant) return false;
  if (prevProps.isActive !== nextProps.isActive) return false;
  if (prevProps.badge !== nextProps.badge) return false;
  if (prevProps.isNested !== nextProps.isNested) return false;
  
  if (Array.isArray(prevProps.items) && Array.isArray(nextProps.items)) {
    if (prevProps.items.length !== nextProps.items.length) return false;
    const nextItemsArray = nextProps.items as IContextualMenuItem[];
    return prevProps.items.every((item, index) => 
      item.key === nextItemsArray[index]?.key && 
      item.name === nextItemsArray[index]?.name
    );
  }
  
  return true;
});