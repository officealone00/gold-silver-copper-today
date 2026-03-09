import { useEffect, useRef, useState } from 'react';
import { importGoogleAdMob } from '@/utils/tossAdSdk';

interface AdBannerProps {
  slot: string;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

const TEST_BANNER_AD_GROUP_ID = 'ait-ad-test-banner-id';
const PROD_BANNER_AD_GROUP_ID = 'ait.v2.live.8f9f433c8fb24a9b';

const IS_DEV = import.meta.env.DEV;
const BANNER_AD_GROUP_ID = IS_DEV ? TEST_BANNER_AD_GROUP_ID : PROD_BANNER_AD_GROUP_ID;

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
      const sdk = await importGoogleAdMob();
      if (!sdk || sdk.loadAppsInTossAdMob.isSupported() !== true) return;

      setSdkAvailable(true);

      const cleanup = sdk.loadAppsInTossAdMob({
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
    })();
  }, [slot]);

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
