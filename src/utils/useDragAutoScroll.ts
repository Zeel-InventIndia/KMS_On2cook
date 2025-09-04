import { useEffect, useRef, useState } from 'react';

interface UseDragAutoScrollOptions {
  scrollThreshold?: number;
  scrollSpeed?: number;
  enabled?: boolean;
}

export function useDragAutoScroll({
  scrollThreshold = 50,
  scrollSpeed = 10,
  enabled = true
}: UseDragAutoScrollOptions = {}) {
  const [isDragging, setIsDragging] = useState(false);
  const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !enabled) return;

    const { clientY } = e;
    const windowHeight = window.innerHeight;
    
    // Clear any existing scroll interval
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }

    // Check if we need to scroll up
    if (clientY < scrollThreshold) {
      scrollIntervalRef.current = setInterval(() => {
        window.scrollBy({
          top: -scrollSpeed,
          behavior: 'auto'
        });
      }, 16); // ~60fps
    }
    // Check if we need to scroll down
    else if (clientY > windowHeight - scrollThreshold) {
      scrollIntervalRef.current = setInterval(() => {
        window.scrollBy({
          top: scrollSpeed,
          behavior: 'auto'
        });
      }, 16); // ~60fps
    }
  };

  const startDragging = () => {
    setIsDragging(true);
  };

  const stopDragging = () => {
    setIsDragging(false);
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
  };

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', stopDragging);
    document.addEventListener('dragend', stopDragging);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', stopDragging);
      document.removeEventListener('dragend', stopDragging);
      
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
      }
    };
  }, [isDragging, enabled, scrollThreshold, scrollSpeed]);

  return {
    startDragging,
    stopDragging,
    isDragging
  };
}