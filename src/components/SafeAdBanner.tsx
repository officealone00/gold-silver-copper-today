import { useEffect, useRef, useState } from 'react';
import { TossAds } from '@apps-in-toss/web-framework';

interface SafeAdBannerProps {
  slot: string;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

const PROD_BANNER_AD_GROUP_ID = 'ait.v2.live.8f9f433c8fb24a9b';
const TEST_BANNER_AD_GROUP_ID = 'ait-ad-test-banner-id';
const USE_TEST_ADS = false;
const BANNER_AD_GROUP_ID = USE_TEST_ADS ? TEST_BANNER_AD_GROUP_ID : PROD_BANNER_AD_GROUP_ID;

const heightMap = {
  small: '50px',
  medium: '80px',
  large: '96px',
};

const SafeAdBanner = ({ slot, size = 'medium', className = '' }: SafeAdBannerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [adFailed, setAdFailed] = useState(false);
  const initAttempted = useRef(false);

  useEffect(() => {
    if (initAttempted.current) return;
    initAttempted.current = true;

    try {
      const supported = TossAds?.initialize?.isSupported?.();
      if (supported === false) {
        setAdFailed(true);
        return;
      }

      TossAds.initialize({
        callbacks: {
          onInitialized: () => setIsInitialized(true),
          onInitializationFailed: () => setAdFailed(true),
        },
      });
    } catch {
      setAdFailed(true);
    }
  }, [slot]);

  useEffect(() => {
    if (!isInitialized || !containerRef.current) return;

    try {
      if (TossAds?.attachBanner?.isSupported?.() === false) {
        setAdFailed(true);
        return;
      }

      const attached = TossAds.attachBanner(BANNER_AD_GROUP_ID, containerRef.current, {
        theme: 'auto',
        tone: 'grey',
        variant: 'expanded',
        callbacks: {
          onAdRendered: () => console.log(`[Banner:${slot}] rendered`),
          onNoFill: () => setAdFailed(true),
          onAdFailedToRender: () => setAdFailed(true),
        },
      });

      return () => { attached?.destroy(); };
    } catch {
      setAdFailed(true);
    }
  }, [isInitialized, slot]);

  if (adFailed) return null;

  return (
    <div className={`mx-5 ${className}`} data-ad-slot={slot}>
      <div ref={containerRef} style={{ width: '100%', height: heightMap[size] }} />
    </div>
  );
};

export default SafeAdBanner;