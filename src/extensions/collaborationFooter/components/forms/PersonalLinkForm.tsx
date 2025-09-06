import * as React from 'react';
import { BaseLinkForm, IBaseLinkFormData } from './BaseLinkForm';
import * as strings from '../../loc/myStrings';

export interface IPersonalLinkFormData extends IBaseLinkFormData {}

export interface IPersonalLinkFormProps {
  formData: IPersonalLinkFormData;
  onSave: (formData: IPersonalLinkFormData) => void;
  onCancel: () => void;
  onFormDataChange: (formData: IPersonalLinkFormData) => void;
  onShowIconGallery: () => void;
  availableCategories: { key: string; text: string }[];
  isLoading?: boolean;
  isEditMode?: boolean;
  onCreateCategory?: (categoryName: string) => Promise<boolean>;
  onCategoriesRefresh?: () => Promise<void>;
}

export const PersonalLinkForm: React.FC<IPersonalLinkFormProps> = ({
  formData,
  onSave,
  onCancel,
  onFormDataChange,
  onShowIconGallery,
  availableCategories,
  isLoading = false,
  isEditMode = false,
  onCreateCategory,
  onCategoriesRefresh
}) => {
  return (
    <BaseLinkForm<IPersonalLinkFormData>
      formData={formData}
      onSave={onSave}
      onCancel={onCancel}
      onFormDataChange={onFormDataChange}
      onShowIconGallery={onShowIconGallery}
      availableCategories={availableCategories}
      isLoading={isLoading}
      isEditMode={isEditMode}
      formTitle={isEditMode ? strings.EditLink : strings.AddPersonalLink}
      onCreateCategory={onCreateCategory}
      onCategoriesRefresh={onCategoriesRefresh}
    />
  );
};