import * as React from 'react';
import * as strings from '../../loc/myStrings';
import { useCallback } from 'react';
import { TextField } from '@fluentui/react/lib/TextField';
import { Toggle } from '@fluentui/react/lib/Toggle';
import { PeoplePicker, PrincipalType } from "@pnp/spfx-controls-react/lib/PeoplePicker";
import { WebPartContext } from '@microsoft/sp-webpart-base';
import { BaseLinkForm, IBaseLinkFormData } from './BaseLinkForm';
import styles from './OrganizationLinkForm.module.scss';

export interface ITargetUser {
  id: string;
  loginName: string;
  displayName: string;
  email: string;
  imageUrl?: string;
}

export interface IOrganizationLinkFormData extends IBaseLinkFormData {
  targetUsers: ITargetUser[];
  isMandatory: boolean;
  validFrom: string;
  validTo: string;
}

export interface IOrganizationLinkFormProps {
  context: WebPartContext;
  formData: IOrganizationLinkFormData;
  onSave: (formData: IOrganizationLinkFormData) => void;
  onCancel: () => void;
  onFormDataChange: (formData: IOrganizationLinkFormData) => void;
  onShowIconGallery: () => void;
  availableCategories: { key: string; text: string }[];
  isLoading?: boolean;
  isEditMode?: boolean;
  onCreateCategory?: (categoryName: string) => Promise<boolean>;
  onCategoriesRefresh?: () => Promise<void>;
}

export const OrganizationLinkForm: React.FC<IOrganizationLinkFormProps> = ({
  context,
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
  const handleTargetUsersChange = useCallback((items: any[]) => {
    const targetUsers: ITargetUser[] = items?.map(item => ({
      id: item.id || item.text || '',
      loginName: item.secondaryText || item.text || '',
      displayName: item.text || '',
      email: item.secondaryText || '',
      imageUrl: item.imageUrl
    })) || [];
    onFormDataChange({ ...formData, targetUsers });
  }, [formData, onFormDataChange]);

  return (
    <BaseLinkForm<IOrganizationLinkFormData>
      formData={formData}
      onSave={onSave}
      onCancel={onCancel}
      onFormDataChange={onFormDataChange}
      onShowIconGallery={onShowIconGallery}
      availableCategories={availableCategories}
      isLoading={isLoading}
      isEditMode={isEditMode}
      formTitle={isEditMode ? strings.EditLink : strings.AddOrganizationLink}
      onCreateCategory={onCreateCategory}
      onCategoriesRefresh={onCategoriesRefresh}
    >
      {/* Organization-specific fields */}
      <div className={styles.peoplePickerSection}>
        <PeoplePicker
          context={context as any}
          titleText={strings.TargetUsers}
          personSelectionLimit={20}
          groupName=""
          showtooltip={true}
          defaultSelectedUsers={formData.targetUsers?.map(u => u.loginName) || []}
          onChange={handleTargetUsersChange}
          principalTypes={[PrincipalType.User, PrincipalType.SharePointGroup, PrincipalType.SecurityGroup]}
          resolveDelay={1000}
        />
      </div>
      
      <div className={styles.mandatoryToggleSection}>
        <Toggle
          label={strings.MandatoryLink}
          checked={formData.isMandatory}
          onChange={(_, checked) => onFormDataChange({ ...formData, isMandatory: !!checked })}
          onText={strings.MandatoryForAll}
          offText={strings.OptionalForUsers}
        />
      </div>
      
      <div className={styles.dateFieldsSection}>
        <TextField
          label={strings.ValidFrom}
          type="date"
          value={formData.validFrom}
          onChange={(_, value) => onFormDataChange({ ...formData, validFrom: value || '' })}
          styles={{ root: { flex: 1 } }}
        />
        <TextField
          label={strings.ValidTo}
          type="date"
          value={formData.validTo}
          onChange={(_, value) => onFormDataChange({ ...formData, validTo: value || '' })}
          styles={{ root: { flex: 1 } }}
        />
      </div>
    </BaseLinkForm>
  );
};