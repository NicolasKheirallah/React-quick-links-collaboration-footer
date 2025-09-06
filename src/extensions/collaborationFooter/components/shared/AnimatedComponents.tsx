import * as React from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';

// Modern, performance-optimized animated components using CSS-in-JS and requestAnimationFrame

export interface IAnimatedContainerProps {
  children: React.ReactNode;
  isVisible?: boolean;
  className?: string;
  style?: React.CSSProperties;
  animationType?: 'fade' | 'slide' | 'scale' | 'slideUp' | 'slideDown' | 'none';
  duration?: number; // in milliseconds
  delay?: number; // in milliseconds
  stagger?: boolean;
  staggerDelay?: number;
  onAnimationComplete?: () => void;
}

export const AnimatedContainer: React.FC<IAnimatedContainerProps> = ({
  children,
  isVisible = true,
  className = '',
  style = {},
  animationType = 'fade',
  duration = 300,
  delay = 0,
  onAnimationComplete
}) => {
  const [shouldRender, setShouldRender] = useState(isVisible);
  const [isAnimating, setIsAnimating] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const getAnimationStyles = useCallback((visible: boolean): React.CSSProperties => {
    if (animationType === 'none') {
      return { opacity: visible ? 1 : 0 };
    }

    const baseStyle: React.CSSProperties = {
      transition: `all ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`,
      transitionDelay: `${delay}ms`
    };

    switch (animationType) {
      case 'fade':
        return {
          ...baseStyle,
          opacity: visible ? 1 : 0
        };
      case 'scale':
        return {
          ...baseStyle,
          opacity: visible ? 1 : 0,
          transform: visible ? 'scale(1)' : 'scale(0.95)'
        };
      case 'slide':
        return {
          ...baseStyle,
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateX(0)' : 'translateX(-20px)'
        };
      case 'slideUp':
        return {
          ...baseStyle,
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(20px)'
        };
      case 'slideDown':
        return {
          ...baseStyle,
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(-20px)'
        };
      default:
        return baseStyle;
    }
  }, [animationType, duration, delay]);

  useEffect(() => {
    if (isVisible && !shouldRender) {
      setShouldRender(true);
      setIsAnimating(true);
    } else if (!isVisible && shouldRender) {
      setIsAnimating(true);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        setShouldRender(false);
        setIsAnimating(false);
        onAnimationComplete?.();
      }, duration + delay);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isVisible, shouldRender, duration, delay, onAnimationComplete]);

  useEffect(() => {
    if (isVisible && isAnimating) {
      const timer = setTimeout(() => {
        setIsAnimating(false);
        onAnimationComplete?.();
      }, duration + delay + 50);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isVisible, isAnimating, duration, delay, onAnimationComplete]);

  if (!shouldRender) return null;

  return (
    <div 
      ref={elementRef}
      className={className} 
      style={{
        ...style,
        ...getAnimationStyles(isVisible)
      }}
    >
      {children}
    </div>
  );
};

export interface IAnimatedListProps {
  children: React.ReactElement[];
  className?: string;
  stagger?: boolean;
  staggerDelay?: number;
  animationType?: 'fade' | 'slide' | 'scale' | 'slideUp';
  duration?: number;
  isVisible?: boolean;
  onAnimationComplete?: () => void;
}

export const AnimatedList: React.FC<IAnimatedListProps> = ({
  children,
  className = '',
  stagger = false,
  staggerDelay = 100,
  animationType = 'fade',
  duration = 300,
  isVisible = true,
  onAnimationComplete
}) => {
  const [visibleItems, setVisibleItems] = useState<boolean[]>([]);
  const completedAnimations = useRef<number>(0);

  useEffect(() => {
    if (isVisible && children.length > 0) {
      if (stagger) {
        // Stagger the animations
        setVisibleItems(new Array(children.length).fill(false));
        children.forEach((_, index) => {
          setTimeout(() => {
            setVisibleItems(prev => {
              const newState = [...prev];
              newState[index] = true;
              return newState;
            });
          }, index * staggerDelay);
        });
      } else {
        // Show all at once
        setVisibleItems(new Array(children.length).fill(true));
      }
    } else {
      setVisibleItems(new Array(children.length).fill(false));
    }
  }, [isVisible, children.length, stagger, staggerDelay]);

  const handleItemAnimationComplete = useCallback(() => {
    completedAnimations.current += 1;
    if (completedAnimations.current === children.length) {
      onAnimationComplete?.();
      completedAnimations.current = 0;
    }
  }, [children.length, onAnimationComplete]);

  return (
    <div className={className}>
      {children.map((child, index) => (
        <AnimatedContainer
          key={child.key || index}
          isVisible={visibleItems[index] || false}
          animationType={animationType}
          duration={duration}
          onAnimationComplete={handleItemAnimationComplete}
        >
          {child}
        </AnimatedContainer>
      ))}
    </div>
  );
};

export interface IHoverAnimationProps {
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  hoverType?: 'lift' | 'scale' | 'tilt' | 'grow' | 'glow' | 'brightness' | 'none';
  duration?: number;
}

export const HoverAnimation: React.FC<IHoverAnimationProps> = ({
  children,
  disabled = false,
  className = '',
  onClick,
  onMouseEnter,
  onMouseLeave,
  hoverType = 'scale',
  duration = 200
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const getHoverStyles = useCallback((): React.CSSProperties => {
    if (disabled || hoverType === 'none') {
      return {
        cursor: onClick && !disabled ? 'pointer' : 'default'
      };
    }

    const baseStyle: React.CSSProperties = {
      cursor: onClick && !disabled ? 'pointer' : 'default',
      transition: `all ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`,
      willChange: 'transform, box-shadow, filter'
    };

    if (!isHovered) return baseStyle;

    switch (hoverType) {
      case 'lift':
        return {
          ...baseStyle,
          transform: 'translateY(-2px)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
        };
      case 'scale':
        return {
          ...baseStyle,
          transform: 'scale(1.05)'
        };
      case 'tilt':
        return {
          ...baseStyle,
          transform: 'rotate(1deg) scale(1.02)'
        };
      case 'grow':
        return {
          ...baseStyle,
          transform: 'scale(1.1)'
        };
      case 'glow':
        return {
          ...baseStyle,
          boxShadow: '0 0 20px rgba(0, 120, 212, 0.3)',
          filter: 'brightness(1.1)'
        };
      case 'brightness':
        return {
          ...baseStyle,
          filter: 'brightness(1.1) contrast(1.05)'
        };
      default:
        return baseStyle;
    }
  }, [disabled, hoverType, duration, isHovered, onClick]);

  const handleMouseEnter = useCallback(() => {
    if (!disabled) {
      setIsHovered(true);
      onMouseEnter?.();
    }
  }, [disabled, onMouseEnter]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    onMouseLeave?.();
  }, [onMouseLeave]);

  return (
    <div
      className={className}
      style={getHoverStyles()}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </div>
  );
};

export interface IRippleEffectProps {
  children: React.ReactNode;
  className?: string;
  onClick?: (event: React.MouseEvent) => void;
  disabled?: boolean;
  color?: string;
  duration?: number;
}

export const RippleEffect: React.FC<IRippleEffectProps & React.HTMLAttributes<HTMLDivElement>> = ({ 
  children, 
  className = '',
  onClick,
  disabled = false,
  color = 'rgba(255, 255, 255, 0.6)',
  duration = 600,
  style,
  ...props 
}) => {
  const [ripples, setRipples] = useState<Array<{id: number, x: number, y: number, size: number}>>([]);
  const nextRippleId = useRef(0);

  const addRipple = useCallback((event: React.MouseEvent) => {
    if (disabled) return;
    
    const rect = event.currentTarget.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;
    const id = nextRippleId.current++;

    setRipples(prev => [...prev, { id, x, y, size }]);

    setTimeout(() => {
      setRipples(prev => prev.filter(ripple => ripple.id !== id));
    }, duration);
  }, [disabled, duration]);

  const handleClick = useCallback((event: React.MouseEvent) => {
    addRipple(event);
    onClick?.(event);
  }, [addRipple, onClick]);

  return (
    <div 
      {...props}
      className={className}
      onClick={handleClick}
      style={{
        position: 'relative',
        overflow: 'hidden',
        cursor: onClick && !disabled ? 'pointer' : 'default',
        ...style
      }}
    >
      {children}
      {ripples.map(ripple => (
        <span
          key={ripple.id}
          style={{
            position: 'absolute',
            left: ripple.x,
            top: ripple.y,
            width: ripple.size,
            height: ripple.size,
            borderRadius: '50%',
            backgroundColor: color,
            transform: 'scale(0)',
            animation: `ripple-animation ${duration}ms ease-out`,
            pointerEvents: 'none'
          }}
        />
      ))}
      <style>{`
        @keyframes ripple-animation {
          to {
            transform: scale(2);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

// Utility hook for managing animation states
export const useAnimation = (initialVisible: boolean = false) => {
  const [isVisible, setIsVisible] = useState(initialVisible);
  const [isAnimating, setIsAnimating] = useState(false);

  const show = useCallback(() => {
    setIsVisible(true);
  }, []);

  const hide = useCallback(() => {
    setIsVisible(false);
  }, []);

  const toggle = useCallback(() => {
    setIsVisible(prev => !prev);
  }, []);

  return {
    isVisible,
    isAnimating,
    show,
    hide,
    toggle,
    setIsAnimating
  };
};

// Performance optimization: Skip animations if user prefers reduced motion
export const useReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return prefersReducedMotion;
};