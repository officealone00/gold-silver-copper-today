import { useEffect, useRef, useState } from 'react';

interface AdBannerProps {
  slot: string;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

// 테스트 배너 광고 ID / 실 배너 광고 ID
const TEST_BANNER_AD_GROUP_ID = 'ait-ad-test-interstitial-id'; // 배너 전용 테스트 ID가 없으므로 동일 ID 사용
const PROD_BANNER_AD_GROUP_ID = 'ait-ad-test-interstitial-id'; // TODO: 실 배너 광고 ID 발급 후 교체

const IS_DEV = import.meta.env.DEV;
const BANNER_AD_GROUP_ID = IS_DEV ? TEST_BANNER_AD_GROUP_ID : PROD_BANNER_AD_GROUP_ID;

/**
 * 광고 배너 컴포넌트
 * - 토스 앱 내에서는 실제 AdMob 배너 SDK를 통해 광고 표시
 * - SDK 미지원 환경에서는 플레이스홀더 표시
 */
const AdBanner = ({ slot, size = 'medium', className = '' }: AdBannerProps) => {
  const [sdkAvailable, setSdkAvailable] = useState(false);
  const [adLoaded, setAdLoaded] = useState(false);
  const attemptedRef = useRef(false);

  const heightMap = {
    small: 'h-[50px]',
    medium: 'h-[80px]',
    large: 'h-[100px]',
  };

  useEffect(() => {
    if (attemptedRef.current) return;
    attemptedRef.current = true;

    (async () => {
      try {
        const { GoogleAdMob } = await import('@apps-in-toss/web-framework');
        if (GoogleAdMob.loadAppsInTossAdMob.isSupported() === true) {
          setSdkAvailable(true);

          const cleanup = GoogleAdMob.loadAppsInTossAdMob({
            options: { adGroupId: BANNER_AD_GROUP_ID },
            onEvent: (event) => {
              if (event.type === 'loaded') {
                console.log(`[AdBanner:${slot}] 배너 광고 로드 완료`);
                setAdLoaded(true);
                cleanup();
              }
            },
            onError: (error) => {
              console.warn(`[AdBanner:${slot}] 배너 광고 로드 실패`, error);
              cleanup?.();
            },
          });
        }
      } catch {
        // SDK 미지원 환경
        console.warn(`[AdBanner:${slot}] Toss SDK 사용 불가 환경`);
      }
    })();
  }, [slot]);

  // SDK 미지원 환경: placeholder
  if (!sdkAvailable) {
    return (
      <div
        className={`mx-5 rounded-2xl bg-muted/60 border border-dashed border-border flex items-center justify-center ${heightMap[size]} ${className}`}
        data-ad-slot={slot}
      >
        <span className="text-xs text-muted-foreground/50">AD · {slot}</span>
      </div>
    );
  }

  // SDK 사용 가능: 광고 영역
  return (
    <div
      className={`mx-5 rounded-2xl overflow-hidden flex items-center justify-center ${heightMap[size]} ${className}`}
      data-ad-slot={slot}
      data-ad-group-id={BANNER_AD_GROUP_ID}
      data-ad-loaded={adLoaded ? 'true' : 'false'}
    >
      {!adLoaded && (
        <div className="w-full h-full bg-muted/40 flex items-center justify-center">
          <span className="text-xs text-muted-foreground/40">광고 로딩중...</span>
        </div>
      )}
    </div>
  );
};

export default AdBanner;
