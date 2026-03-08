import { useCallback, useEffect, useRef, useState } from 'react';

// 테스트 광고 ID / 실 광고 ID
const TEST_AD_GROUP_ID = 'ait-ad-test-interstitial-id';
const PROD_AD_GROUP_ID = 'ait-ad-test-interstitial-id'; // TODO: 실 광고 ID 발급 후 교체

// 개발 환경인지 여부 (테스트 ID 사용 판단)
const IS_DEV = import.meta.env.DEV;
const AD_GROUP_ID = IS_DEV ? TEST_AD_GROUP_ID : PROD_AD_GROUP_ID;

type AdStatus = 'idle' | 'loading' | 'loaded' | 'showing' | 'dismissed' | 'error';

/**
 * 토스 전면형(interstitial) 광고 훅
 * - 페이지 진입 시 자동으로 load
 * - showAd() 호출 시 전면 광고 표시
 * - 광고 재생 중 사운드 일시정지 / 종료 후 재개
 */
export function useInterstitialAd() {
  const [status, setStatus] = useState<AdStatus>('idle');
  const cleanupRef = useRef<(() => void) | null>(null);
  const isMountedRef = useRef(true);

  // 사운드 제어: 모든 <audio>/<video> 요소를 일시정지/재개
  const pauseAllMedia = useCallback(() => {
    const mediaElements = document.querySelectorAll<HTMLMediaElement>('audio, video');
    mediaElements.forEach((el) => {
      if (!el.paused) {
        el.dataset.adPaused = 'true';
        el.pause();
      }
    });
  }, []);

  const resumeAllMedia = useCallback(() => {
    const mediaElements = document.querySelectorAll<HTMLMediaElement>('audio, video');
    mediaElements.forEach((el) => {
      if (el.dataset.adPaused === 'true') {
        delete el.dataset.adPaused;
        el.play().catch(() => {});
      }
    });
  }, []);

  const loadAd = useCallback(async () => {
    try {
      const { GoogleAdMob } = await import('@apps-in-toss/web-framework');

      if (GoogleAdMob.loadAppsInTossAdMob.isSupported() !== true) {
        console.warn('[Ad] loadAppsInTossAdMob not supported');
        return;
      }

      setStatus('loading');

      const cleanup = GoogleAdMob.loadAppsInTossAdMob({
        options: { adGroupId: AD_GROUP_ID },
        onEvent: (event) => {
          if (!isMountedRef.current) return;
          switch (event.type) {
            case 'loaded':
              console.log('[Ad] 전면광고 로드 완료');
              setStatus('loaded');
              cleanup();
              break;
          }
        },
        onError: (error) => {
          console.error('[Ad] 전면광고 로드 실패', error);
          if (isMountedRef.current) setStatus('error');
          cleanup?.();
        },
      });

      cleanupRef.current = cleanup;
    } catch (err) {
      // @apps-in-toss/web-framework 를 로드할 수 없는 환경 (Lovable 프리뷰 등)
      console.warn('[Ad] Toss SDK 사용 불가 환경', err);
      if (isMountedRef.current) setStatus('error');
    }
  }, []);

  const showAd = useCallback(async () => {
    try {
      const { GoogleAdMob } = await import('@apps-in-toss/web-framework');

      if (GoogleAdMob.showAppsInTossAdMob.isSupported() !== true) {
        console.warn('[Ad] showAppsInTossAdMob not supported');
        return;
      }

      // 광고 재생 전 사운드 일시정지
      pauseAllMedia();
      setStatus('showing');

      GoogleAdMob.showAppsInTossAdMob({
        options: { adGroupId: AD_GROUP_ID },
        onEvent: (event) => {
          if (!isMountedRef.current) return;
          switch (event.type) {
            case 'show':
              console.log('[Ad] 전면광고 표시됨');
              break;
            case 'requested':
              console.log('[Ad] 전면광고 요청 완료');
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
              // 광고 종료 후 사운드 재개
              resumeAllMedia();
              // 다음 광고를 위해 다시 로드
              loadAd();
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
    } catch (err) {
      console.warn('[Ad] Toss SDK 사용 불가 환경', err);
      resumeAllMedia();
    }
  }, [pauseAllMedia, resumeAllMedia, loadAd]);

  // 페이지 진입 시 자동 로드
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
