import { useCallback } from 'react';

type AnalyticsEvent =
  | 'view_home'
  | 'refresh_prices'
  | 'interstitial_shown'
  | 'interstitial_failed'
  | 'banner_rendered'
  | 'calculator_used'
  | 'fallback_data_used';

/**
 * Analytics hook — currently logs events.
 * Ready to integrate with a real analytics service later.
 */
export function useAnalytics() {
  const track = useCallback((event: AnalyticsEvent, data?: Record<string, unknown>) => {
    console.log(`[Analytics] ${event}`, data ?? '');
  }, []);

  return { track };
}
