import * as React from 'react';
import { SearchBox } from '@fluentui/react/lib/SearchBox';
import * as strings from 'CollaborationFooterApplicationCustomizerStrings';
import { Dropdown, IDropdownOption } from '@fluentui/react/lib/Dropdown';
import { Stack } from '@fluentui/react/lib/Stack';
import styles from './SearchAndFilterControls.module.scss';

export interface ISearchAndFilterControlsProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  
  // Category filter
  selectedCategory?: string;
  onCategoryChange?: (category: string) => void;
  categoryOptions?: IDropdownOption[];
  categoryPlaceholder?: string;
  
  // Sort options
  sortBy?: string;
  onSortChange?: (sortBy: string) => void;
  sortOptions?: IDropdownOption[];
  
  // Sort direction
  sortDirection?: 'asc' | 'desc';
  onSortDirectionChange?: (direction: 'asc' | 'desc') => void;
  
  // Additional filters
  additionalFilters?: React.ReactNode;
  
  // Layout
  vertical?: boolean;
  gap?: number;
}

export const SearchAndFilterControls: React.FC<ISearchAndFilterControlsProps> = ({
  searchValue,
  onSearchChange,
  searchPlaceholder = strings.Search,
  
  selectedCategory,
  onCategoryChange,
  categoryOptions,
  categoryPlaceholder = strings.FilterByCategory,
  
  sortBy,
  onSortChange,
  sortOptions,
  
  sortDirection,
  onSortDirectionChange,
  
  additionalFilters,
  vertical = false,
  gap = 16
}) => {
  const commonDropdownStyles = {
    root: { 
      width: '100%',
      maxWidth: '200px', 
      height: '40px',
      boxSizing: 'border-box'
    }
  };

  const searchBoxStyles = {
    root: { 
      width: '100%',
      maxWidth: '320px', 
      height: '40px',
      boxSizing: 'border-box'
    }
  };

  const sortDirectionOptions: IDropdownOption[] = [
    { key: 'asc', text: 'Ascending' },
    { key: 'desc', text: 'Descending' }
  ];

  return (
    <div className={styles.filterControls}>
      <Stack 
        horizontal={!vertical} 
        tokens={{ childrenGap: gap }} 
        verticalAlign="center" 
        wrap
      >
        {/* Search Box */}
        <SearchBox
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(_, newValue) => onSearchChange(newValue || '')}
          styles={searchBoxStyles}
        />
        
        {/* Category Filter */}
        {categoryOptions && onCategoryChange && (
          <Dropdown
            placeholder={categoryPlaceholder}
            selectedKey={selectedCategory}
            onChange={(_, option) => onCategoryChange(option?.key as string || 'all')}
            options={categoryOptions}
            styles={commonDropdownStyles}
          />
        )}
        
        {/* Sort By */}
        {sortOptions && onSortChange && (
          <Dropdown
            placeholder={strings.SortBy}
            selectedKey={sortBy}
            onChange={(_, option) => onSortChange(option?.key as string || 'name')}
            options={sortOptions}
            styles={commonDropdownStyles}
          />
        )}
        
        {/* Sort Direction */}
        {sortDirection && onSortDirectionChange && (
          <Dropdown
            placeholder={strings.Order}
            selectedKey={sortDirection}
            onChange={(_, option) => onSortDirectionChange(option?.key as 'asc' | 'desc' || 'asc')}
            options={sortDirectionOptions}
            styles={commonDropdownStyles}
          />
        )}
        
        {/* Additional Filters */}
        {additionalFilters}
      </Stack>
    </div>
  );
};