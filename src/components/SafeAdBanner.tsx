import { useEffect, useRef, useState } from 'react';
import { importGoogleAdMob } from '@/utils/tossAdSdk';

interface SafeAdBannerProps {
  slot: string;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

const PROD_BANNER_AD_GROUP_ID = 'ait.v2.live.8f9f433c8fb24a9b';
const TEST_BANNER_AD_GROUP_ID = 'ait-ad-test-banner-id';
const IS_DEV = import.meta.env.DEV;
const BANNER_AD_GROUP_ID = IS_DEV ? TEST_BANNER_AD_GROUP_ID : PROD_BANNER_AD_GROUP_ID;

const heightMap = {
  small: 'h-[50px]',
  medium: 'h-[80px]',
  large: 'h-[100px]',
};

/**
 * Safe banner ad component.
 * - Returns null if SDK unavailable (no placeholder, no crash)
 * - All errors are caught and logged
 * - Never blocks or breaks surrounding UI
 */
const SafeAdBanner = ({ slot, size = 'medium', className = '' }: SafeAdBannerProps) => {
  const [sdkAvailable, setSdkAvailable] = useState(false);
  const [adLoaded, setAdLoaded] = useState(false);
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (attemptedRef.current) return;
    attemptedRef.current = true;

    (async () => {
      try {
        const sdk = await importGoogleAdMob();
        if (!sdk || sdk.loadAppsInTossAdMob.isSupported() !== true) return;

        setSdkAvailable(true);

        const cleanup = sdk.loadAppsInTossAdMob({
          options: { adGroupId: BANNER_AD_GROUP_ID },
          onEvent: (event) => {
            if (event.type === 'loaded') {
              console.log(`[SafeAdBanner:${slot}] loaded`);
              setAdLoaded(true);
              cleanup();
            }
          },
          onError: (error) => {
            console.warn(`[SafeAdBanner:${slot}] load failed`, error);
            cleanup?.();
          },
        });
      } catch (err) {
        console.warn(`[SafeAdBanner:${slot}] SDK error`, err);
      }
    })();
  }, [slot]);

  // If SDK is not available, render nothing — no crash, no placeholder
  if (!sdkAvailable) return null;

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

export default SafeAdBanner;
