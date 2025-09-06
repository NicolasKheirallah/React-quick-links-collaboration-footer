import { useRef, useEffect, useCallback } from 'react';

export const useSafeTimeout = () => {
  const timeoutRefs = useRef<Set<NodeJS.Timeout>>(new Set());

  const setSafeTimeout = useCallback((callback: () => void, delay: number): NodeJS.Timeout => {
    const timeoutId = setTimeout(() => {
      callback();
      timeoutRefs.current.delete(timeoutId);
    }, delay);
    
    timeoutRefs.current.add(timeoutId);
    return timeoutId;
  }, []);

  const clearSafeTimeout = useCallback((timeoutId: NodeJS.Timeout) => {
    clearTimeout(timeoutId);
    timeoutRefs.current.delete(timeoutId);
  }, []);

  const clearAllTimeouts = useCallback(() => {
    timeoutRefs.current.forEach(timeoutId => clearTimeout(timeoutId));
    timeoutRefs.current.clear();
  }, []);

  // Cleanup all timeouts when component unmounts
  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach(timeoutId => clearTimeout(timeoutId));
      timeoutRefs.current.clear();
    };
  }, []);

  return { setSafeTimeout, clearSafeTimeout, clearAllTimeouts };
};