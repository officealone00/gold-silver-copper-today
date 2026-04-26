import { useCallback, useEffect, useRef, useState } from 'react';
import { loadFullScreenAd, showFullScreenAd } from '@apps-in-toss/web-framework';

const TEST_AD_GROUP_ID = 'ait-ad-test-interstitial-id';
const PROD_AD_GROUP_ID = 'ait.v2.live.94fb97941dd14bcb';
const USE_TEST_ADS = false;
const AD_GROUP_ID = USE_TEST_ADS ? TEST_AD_GROUP_ID : PROD_AD_GROUP_ID;

const INTERSTITIAL_DELAY_MS = 1800;

type AdStatus = 'idle' | 'loading' | 'loaded' | 'showing' | 'dismissed' | 'error' | 'unsupported';

function safeIsSupported(fn: any): boolean {
  try {
    if (typeof fn?.isSupported === 'function') return fn.isSupported();
    return false;
  } catch { return false; }
}

export function useSafeInterstitialAd() {
  const [status, setStatus] = useState<AdStatus>('idle');
  const isMountedRef = useRef(true);
  const adLoadedRef = useRef(false);
  const shownRef = useRef(false);

  const loadAd = useCallback(() => {
    try {
      if (!safeIsSupported(loadFullScreenAd)) {
        setStatus('unsupported');
        return;
      }

      setStatus('loading');

      loadFullScreenAd({
        options: { adGroupId: AD_GROUP_ID },
        onEvent: (event: any) => {
          if (!isMountedRef.current) return;
          if (event.type === 'loaded') {
            console.log('[SafeAd] 전면광고 로드 완료');
            adLoadedRef.current = true;
            setStatus('loaded');
          }
        },
        onError: (error: any) => {
          console.warn('[SafeAd] 전면광고 로드 실패', error);
          if (isMountedRef.current) setStatus('error');
        },
      });
    } catch {
      if (isMountedRef.current) setStatus('unsupported');
    }
  }, []);

  const showAd = useCallback(() => {
    try {
      if (!adLoadedRef.current || !safeIsSupported(showFullScreenAd)) return;

      setStatus('showing');

      showFullScreenAd({
        options: { adGroupId: AD_GROUP_ID },
        onEvent: (event: any) => {
          if (!isMountedRef.current) return;
          if (event.type === 'dismissed') {
            console.log('[SafeAd] 전면광고 닫힘');
            adLoadedRef.current = false;
            setStatus('dismissed');
            loadAd();
          } else if (event.type === 'failedToShow') {
            setStatus('error');
          }
        },
        onError: (error: any) => {
          console.warn('[SafeAd] 전면광고 표시 실패', error);
          if (isMountedRef.current) setStatus('error');
        },
      });
    } catch {
      if (isMountedRef.current) setStatus('error');
    }
  }, [loadAd]);

  const triggerDelayedAd = useCallback(() => {
    if (shownRef.current) return;
    shownRef.current = true;

    setTimeout(() => {
      if (!isMountedRef.current) return;
      showAd();
    }, INTERSTITIAL_DELAY_MS);
  }, [showAd]);

  useEffect(() => {
    isMountedRef.current = true;
    loadAd();
    return () => { isMountedRef.current = false; };
  }, [loadAd]);

  return { status, triggerDelayedAd, adGroupId: AD_GROUP_ID };
}