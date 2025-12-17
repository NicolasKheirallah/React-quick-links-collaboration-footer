import * as React from 'react';
import { Icon } from '@fluentui/react/lib/Icon';
import styles from './LinkBadge.module.scss';

export interface ILinkBadgeProps {
  type: 'new' | 'updated' | 'popular' | 'urgent';
  text?: string;
}

export const LinkBadge: React.FC<ILinkBadgeProps> = ({ type, text }) => {
  const getBadgeText = () => {
    switch (type) {
      case 'new': return text || 'New';
      case 'updated': return text || <Icon iconName="Info" />;
      case 'popular': return text || <Icon iconName="FavoriteStar" />;
      case 'urgent': return text || <Icon iconName="Warning" />;
      default: return text || type;
    }
  };

  return (
    <div className={`${styles.linkBadge} ${styles[type]}`}>
      {getBadgeText()}
    </div>
  );
};