import * as React from 'react';
import { TextField } from '@fluentui/react/lib/TextField';
import { Toggle } from '@fluentui/react/lib/Toggle';
import { Text } from '@fluentui/react/lib/Text';
import { DefaultButton } from '@fluentui/react/lib/Button';
import { Stack } from '@fluentui/react/lib/Stack';
import { Icon } from '@fluentui/react/lib/Icon';
import { useTheme } from '@fluentui/react/lib/Theme';
import * as strings from 'CollaborationFooterApplicationCustomizerStrings';
import styles from './SharePointConfigSection.module.scss';

export interface IListValidationStatus {
  globalLinksExists: boolean;
  userSelectionsExists: boolean;
  isValidating: boolean;
  lastChecked: Date | null;
}

export interface ISharePointConfigSectionProps {
  adminSettings: any;
  onAdminSettingChange: (key: string, value: any) => void;
  listValidationStatus?: IListValidationStatus;
  onCreateGlobalLinksList?: () => Promise<void>;
  onCreateUserSelectionsList?: () => Promise<void>;
  onValidateLists?: () => Promise<void>;
  isLoading?: boolean;
}

export const SharePointConfigSection: React.FC<ISharePointConfigSectionProps> = ({
  adminSettings,
  onAdminSettingChange,
  listValidationStatus,
  onCreateGlobalLinksList,
  onCreateUserSelectionsList,
  onValidateLists,
  isLoading = false
}) => {
  const theme = useTheme();

  return (
    <div className={styles.sharePointConfigSection}>
      <div className={styles.adminSection}>
        <Text variant="large" className={styles.sectionTitle}>{strings.SharePointListsConfiguration}</Text>
        <TextField
          label={strings.GlobalLinksListTitleLabel}
          value={adminSettings.globalLinksListTitle}
          onChange={(_, value) => onAdminSettingChange('globalLinksListTitle', value || '')}
          description={strings.GlobalLinksListTitleDesc}
        />
      </div>

      <div className={styles.adminSection}>
        <Text variant="large" className={styles.sectionTitle}>{strings.OneDriveUserStorageTitle}</Text>
        <Toggle
          label={strings.EnableUserSelectionStorageLabel}
          checked={adminSettings.enableUserSelectionStorage}
          onChange={(_, checked) => onAdminSettingChange('enableUserSelectionStorage', checked)}
          onText={strings.StoreInOneDrive}
          offText={strings.UseSharePointLists}
          styles={{ root: { marginBottom: '16px' } }}
        />
        <p style={{ fontSize: '12px', color: theme.palette.neutralSecondary }}>
          {strings.UserSelectionStorageDesc}
        </p>
      </div>

      {/* SharePoint Lists Management Section */}
      {listValidationStatus && (onCreateGlobalLinksList || onCreateUserSelectionsList || onValidateLists) && (
        <div className={styles.adminSection}>
          <Text variant="large" className={styles.sectionTitle}>
            <Icon iconName="SharePointLogo" style={{ marginRight: '8px' }} />
            {strings.SharePointListsManagement}
          </Text>
          <Stack tokens={{ childrenGap: 12 }}>
            {onCreateGlobalLinksList && (
              <DefaultButton
                text={listValidationStatus.globalLinksExists ? strings.GlobalLinksListReady : strings.CreateGlobalLinksList}
                iconProps={{ iconName: listValidationStatus.globalLinksExists ? 'CheckMark' : 'Add' }}
                disabled={listValidationStatus.globalLinksExists || listValidationStatus.isValidating || isLoading}
                onClick={onCreateGlobalLinksList}
                styles={{
                  root: {
                    backgroundColor: listValidationStatus.globalLinksExists ? '#dff6dd' : undefined,
                    borderColor: listValidationStatus.globalLinksExists ? '#107c10' : undefined
                  }
                }}
              />
            )}
            {onCreateUserSelectionsList && (
              <DefaultButton
                text={listValidationStatus.userSelectionsExists ? strings.UserSelectionsListReady : strings.CreateUserSelectionsList}
                iconProps={{ iconName: listValidationStatus.userSelectionsExists ? 'CheckMark' : 'Add' }}
                disabled={listValidationStatus.userSelectionsExists || listValidationStatus.isValidating || isLoading}
                onClick={onCreateUserSelectionsList}
                styles={{
                  root: {
                    backgroundColor: listValidationStatus.userSelectionsExists ? '#dff6dd' : undefined,
                    borderColor: listValidationStatus.userSelectionsExists ? '#107c10' : undefined
                  }
                }}
              />
            )}
            {onValidateLists && (
              <DefaultButton
                text="Validate Lists Status"
                iconProps={{ iconName: 'Refresh' }}
                onClick={onValidateLists}
                disabled={listValidationStatus.isValidating || isLoading}
              />
            )}
            {listValidationStatus.lastChecked && (
              <Text variant="small" style={{ color: theme.palette.neutralSecondary, fontStyle: 'italic' }}>
                {strings.LastChecked} {listValidationStatus.lastChecked.toLocaleTimeString()}
              </Text>
            )}
          </Stack>
        </div>
      )}
    </div>
  );
};