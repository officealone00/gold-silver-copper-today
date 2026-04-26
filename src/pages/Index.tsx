import { useState, useEffect, useRef, useCallback } from 'react';
import Header from '@/components/Header';
import SummaryBox from '@/components/SummaryBox';
import GoldCard from '@/components/GoldCard';
import SilverCard from '@/components/SilverCard';
import CopperCard from '@/components/CopperCard';
import GoldCalculator from '@/components/GoldCalculator';
import GoldSavingSimulator from '@/components/GoldSavingSimulator';
import SilverInvestmentCalculator from '@/components/SilverInvestmentCalculator';
import SafeAdBanner from '@/components/SafeAdBanner';
import SectionErrorBoundary from '@/components/SectionErrorBoundary';
import { useMetalsPriceData } from '@/hooks/useMetalsPriceData';
import { useSafeInterstitialAd } from '@/hooks/useSafeInterstitialAd';
import { useAnalytics } from '@/hooks/useAnalytics';
import { usePremium } from '@/contexts/PremiumContext';
import { Link } from 'react-router-dom';

const splashLogo = 'https://static.toss.im/appsintoss/24163/f26ec7d5-f75a-48b5-ab03-d2a53908cec9.png';

const SPLASH_MIN_MS = 1200;

const Index = () => {
  const { data, isLoading, usedFallback, fetchPrices } = useMetalsPriceData();
  const { triggerDelayedAd } = useSafeInterstitialAd();
  const { track } = useAnalytics();
  const { isPremium } = usePremium();

  const [showSplash, setShowSplash] = useState(true);
  const splashStart = useRef(Date.now());
  const adTriggered = useRef(false);
  const calcAdShown = useRef(false);

  // Initial fetch
  useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);

  // Hide splash after data loads (with minimum display time)
  useEffect(() => {
    if (!isLoading) {
      const elapsed = Date.now() - splashStart.current;
      const remaining = Math.max(0, SPLASH_MIN_MS - elapsed);
      const timer = setTimeout(() => setShowSplash(false), remaining);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  // Track home view (전면 광고는 여기서 안 띄움)
  useEffect(() => {
    if (!showSplash && data && !adTriggered.current) {
      adTriggered.current = true;
      track('view_home');
      if (usedFallback) track('fallback_data_used');
    }
  }, [showSplash, data, track, usedFallback]);

  // 계산기 첫 사용 시 전면 광고 (1회만)
  const handleFirstCalc = useCallback(() => {
    if (calcAdShown.current || isPremium) return;
    calcAdShown.current = true;
    triggerDelayedAd();
  }, [isPremium, triggerDelayedAd]);

  const handleRefresh = () => {
    track('refresh_prices');
    fetchPrices();
  };

  // Splash screen
  if (showSplash || !data) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center max-w-lg mx-auto">
        <img src={splashLogo} alt="금은동시세" className="w-24 h-24 mb-4 animate-pulse" />
        <h1 className="text-xl font-bold text-foreground">오늘 금·은·동 시세</h1>
        <p className="text-sm text-muted-foreground mt-2">시세를 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-10 max-w-lg mx-auto">
      <Header collectedAt={data.collectedAt} onRefresh={handleRefresh} />

      <div className="space-y-4">
        <SectionErrorBoundary sectionName="SummaryBox">
          <SummaryBox data={data} />
        </SectionErrorBoundary>

        <SectionErrorBoundary sectionName="GoldCard">
          <GoldCard data={data.gold} />
        </SectionErrorBoundary>

        <SectionErrorBoundary sectionName="SilverCard">
          <SilverCard data={data.silver} />
        </SectionErrorBoundary>

        {!isPremium && (
          <SectionErrorBoundary sectionName="AdBanner-between-cards">
            <SafeAdBanner slot="between-price-cards" size="medium" />
          </SectionErrorBoundary>
        )}

        <SectionErrorBoundary sectionName="CopperCard">
          <CopperCard data={data.copper} />
        </SectionErrorBoundary>

        {!isPremium && (
          <SectionErrorBoundary sectionName="AdBanner-before-calc">
            <SafeAdBanner slot="before-calculators" size="large" />
          </SectionErrorBoundary>
        )}

        <SectionErrorBoundary sectionName="GoldCalculator">
          <GoldCalculator goldData={data.gold} onFirstCalc={handleFirstCalc} />
        </SectionErrorBoundary>

        <SectionErrorBoundary sectionName="GoldSavingSimulator">
          <GoldSavingSimulator goldData={data.gold} onFirstCalc={handleFirstCalc} />
        </SectionErrorBoundary>

        {!isPremium && (
          <SectionErrorBoundary sectionName="AdBanner-between-calc">
            <SafeAdBanner slot="between-calculators" size="medium" />
          </SectionErrorBoundary>
        )}

        <SectionErrorBoundary sectionName="SilverInvestmentCalculator">
          <SilverInvestmentCalculator silverData={data.silver} onFirstCalc={handleFirstCalc} />
        </SectionErrorBoundary>
      </div>

      {!isPremium && (
        <div className="mt-6">
          <SectionErrorBoundary sectionName="AdBanner-footer">
            <SafeAdBanner slot="footer" size="small" />
          </SectionErrorBoundary>
        </div>
      )}

      <div className="mt-4 px-5 space-y-3">
        <p className="text-xs text-muted-foreground leading-relaxed">
          본 시세 정보는 참고용이며 실제 거래 가격과 차이가 있을 수 있습니다.
        </p>
        <p className="text-xs text-muted-foreground">
          출처: Metals.dev (LBMA · LME · COMEX)
        </p>
        <div className="flex gap-3 text-xs">
          <Link to="/terms" className="text-primary underline">서비스 이용약관</Link>
          <Link to="/privacy" className="text-primary underline">개인정보처리방침</Link>
        </div>
      </div>
    </div>
  );
};

export default Index;