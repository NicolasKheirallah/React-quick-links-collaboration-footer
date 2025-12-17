import * as React from 'react';
import { useState, useCallback } from 'react';
import { LinkValidationService } from '../../../../services/utilities/linkValidationService';
import * as strings from 'CollaborationFooterApplicationCustomizerStrings';
import { TextField } from '@fluentui/react/lib/TextField';
import { Dropdown } from '@fluentui/react/lib/Dropdown';
import { PrimaryButton, DefaultButton } from '@fluentui/react/lib/Button';
import { Icon } from '@fluentui/react/lib/Icon';
import styles from './BaseLinkForm.module.scss';

export interface IBaseLinkFormData {
  id?: number | string;
  title: string;
  url: string;
  description: string;
  iconName: string;
  iconUrl: string;
  category: string;
}

export interface IBaseLinkFormProps<T extends IBaseLinkFormData = IBaseLinkFormData> {
  formData: T;
  onSave: (formData: T) => void;
  onCancel: () => void;
  onFormDataChange: (formData: T) => void;
  onShowIconGallery: () => void;
  availableCategories: { key: string; text: string }[];
  isLoading?: boolean;
  isEditMode?: boolean;
  formTitle?: string;
  children?: React.ReactNode; // For additional fields like people picker, toggles
  onCreateCategory?: (categoryName: string) => Promise<boolean>; // Callback to create new category
  onCategoriesRefresh?: () => Promise<void>; // Callback to refresh categories
}

export const BaseLinkForm = <T extends IBaseLinkFormData = IBaseLinkFormData>({
  formData,
  onSave,
  onCancel,
  onFormDataChange,
  onShowIconGallery,
  availableCategories,
  isLoading = false,
  isEditMode = false,
  formTitle,
  children,
  onCreateCategory,
  onCategoriesRefresh
}: IBaseLinkFormProps<T>) => {
  // State for split category selection
  const [selectedParent, setSelectedParent] = useState<string>('');
  const [selectedChild, setSelectedChild] = useState<string>('');
  const [isCreatingParent, setIsCreatingParent] = useState<boolean>(false);
  const [isCreatingChild, setIsCreatingChild] = useState<boolean>(false);
  const [customParentInput, setCustomParentInput] = useState<string>('');
  const [customChildInput, setCustomChildInput] = useState<string>('');

  // 1. Data Parsing: Group available categories into Parent -> Children map
  const categoryMap = React.useMemo(() => {
    const map = new Map<string, string[]>();
    
    availableCategories.forEach(cat => {
      // Assuming "Parent: Child" format
      if (cat.key === 'custom') return; // Skip the 'create new' option if passed from parent
      
      const parts = cat.text.split(':').map(s => s.trim());
      const parent = parts[0];
      const child = parts.length > 1 ? parts.slice(1).join(': ') : null;

      if (!map.has(parent)) {
        map.set(parent, []);
      }
      
      if (child) {
        map.get(parent)?.push(child);
      }
    });
    return map;
  }, [availableCategories]);

  // Initial load: Parse existing formData.category into parent/child
  React.useEffect(() => {
    if (formData.category) {
      const parts = formData.category.split(':').map(s => s.trim());
      const parent = parts[0];
      const child = parts.length > 1 ? parts.slice(1).join(': ') : '';
      
      // Only update if we aren't in the middle of creating/editing to avoid overwriting user input
      // Ideally, we only do this on mount or if formData.category changes externally
      setSelectedParent(parent);
      setSelectedChild(child);
    } else {
        setSelectedParent('');
        setSelectedChild('');
    }
  }, [formData.category]);

  const handleParentChange = useCallback((_, option) => {
    if (option?.key === 'create_new_parent') {
      setIsCreatingParent(true);
      setSelectedParent('');
      setCustomParentInput('');
      // Reset child
      setSelectedChild('');
      setIsCreatingChild(false);
      setCustomChildInput('');
    } else {
      setIsCreatingParent(false);
      setSelectedParent(option?.text || '');
      // When parent changes, reset child
      setSelectedChild('');
      setIsCreatingChild(false);
      setCustomChildInput('');
      
      // Update form data immediately with just the parent (child is empty)
      onFormDataChange({ ...formData, category: option?.text || 'General' });
    }
  }, [formData, onFormDataChange]);

  const handleChildChange = useCallback((_, option) => {
    if (option?.key === 'create_new_child') {
      setIsCreatingChild(true);
      setSelectedChild('');
      setCustomChildInput('');
      setCustomParentInput(''); // Ensure we aren't creating a parent
    } else if (option?.key === 'none_child') {
      setIsCreatingChild(false);
      setSelectedChild('');
      setCustomChildInput('');
      // Update form data to match just the parent
      onFormDataChange({ ...formData, category: selectedParent });
    } else {
      setIsCreatingChild(false);
      const childVal = option?.text || '';
      setSelectedChild(childVal);
      // Update form data
      onFormDataChange({ ...formData, category: `${selectedParent}: ${childVal}` });
    }
  }, [formData, onFormDataChange, selectedParent]);

  // Handle saving "New Parent" input
  const handleCustomParentBlur = () => {
    if (customParentInput.trim()) {
       setSelectedParent(customParentInput.trim());
       onFormDataChange({ ...formData, category: customParentInput.trim() });
    }
  };

  // Handle saving "New Child" input
  const handleCustomChildBlur = () => {
    if (customChildInput.trim()) {
        setSelectedChild(customChildInput.trim());
        onFormDataChange({ ...formData, category: `${selectedParent}: ${customChildInput.trim()}` });
    }
  };


  const handleSave = useCallback(() => {
    // Final validations? The formData.category is updated on every change above.
    // If "Creating Parent" is active, ensure we use the input value
    let finalCategory = formData.category;

    if (isCreatingParent && customParentInput.trim()) {
        finalCategory = customParentInput.trim();
        if (isCreatingChild && customChildInput.trim()) {
            finalCategory += `: ${customChildInput.trim()}`;
        }
    } else if (selectedParent) {
         finalCategory = selectedParent;
         if (isCreatingChild && customChildInput.trim()) {
             finalCategory += `: ${customChildInput.trim()}`;
         } else if (selectedChild) {
             finalCategory += `: ${selectedChild}`;
         }
    }

    // Update for sanity before saving
    const finalData = { ...formData, category: finalCategory };

    if (!finalData.title.trim() || !finalData.url.trim() || !LinkValidationService.isValidUrl(finalData.url)) {
      return;
    }
    onSave(finalData);
  }, [formData, onSave, isCreatingParent, customParentInput, isCreatingChild, customChildInput, selectedParent, selectedChild]);

  // derived options
  const parentOptions = React.useMemo(() => {
    const opts = Array.from(categoryMap.keys()).map(p => ({ key: p, text: p }));
    opts.push({ key: 'create_new_parent', text: `+ ${strings.CreateCategory}` });
    return opts;
  }, [categoryMap]);

  const childOptions = React.useMemo(() => {
    if (!selectedParent || isCreatingParent) return [];
    
    const children = categoryMap.get(selectedParent) || [];
    const opts = children.map(c => ({ key: c, text: c }));
    
    // Add "None" option if there are children, to allow selecting just the parent
    if (children.length > 0) {
        opts.unshift({ key: 'none_child', text: strings.None || '(None)' });
    }
    
    opts.push({ key: 'create_new_child', text: `+ ${strings.CreateCategory}` }); // Reusing strings.CreateCategory ("Create Category") or maybe hardcode "Create Subcategory"
    return opts;
  }, [categoryMap, selectedParent, isCreatingParent]);


  return (
    <div className={styles.baseLinkForm}>
      <div className={styles.formHeader}>
        <h4>{formTitle || (isEditMode ? strings.EditLink : strings.Add)}</h4>
      </div>
      
      <div className={styles.formFields}>
        <TextField
          label={strings.LinkTitle}
          placeholder={strings.LinkTitle}
          value={formData.title}
          onChange={(_, value) => onFormDataChange({ ...formData, title: value || '' })}
          required
        />
        
        <TextField
          label={strings.LinkUrl}
          placeholder="https://example.com"
          value={formData.url}
          onChange={(_, value) => onFormDataChange({ ...formData, url: value || '' })}
          required
        />
        
        <TextField
          label={strings.LinkDescription}
          placeholder={strings.LinkDescription}
          value={formData.description}
          onChange={(_, value) => onFormDataChange({ ...formData, description: value || '' })}
        />
        
        {/* ---- CATEGORY SECTION ---- */}
        <div className={styles.categorySection}>
             {/* 1. PARENT SELECTION */}
             {!isCreatingParent ? (
                <Dropdown
                    label={strings.CategoryLabel}
                    selectedKey={selectedParent}
                    onChange={handleParentChange}
                    options={parentOptions}
                />
             ) : (
                <div className={styles.customCategoryInputGroup}>
                    <TextField
                        label={strings.NewCategoryName}
                        value={customParentInput}
                        onChange={(_, v) => setCustomParentInput(v || '')}
                        onBlur={handleCustomParentBlur}
                        autoFocus
                    />
                    <DefaultButton 
                        text={strings.Cancel}
                        onClick={() => setIsCreatingParent(false)}
                        styles={{ root: { marginTop: '28px' } }} // Align with input
                    />
                </div>
             )}

             {/* 2. SUB-CATEGORY SELECTION (Only if parent selected) */}
             {(selectedParent && !isCreatingParent) && (
                 <div style={{ marginTop: '12px', paddingLeft: '16px', borderLeft: '2px solid #eaeaea' }}>
                     {!isCreatingChild ? (
                        <Dropdown
                            label={strings.SubCategoryLabel}
                            placeholder={strings.SubCategoryPlaceholder}
                            selectedKey={selectedChild}
                            onChange={handleChildChange}
                            options={childOptions}
                        />
                     ) : (
                        <div className={styles.customCategoryInputGroup}>
                            <TextField
                                label={strings.NewSubCategoryName}
                                value={customChildInput}
                                onChange={(_, v) => setCustomChildInput(v || '')}
                                onBlur={handleCustomChildBlur}
                                autoFocus
                            />
                            <DefaultButton 
                                text={strings.Cancel} 
                                onClick={() => setIsCreatingChild(false)} 
                                styles={{ root: { marginTop: '28px' } }}
                            />
                        </div>
                     )}
                 </div>
             )}
        </div>
        
        <div className={styles.iconSection}>
          <label className={styles.iconLabel}>Icon</label>
          <div className={styles.iconPreview}>
            {formData.iconUrl ? (
              <img 
                src={formData.iconUrl} 
                alt={strings.LinkIcon}
                className={styles.iconImage}
              />
            ) : (
              <Icon iconName={formData.iconName || 'Link'} className={styles.iconFluentUI} />
            )}
            <span className={styles.iconName}>
              {formData.iconUrl ? strings.CustomImage : formData.iconName || 'Link'}
            </span>
            <DefaultButton
              text={strings.LinkIcon}
              iconProps={{ iconName: 'Edit' }}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onShowIconGallery();
              }}
              className={styles.chooseIconButton}
            />
          </div>
        </div>
        
        {/* Additional fields from child components */}
        {children}
      </div>
      
      <div className={styles.formActions}>
        <PrimaryButton
          text={strings.Save}
          onClick={handleSave}
          disabled={!formData.title.trim() || !formData.url.trim() || !LinkValidationService.isValidUrl(formData.url) || isLoading}
        />
        <DefaultButton
          text={strings.Cancel}
          onClick={onCancel}
          disabled={isLoading}
        />
      </div>
    </div>
  );
};