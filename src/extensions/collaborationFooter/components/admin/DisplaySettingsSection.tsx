import * as React from 'react';
import { TextField } from '@fluentui/react/lib/TextField';
import { Toggle } from '@fluentui/react/lib/Toggle';
import { Dropdown, IDropdownOption } from '@fluentui/react/lib/Dropdown';
import { Text } from '@fluentui/react/lib/Text';
import { Separator } from '@fluentui/react/lib/Separator';
import { useTheme } from '@fluentui/react/lib/Theme';
import * as strings from 'CollaborationFooterApplicationCustomizerStrings';
import { DisplayMode, PillStyle, Density, BarSize, PillSize } from '../../types/UserSettings';
import styles from './DisplaySettingsSection.module.scss';

export interface IDisplaySettingsSectionProps {
  adminSettings: any;
  onAdminSettingChange: (key: string, value: any) => void;
}

export const DisplaySettingsSection: React.FC<IDisplaySettingsSectionProps> = ({
  adminSettings,
  onAdminSettingChange
}) => {
  const theme = useTheme();

  // Display appearance options for org-wide defaults
  const displayModeOptions: IDropdownOption[] = [
    { key: DisplayMode.FlatPills, text: strings.FlatPills },
    { key: DisplayMode.CategoryDropdowns, text: strings.CategoryDropdowns },
    { key: DisplayMode.TypeBasedDropdowns, text: strings.OrganizationalPersonalDropdowns }
  ];

  const pillStyleOptions: IDropdownOption[] = [
    { key: PillStyle.Rounded, text: strings.Rounded },
    { key: PillStyle.Square, text: strings.Square },
    { key: PillStyle.Minimal, text: strings.Minimal }
  ];

  const densityOptions: IDropdownOption[] = [
    { key: Density.Compact, text: strings.Compact },
    { key: Density.Normal, text: strings.Normal },
    { key: Density.Spacious, text: strings.Spacious }
  ];

  const barSizeOptions: IDropdownOption[] = [
    { key: BarSize.Small, text: strings.Small },
    { key: BarSize.Medium, text: strings.Medium },
    { key: BarSize.Large, text: strings.Large }
  ];

  const pillSizeOptions: IDropdownOption[] = [
    { key: PillSize.Small, text: strings.Small },
    { key: PillSize.Medium, text: strings.Medium },
    { key: PillSize.Large, text: strings.Large }
  ];

  const iconSizeOptions: IDropdownOption[] = [
    { key: 'small', text: strings.Small },
    { key: 'medium', text: strings.Medium },
    { key: 'large', text: strings.Large }
  ];

  return (
    <div className={styles.displaySettingsSection}>
      <div className={styles.adminSection}>
        <Text variant="large" className={styles.sectionTitle}>Display Settings</Text>
        
        <TextField
          label="Max Links Per Category"
          type="number"
          value={adminSettings.maxLinksPerCategory?.toString()}
          onChange={(_, value) => onAdminSettingChange('maxLinksPerCategory', parseInt(value || '10'))}
          description="Maximum number of links to display per category"
        />
        
        <Toggle
          label="Enable Search Feature"
          checked={adminSettings.enableSearch}
          onChange={(_, checked) => onAdminSettingChange('enableSearch', checked)}
          onText="Show search button"
          offText="Hide search button"
          styles={{ root: { marginTop: '16px' } }}
        />
        
        <Toggle
          label="Enable Animations"
          checked={adminSettings.enableAnimations}
          onChange={(_, checked) => onAdminSettingChange('enableAnimations', checked)}
          onText="Animated"
          offText="Static"
          styles={{ root: { marginTop: '16px' } }}
        />
        
        <Dropdown
          label="Default View Mode"
          selectedKey={adminSettings.defaultViewMode || 'compact'}
          onChange={(_, option) => onAdminSettingChange('defaultViewMode', option?.key as string)}
          options={[
            { key: 'compact', text: 'Compact Pills' },
            { key: 'dropdown', text: 'Category Dropdowns' },
            { key: 'search', text: 'Search-First' },
            { key: 'mixed', text: 'Mixed (Priority + Dropdowns)' }
          ]}
          styles={{ root: { marginTop: '16px' } }}
        />
        
        <Dropdown
          label="Banner Size"
          selectedKey={adminSettings.bannerSize || 'medium'}
          onChange={(_, option) => onAdminSettingChange('bannerSize', option?.key as string)}
          options={[
            { key: 'small', text: 'Small' },
            { key: 'medium', text: 'Medium (Default)' },
            { key: 'large', text: 'Large' }
          ]}
          styles={{ root: { marginTop: '16px' } }}
        />
        <p style={{ fontSize: '12px', color: theme.palette.neutralSecondary, marginTop: '4px' }}>
          Controls the height and padding of the collaboration footer banner
        </p>

        <Separator styles={{ root: { marginTop: '24px', marginBottom: '16px' } }} />
        
        <Text variant="mediumPlus" style={{ fontWeight: '600', marginBottom: '8px', display: 'block' }}>
          Organization-Wide Display Appearance
        </Text>
        <Text variant="small" style={{ color: theme.palette.neutralSecondary, marginBottom: '16px', display: 'block' }}>
          These settings will be applied as defaults for all users in the organization. Users can still override these settings in their personal preferences.
        </Text>

        <Dropdown
          label={strings.DisplayMode}
          selectedKey={adminSettings.defaultDisplayMode || DisplayMode.TypeBasedDropdowns}
          onChange={(_, option) => onAdminSettingChange('defaultDisplayMode', option?.key as DisplayMode)}
          options={displayModeOptions}
          styles={{ root: { marginTop: '16px' } }}
        />

        <Dropdown
          label={strings.PillStyle}
          selectedKey={adminSettings.defaultPillStyle || PillStyle.Rounded}
          onChange={(_, option) => onAdminSettingChange('defaultPillStyle', option?.key as PillStyle)}
          options={pillStyleOptions}
          styles={{ root: { marginTop: '16px' } }}
        />

        <Dropdown
          label={strings.PillSize}
          selectedKey={adminSettings.defaultPillSize || PillSize.Medium}
          onChange={(_, option) => onAdminSettingChange('defaultPillSize', option?.key as PillSize)}
          options={pillSizeOptions}
          styles={{ root: { marginTop: '16px' } }}
        />

        <Dropdown
          label={strings.Density}
          selectedKey={adminSettings.defaultDensity || Density.Normal}
          onChange={(_, option) => onAdminSettingChange('defaultDensity', option?.key as Density)}
          options={densityOptions}
          styles={{ root: { marginTop: '16px' } }}
        />

        <Dropdown
          label={strings.BarSize}
          selectedKey={adminSettings.defaultBarSize || BarSize.Medium}
          onChange={(_, option) => onAdminSettingChange('defaultBarSize', option?.key as BarSize)}
          options={barSizeOptions}
          styles={{ root: { marginTop: '16px' } }}
        />

        <Dropdown
          label={strings.IconSize}
          selectedKey={adminSettings.defaultIconSize || 'medium'}
          onChange={(_, option) => onAdminSettingChange('defaultIconSize', option?.key as string)}
          options={iconSizeOptions}
          styles={{ root: { marginTop: '16px' } }}
        />

        <Toggle
          label={strings.ShowIcons}
          checked={adminSettings.defaultShowIcons !== undefined ? adminSettings.defaultShowIcons : true}
          onChange={(_, checked) => onAdminSettingChange('defaultShowIcons', checked)}
          onText={strings.ShowIconsByDefault}
          offText={strings.HideIconsByDefault}
          styles={{ root: { marginTop: '16px' } }}
        />

        <Toggle
          label={strings.ShowBadges}
          checked={adminSettings.defaultShowBadges !== undefined ? adminSettings.defaultShowBadges : true}
          onChange={(_, checked) => onAdminSettingChange('defaultShowBadges', checked)}
          onText={strings.ShowBadgesByDefault}
          offText={strings.HideBadgesByDefault}
          styles={{ root: { marginTop: '16px' } }}
        />

      </div>
    </div>
  );
};