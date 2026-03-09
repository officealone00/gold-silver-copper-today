import { useCallback, useEffect, useRef, useState } from 'react';
import { importGoogleAdMob, type GoogleAdMobSDK } from '@/utils/tossAdSdk';

// 테스트 광고 ID / 실 광고 ID
const TEST_AD_GROUP_ID = 'ait-ad-test-interstitial-id';
const PROD_AD_GROUP_ID = 'ait.v2.live.94fb97941dd14bcb';

const IS_DEV = import.meta.env.DEV;
const AD_GROUP_ID = IS_DEV ? TEST_AD_GROUP_ID : PROD_AD_GROUP_ID;

type AdStatus = 'idle' | 'loading' | 'loaded' | 'showing' | 'dismissed' | 'error' | 'unsupported';

export function useInterstitialAd() {
  const [status, setStatus] = useState<AdStatus>('idle');
  const sdkRef = useRef<GoogleAdMobSDK | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const isMountedRef = useRef(true);

  const pauseAllMedia = useCallback(() => {
    document.querySelectorAll<HTMLMediaElement>('audio, video').forEach((el) => {
      if (!el.paused) {
        el.dataset.adPaused = 'true';
        el.pause();
      }
    });
  }, []);

  const resumeAllMedia = useCallback(() => {
    document.querySelectorAll<HTMLMediaElement>('audio, video').forEach((el) => {
      if (el.dataset.adPaused === 'true') {
        delete el.dataset.adPaused;
        el.play().catch(() => {});
      }
    });
  }, []);

  const loadAd = useCallback(async () => {
    const sdk = sdkRef.current ?? await importGoogleAdMob();
    if (!sdk) {
      if (isMountedRef.current) setStatus('unsupported');
      return;
    }
    sdkRef.current = sdk;

    if (sdk.loadAppsInTossAdMob.isSupported() !== true) {
      console.warn('[Ad] loadAppsInTossAdMob not supported');
      if (isMountedRef.current) setStatus('unsupported');
      return;
    }

    setStatus('loading');

    const cleanup = sdk.loadAppsInTossAdMob({
      options: { adGroupId: AD_GROUP_ID },
      onEvent: (event) => {
        if (!isMountedRef.current) return;
        if (event.type === 'loaded') {
          console.log('[Ad] 전면광고 로드 완료');
          setStatus('loaded');
          cleanup();
        }
      },
      onError: (error) => {
        console.error('[Ad] 전면광고 로드 실패', error);
        if (isMountedRef.current) setStatus('error');
        cleanup?.();
      },
    });

    cleanupRef.current = cleanup;
  }, []);

  const showAd = useCallback(async () => {
    const sdk = sdkRef.current;
    if (!sdk || sdk.showAppsInTossAdMob.isSupported() !== true) {
      console.warn('[Ad] showAppsInTossAdMob not supported');
      return;
    }

    pauseAllMedia();
    setStatus('showing');

    sdk.showAppsInTossAdMob({
      options: { adGroupId: AD_GROUP_ID },
      onEvent: (event) => {
        if (!isMountedRef.current) return;
        switch (event.type) {
          case 'show':
            console.log('[Ad] 전면광고 표시됨');
            break;
          case 'impression':
            console.log('[Ad] 전면광고 노출');
            break;
          case 'clicked':
            console.log('[Ad] 전면광고 클릭');
            break;
          case 'dismissed':
            console.log('[Ad] 전면광고 닫힘');
            setStatus('dismissed');
            resumeAllMedia();
            loadAd(); // 다음 광고 미리 로드
            break;
          case 'failedToShow':
            console.error('[Ad] 전면광고 표시 실패');
            setStatus('error');
            resumeAllMedia();
            break;
        }
      },
      onError: (error) => {
        console.error('[Ad] 전면광고 보여주기 실패', error);
        if (isMountedRef.current) {
          setStatus('error');
          resumeAllMedia();
        }
      },
    });
  }, [pauseAllMedia, resumeAllMedia, loadAd]);

  useEffect(() => {
    isMountedRef.current = true;
    loadAd();
    return () => {
      isMountedRef.current = false;
      cleanupRef.current?.();
    };
  }, [loadAd]);

  return { status, loadAd, showAd, adGroupId: AD_GROUP_ID };
}
