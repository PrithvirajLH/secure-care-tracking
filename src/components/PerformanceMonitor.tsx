import { useEffect } from 'react';

export const PerformanceMonitor = () => {
  useEffect(() => {
    // Monitor page load performance
    if (typeof window !== 'undefined' && 'performance' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            console.log('Page Load Performance:', {
              'DOM Content Loaded': navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart,
              'Load Complete': navEntry.loadEventEnd - navEntry.loadEventStart,
              'Total Load Time': navEntry.loadEventEnd - navEntry.fetchStart,
            });
          }
        }
      });

      observer.observe({ entryTypes: ['navigation'] });

      return () => observer.disconnect();
    }
  }, []);

  return null; // This component doesn't render anything
};
