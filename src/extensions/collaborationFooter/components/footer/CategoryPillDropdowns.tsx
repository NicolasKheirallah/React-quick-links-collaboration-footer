import * as React from 'react';
import { useMemo, memo } from 'react';
import { IContextualMenuItem } from '@fluentui/react/lib/ContextualMenu';
import { Stack } from '@fluentui/react/lib/Stack';
import { PillDropdown } from './PillDropdown';
import styles from './CategoryPillDropdowns.module.scss';

export interface ICategoryPillDropdownsProps {
  organizationLinks: IContextualMenuItem[];
  personalLinks: IContextualMenuItem[];
  onLinkClick?: (link: IContextualMenuItem) => void;
  displayMode?: 'category' | 'mixed' | 'type';
  showBadges?: boolean;
  maxPillsPerRow?: number;
  className?: string;
  pillStyle?: 'rounded' | 'square' | 'minimal';
  pillSize?: 'small' | 'medium' | 'large';
  density?: 'compact' | 'normal' | 'spacious';
  openUpward?: boolean;
  iconSize?: 'small' | 'medium' | 'large';
  enableKeyboardNavigation?: boolean;
  recentLinks?: IContextualMenuItem[];
}

type IGroupedLinks = Map<string, IContextualMenuItem[]>;

const CategoryPillDropdownsComponent: React.FC<ICategoryPillDropdownsProps> = ({
  organizationLinks,
  personalLinks,
  onLinkClick,
  displayMode = 'category',
  showBadges = true,
  maxPillsPerRow = 6,
  className = '',
  pillStyle = 'rounded',
  pillSize = 'medium',
  density = 'normal',
  openUpward = false,
  iconSize = 'medium',
  enableKeyboardNavigation = true,
  recentLinks = []
}) => {

  const groupedOrgLinks = useMemo((): IGroupedLinks => {
    const grouped = new Map<string, IContextualMenuItem[]>();
    
    organizationLinks.forEach(link => {
      const category = (link.data as any)?.category || 'General';
      const existing = grouped.get(category);
      if (existing) {
        existing.push(link);
      } else {
        grouped.set(category, [link]);
      }
    });
    
    return grouped;
  }, [organizationLinks]);


  const getCategoryIcon = (category: string): string => {
    const categoryLower = category.toLowerCase();
    
    if (categoryLower.includes('m365') || categoryLower.includes('microsoft') || categoryLower.includes('office')) {
      return 'OfficeLogo';
    }
    if (categoryLower.includes('hr') || categoryLower.includes('human')) {
      return 'People';
    }
    if (categoryLower.includes('it') || categoryLower.includes('tech')) {
      return 'Settings';
    }
    if (categoryLower.includes('finance') || categoryLower.includes('accounting')) {
      return 'Money';
    }
    if (categoryLower.includes('business') || categoryLower.includes('tools')) {
      return 'WorkItem';
    }
    if (categoryLower.includes('development') || categoryLower.includes('learning')) {
      return 'Education';
    }
    if (categoryLower.includes('communication') || categoryLower.includes('social')) {
      return 'Chat';
    }
    if (categoryLower.includes('project') || categoryLower.includes('management')) {
      return 'ProjectManagement';
    }
    if (categoryLower.includes('security') || categoryLower.includes('compliance')) {
      return 'Shield';
    }
    if (categoryLower.includes('personal')) {
      return 'Contact';
    }
    
    return 'Tag';
  };

  const renderCategoryPills = () => {
    // 1. Group items by Main Category -> Sub Category
    // Structure: Map<MainCategory, { direct: links[], subs: Map<SubName, links[]> }>
    const categoryMap = new Map<string, { direct: IContextualMenuItem[], subs: Map<string, IContextualMenuItem[]> }>();

    // Helper to process links
    const processLinks = (links: IContextualMenuItem[]) => {
      links.forEach(link => {
        let fullCategory = (link.data as any)?.category || 'General';
        // Handle "Parent: Child" format
        const parts = fullCategory.split(':').map((s: string) => s.trim());
        const mainCat = parts[0] || 'General';
        const subCat = parts.length > 1 ? parts[1] : null;

        if (!categoryMap.has(mainCat)) {
          categoryMap.set(mainCat, { direct: [], subs: new Map() });
        }
        
        const group = categoryMap.get(mainCat)!;
        
        if (subCat) {
          if (!group.subs.has(subCat)) {
            group.subs.set(subCat, []);
          }
          group.subs.get(subCat)!.push(link);
        } else {
          group.direct.push(link);
        }
      });
    };

    processLinks(organizationLinks);
    processLinks(personalLinks);

    // 2. Create Pills
    const sortedMainCategories = Array.from(categoryMap.keys()).sort();

    return sortedMainCategories.map(mainCat => {
      const group = categoryMap.get(mainCat)!;
      const sortedSubCats = Array.from(group.subs.keys()).sort();
      
      const menuItems: IContextualMenuItem[] = [];

      // Add Sub-Categories (Folders) first
      sortedSubCats.forEach(subName => {
        const subLinks = group.subs.get(subName) || [];
        if (subLinks.length > 0) {
          menuItems.push({
            key: `sub-${mainCat}-${subName}`,
            text: subName,
            iconProps: { iconName: 'FolderHorizontal' },
            subMenuProps: {
              items: subLinks.sort((a, b) => (a.name || '').localeCompare(b.name || '')).map(item => ({
                ...item,
                onClick: (ev, i) => onLinkClick && onLinkClick(item)
              }))
            }
          });
        }
      });

      // Add Separator if we have both subs and direct links
      if (sortedSubCats.length > 0 && group.direct.length > 0) {
        menuItems.push({
          key: `sep-${mainCat}`,
          itemType: 1, // Divider
          name: '-' 
        });
      }

      // Add Direct Links
      menuItems.push(...group.direct.sort((a, b) => (a.name || '').localeCompare(b.name || '')));

      if (menuItems.length === 0) return null;

      return (
        <PillDropdown
          key={`category-${mainCat}`}
          title={mainCat}
          iconName={getCategoryIcon(mainCat)}
          items={menuItems}
          variant="category"
          onItemClick={onLinkClick}
          badge={undefined}
          groupByCategory={false}
          showIcons={true}
          isNested={false}
          pillStyle={pillStyle}
          pillSize={pillSize}
          density={density}
          openUpward={openUpward}
          iconSize={iconSize}
          disableSorting={true} // We did custom sorting
        />
      );
    });
  };

  const renderTypePills = () => {
    const pills = [];

    if (organizationLinks.length > 0) {
      pills.push(
        <PillDropdown
          key="organization"
          title="Org Links"
          iconName="Globe"
          items={organizationLinks}
          variant="organization"
          onItemClick={onLinkClick}
          badge={undefined}
          groupByCategory={true}
          showIcons={true}
          isNested={true}
          pillStyle={pillStyle}
          pillSize={pillSize}
          density={density}
          openUpward={openUpward}
        />
      );
    }

    if (personalLinks.length > 0) {
      pills.push(
        <PillDropdown
          key="personal"
          title="Personal Links"
          iconName="Contact"
          items={personalLinks}
          variant="personal"
          onItemClick={onLinkClick}
          badge={undefined}
          groupByCategory={true}
          showIcons={true}
          isNested={true}
          pillStyle={pillStyle}
          pillSize={pillSize}
          density={density}
          openUpward={openUpward}
        />
      );
    }

    return pills;
  };

  const renderMixedPills = () => {
    const pills = [];

    // Add Recent Links first if available
    if (recentLinks.length > 0) {
      pills.push(
        <PillDropdown
          key="recent"
          title="Recent"
          iconName="History"
          items={recentLinks}
          variant="personal" // Use personal variant style for now
          onItemClick={onLinkClick}
          badge={undefined}
          groupByCategory={false}
          showIcons={true}
          isNested={false}
          pillStyle={pillStyle}
          pillSize={pillSize}
          density={density}
          openUpward={openUpward}
          iconSize={iconSize}
          enableKeyboardNavigation={enableKeyboardNavigation}
        />
      );
    }

    pills.push(...renderTypePills());

    const significantCategories = Array.from(groupedOrgLinks.entries())
      .filter(([_, items]) => items.length >= 3)
      .map(([category, items]) => (
        <PillDropdown
          key={`cat-${category}`}
          title={category}
          iconName={getCategoryIcon(category)}
          items={items}
          variant="category"
          onItemClick={onLinkClick}
          badge={undefined}
          groupByCategory={false}
          showIcons={true}
          isNested={false}
          pillStyle={pillStyle}
          pillSize={pillSize}
          density={density}
          openUpward={openUpward}
        />
      ));

    pills.push(...significantCategories);

    return pills;
  };

  const renderPills = () => {
    switch (displayMode) {
      case 'category':
        return renderCategoryPills();
      case 'type':
        return renderTypePills();
      case 'mixed':
        return renderMixedPills();
      default:
        return renderCategoryPills();
    }
  };

  const pills = renderPills();

  if (pills.length === 0) {
    return null;
  }

  return (
    <div className={`${styles.categoryPillDropdowns} ${className}`}>
      <Stack
        horizontal
        wrap
        tokens={{ childrenGap: 8 }}
        className={styles.pillsContainer}
        styles={{
          root: {
            justifyContent: 'flex-start',
            alignItems: 'center',
            width: '100%',
            maxWidth: 'none',
            overflow: 'visible'
          }
        }}
      >
        {pills}
      </Stack>
    </div>
  );
};

export const CategoryPillDropdowns = memo(CategoryPillDropdownsComponent);

export interface IOrganizationPillProps {
  links: IContextualMenuItem[];
  onLinkClick?: (link: IContextualMenuItem) => void;
  showBadge?: boolean;
}

export const OrganizationPill: React.FC<IOrganizationPillProps> = ({
  links,
  onLinkClick,
  showBadge = true
}) => {
  if (links.length === 0) return null;

  return (
    <PillDropdown
      title="Org Links"
      iconName="Globe"
      items={links}
      variant="organization"
      onItemClick={onLinkClick}
      badge={showBadge ? links.length : undefined}
      groupByCategory={true}
      showIcons={true}
      isNested={true}
    />
  );
};

export interface IPersonalPillProps {
  links: IContextualMenuItem[];
  onLinkClick?: (link: IContextualMenuItem) => void;
  showBadge?: boolean;
}

export const PersonalPill: React.FC<IPersonalPillProps> = ({
  links,
  onLinkClick,
  showBadge = true
}) => {
  if (links.length === 0) return null;

  return (
    <PillDropdown
      title="Personal Links"
      iconName="Contact"
      items={links}
      variant="personal"
      onItemClick={onLinkClick}
      badge={showBadge ? links.length : undefined}
      groupByCategory={true}
      showIcons={true}
      isNested={true}
    />
  );
};

export interface ICategoryPillProps {
  category: string;
  links: IContextualMenuItem[];
  onLinkClick?: (link: IContextualMenuItem) => void;
  showBadge?: boolean;
}

export const CategoryPill: React.FC<ICategoryPillProps> = ({
  category,
  links,
  onLinkClick,
  showBadge = true
}) => {
  if (links.length === 0) return null;

  const getCategoryIcon = (category: string): string => {
    const categoryLower = category.toLowerCase();
    
    if (categoryLower.includes('m365') || categoryLower.includes('microsoft')) {
      return 'OfficeLogo';
    }
    if (categoryLower.includes('hr')) {
      return 'People';
    }
    if (categoryLower.includes('it')) {
      return 'Settings';
    }
    if (categoryLower.includes('finance')) {
      return 'Money';
    }
    if (categoryLower.includes('business')) {
      return 'WorkItem';
    }
    
    return 'Tag';
  };

  return (
    <PillDropdown
      title={category}
      iconName={getCategoryIcon(category)}
      items={links}
      variant="category"
      onItemClick={onLinkClick}
      badge={showBadge ? links.length : undefined}
      groupByCategory={false}
      showIcons={true}
      isNested={false}
    />
  );
};