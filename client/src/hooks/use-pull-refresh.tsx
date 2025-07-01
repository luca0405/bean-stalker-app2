import { useEffect, useState, useRef, useCallback } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  distanceToRefresh?: number;
  pullDownIndicatorDelay?: number;
  resetDelay?: number;
}

/**
 * Hook to add pull-to-refresh functionality to any component
 */
export function usePullToRefresh({
  onRefresh,
  distanceToRefresh = 80,
  pullDownIndicatorDelay = 1000,
  resetDelay = 300
}: UsePullToRefreshOptions) {
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const touchStartRef = useRef(0);
  const startScrollTopRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const isAtTopRef = useRef(false);

  const resetPullState = useCallback(() => {
    setPullDistance(0);
    setIsPulling(false);
    isAtTopRef.current = false;
  }, []);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    // Store the initial scroll position and touch position
    if (containerRef.current) {
      startScrollTopRef.current = containerRef.current.scrollTop;
      
      // Only activate pull to refresh when at the top of the scroll container
      if (startScrollTopRef.current <= 0) {
        isAtTopRef.current = true;
        const touch = e.touches[0];
        touchStartRef.current = touch.clientY;
      }
    }
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isAtTopRef.current || isRefreshing) return;
    
    const container = containerRef.current;
    if (!container) return;
    
    // If the user has scrolled down even a little bit, don't do pull-to-refresh
    if (container.scrollTop > 1) {
      isAtTopRef.current = false;
      return;
    }
    
    const touch = e.touches[0];
    const pullDistanceValue = touch.clientY - touchStartRef.current;
    
    // Only process downward pulls
    if (pullDistanceValue > 0) {
      // Prevent default to stop scrolling behavior while pulling down
      e.preventDefault();
      setIsPulling(true);
      
      // Apply some resistance to the pull
      const resistedDistance = Math.min(pullDistanceValue * 0.3, distanceToRefresh * 1.5);
      setPullDistance(resistedDistance);
    }
  }, [distanceToRefresh, isRefreshing]);

  const handleTouchEnd = useCallback(() => {
    if (!isAtTopRef.current || !isPulling || isRefreshing) {
      resetPullState();
      return;
    }

    // If we've pulled far enough, trigger refresh
    if (pullDistance >= distanceToRefresh) {
      setIsRefreshing(true);
      setPullDistance(0);
      
      // Execute the refresh callback
      onRefresh()
        .catch(err => console.error('Refresh failed:', err))
        .finally(() => {
          // Reset state after refresh completes
          setTimeout(() => {
            setIsRefreshing(false);
            resetPullState();
          }, resetDelay);
        });
    } else {
      // Reset if we didn't pull far enough
      resetPullState();
    }
  }, [distanceToRefresh, isPulling, isRefreshing, onRefresh, pullDistance, resetDelay, resetPullState]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Use passive: false to be able to prevent default
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });
    container.addEventListener('touchcancel', resetPullState, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', resetPullState);
    };
  }, [handleTouchEnd, handleTouchMove, handleTouchStart, resetPullState]);

  // Return both the ref to attach and the state for UI feedback
  return {
    containerRef,
    pullDistance,
    isPulling,
    isRefreshing,
  };
}