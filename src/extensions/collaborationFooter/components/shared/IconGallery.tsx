import * as React from 'react';
import { useState } from 'react';
import { Modal } from '@fluentui/react/lib/Modal';
import { DefaultButton, PrimaryButton, IconButton } from '@fluentui/react/lib/Button';
import { TextField } from '@fluentui/react/lib/TextField';
import { Icon } from '@fluentui/react/lib/Icon';
import { IconService } from '../../services/IconService';
import { FileUploadDialog } from './FileUploadDialog';
import styles from './IconGallery.module.scss';

export interface IIconGalleryProps {
  isOpen: boolean;
  selectedIcon: string;
  onIconSelect: (iconName: string) => void;
  onCustomIconUpload: (file: File) => void;
  onClose: () => void;
}

export const IconGallery: React.FC<IIconGalleryProps> = ({
  isOpen,
  selectedIcon,
  onIconSelect,
  onCustomIconUpload,
  onClose
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('Basic');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showFileUpload, setShowFileUpload] = useState<boolean>(false);
  const [currentSelectedIcon, setCurrentSelectedIcon] = useState<string>(selectedIcon || '');
  const categories = IconService.getCategories();

  React.useEffect(() => {
    setCurrentSelectedIcon(selectedIcon || '');
  }, [selectedIcon]);

  const filteredIcons = IconService.filterIcons(
    selectedCategory === 'All' ? undefined : selectedCategory,
    searchQuery || undefined
  );

  const handleCustomIconUpload = (file: File) => {
    onCustomIconUpload(file);
    setShowFileUpload(false);
    onClose();
  };

  const handleConfirmSelection = () => {
    if (currentSelectedIcon) {
      onIconSelect(currentSelectedIcon);
    }
  };

  const handleUploadClick = () => {
    setShowFileUpload(true);
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onDismiss={onClose}
        isBlocking={true}
        containerClassName={styles.iconGalleryModal}
        isModeless={false}
        dragOptions={undefined}
        styles={{
          main: { 
            zIndex: 12000,
            position: 'relative'
          },
          root: {
            zIndex: 12000
          },
          scrollableContent: {
            zIndex: 12000
          }
        }}
        layerProps={{
          eventBubblingEnabled: false,
          styles: {
            root: {
              zIndex: 12000,
              position: 'fixed'
            },
            content: {
              zIndex: 12001
            }
          }
        }}
        focusTrapZoneProps={{
          isClickableOutsideFocusTrap: false,
          forceFocusInsideTrap: true
        }}
      >
        <div 
          className={styles.modalContainer}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
        >
          <div className={styles.headerContainer}>
            <h3 className={styles.title}>Select Icon</h3>
            <IconButton iconProps={{ iconName: 'Cancel' }} onClick={onClose} />
          </div>
          
          <div className={styles.searchContainer}>
            <TextField
              placeholder="Search icons..."
              value={searchQuery}
              onChange={(_, value) => setSearchQuery(value || '')}
              iconProps={{ iconName: 'Search' }}
              className={styles.searchField}
            />
            <DefaultButton
              text="Upload Image"
              iconProps={{ iconName: 'Upload' }}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                handleUploadClick();
              }}
              className={styles.uploadButton}
            />
          </div>
          
          <div className={styles.categoryContainer}>
            {['All', ...categories].map(category => (
              <DefaultButton
                key={category}
                text={category}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setSelectedCategory(category);
                }}
                primary={selectedCategory === category}
                className={styles.categoryButton}
              />
            ))}
          </div>
          
          <div className={styles.iconsGrid}>
            {filteredIcons.map(icon => (
              <div
                key={icon.name}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.nativeEvent.stopImmediatePropagation();
                  setCurrentSelectedIcon(icon.name);
                }}
                className={`${styles.iconItem} ${currentSelectedIcon === icon.name ? styles.selected : ''}`}
              >
                <Icon
                  iconName={icon.name}
                  className={`${styles.iconDisplay} ${currentSelectedIcon === icon.name ? styles.selected : styles.default}`}
                />
                <span className={styles.iconName}>
                  {icon.name}
                </span>
              </div>
            ))}
          </div>
          
          <div className={styles.buttonContainer}>
            <DefaultButton 
              text="Cancel" 
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onClose();
              }} 
            />
            <PrimaryButton
              text="Select"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                event.nativeEvent.stopImmediatePropagation();
                handleConfirmSelection();
                onClose();
              }}
              disabled={!currentSelectedIcon}
            />
          </div>
        </div>
      </Modal>

      <FileUploadDialog
        isOpen={showFileUpload}
        onDismiss={() => setShowFileUpload(false)}
        onFileSelected={handleCustomIconUpload}
        title="Upload Custom Icon"
        description="Select an image file to use as a custom icon"
        acceptedTypes={['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/gif']}
        maxFileSizeMB={2}
      />
    </>
  );
};
