import { useCallback, useEffect, useRef, useState } from 'react';
import { importGoogleAdMob, type GoogleAdMobSDK } from '@/utils/tossAdSdk';

const TEST_AD_GROUP_ID = 'ait-ad-test-interstitial-id';
const PROD_AD_GROUP_ID = 'ait.v2.live.94fb97941dd14bcb';
const IS_DEV = import.meta.env.DEV;
const AD_GROUP_ID = IS_DEV ? TEST_AD_GROUP_ID : PROD_AD_GROUP_ID;

/** Delay (ms) after main UI renders before showing interstitial */
const INTERSTITIAL_DELAY_MS = 1800;

type AdStatus = 'idle' | 'loading' | 'loaded' | 'showing' | 'dismissed' | 'error' | 'unsupported';

/**
 * Safe interstitial ad hook.
 * - Never throws uncaught errors
 * - Delays ad show until after main UI is painted
 * - All operations wrapped in try/catch
 * - Returns no-op callbacks if SDK unavailable
 */
export function useSafeInterstitialAd() {
  const [status, setStatus] = useState<AdStatus>('idle');
  const sdkRef = useRef<GoogleAdMobSDK | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const isMountedRef = useRef(true);
  const shownRef = useRef(false);

  const pauseAllMedia = useCallback(() => {
    try {
      document.querySelectorAll<HTMLMediaElement>('audio, video').forEach((el) => {
        if (!el.paused) {
          el.dataset.adPaused = 'true';
          el.pause();
        }
      });
    } catch { /* safe */ }
  }, []);

  const resumeAllMedia = useCallback(() => {
    try {
      document.querySelectorAll<HTMLMediaElement>('audio, video').forEach((el) => {
        if (el.dataset.adPaused === 'true') {
          delete el.dataset.adPaused;
          el.play().catch(() => {});
        }
      });
    } catch { /* safe */ }
  }, []);

  const loadAd = useCallback(async () => {
    try {
      const sdk = sdkRef.current ?? await importGoogleAdMob();
      if (!sdk) {
        if (isMountedRef.current) setStatus('unsupported');
        return;
      }
      sdkRef.current = sdk;

      if (sdk.loadAppsInTossAdMob.isSupported() !== true) {
        if (isMountedRef.current) setStatus('unsupported');
        return;
      }

      setStatus('loading');

      const cleanup = sdk.loadAppsInTossAdMob({
        options: { adGroupId: AD_GROUP_ID },
        onEvent: (event) => {
          if (!isMountedRef.current) return;
          if (event.type === 'loaded') {
            console.log('[SafeAd] interstitial loaded');
            setStatus('loaded');
            cleanup();
          }
        },
        onError: (error) => {
          console.warn('[SafeAd] interstitial load failed', error);
          if (isMountedRef.current) setStatus('error');
          cleanup?.();
        },
      });

      cleanupRef.current = cleanup;
    } catch (err) {
      console.warn('[SafeAd] loadAd error', err);
      if (isMountedRef.current) setStatus('error');
    }
  }, []);

  const showAd = useCallback(async () => {
    try {
      const sdk = sdkRef.current;
      if (!sdk || sdk.showAppsInTossAdMob.isSupported() !== true) {
        console.warn('[SafeAd] showAd not supported');
        return;
      }

      pauseAllMedia();
      setStatus('showing');

      sdk.showAppsInTossAdMob({
        options: { adGroupId: AD_GROUP_ID },
        onEvent: (event) => {
          if (!isMountedRef.current) return;
          if (event.type === 'dismissed') {
            console.log('[SafeAd] interstitial dismissed');
            setStatus('dismissed');
            resumeAllMedia();
            loadAd();
          } else if (event.type === 'failedToShow') {
            console.warn('[SafeAd] interstitial failedToShow');
            setStatus('error');
            resumeAllMedia();
          }
        },
        onError: (error) => {
          console.warn('[SafeAd] showAd error', error);
          if (isMountedRef.current) {
            setStatus('error');
            resumeAllMedia();
          }
        },
      });
    } catch (err) {
      console.warn('[SafeAd] showAd caught error', err);
      if (isMountedRef.current) setStatus('error');
      resumeAllMedia();
    }
  }, [pauseAllMedia, resumeAllMedia, loadAd]);

  /**
   * Trigger interstitial with delay after main UI is visible.
   * Call this once after main content has rendered.
   */
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
    return () => {
      isMountedRef.current = false;
      cleanupRef.current?.();
    };
  }, [loadAd]);

  return { status, triggerDelayedAd, adGroupId: AD_GROUP_ID };
}
