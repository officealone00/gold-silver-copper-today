import { useState, useEffect, useCallback, useRef } from 'react';
import Header from '@/components/Header';
import SummaryBox from '@/components/SummaryBox';
import GoldCard from '@/components/GoldCard';
import SilverCard from '@/components/SilverCard';
import CopperCard from '@/components/CopperCard';
import GoldCalculator from '@/components/GoldCalculator';
import GoldSavingSimulator from '@/components/GoldSavingSimulator';
import SilverInvestmentCalculator from '@/components/SilverInvestmentCalculator';
import AdBanner from '@/components/AdBanner';
import { mockPriceData } from '@/services/mockData';
import type { PriceData } from '@/services/mockData';
import { Link } from 'react-router-dom';

import splashLogo from '@/assets/splash-logo.png';

const SPLASH_MIN_MS = 1200;
const REQUEST_TIMEOUT_MS = 7000;

const Index = () => {
  const [data, setData] = useState<PriceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const splashStart = useRef(Date.now());

  const fetchMetalsPrices = useCallback(async () => {
    setIsLoading(true);

    const applyFallbackData = () => {
      setData((prev) => prev ?? mockPriceData);
    };

    const withTimeout = <T,>(promise: Promise<T>) =>
      Promise.race([
        promise,
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('REQUEST_TIMEOUT')), REQUEST_TIMEOUT_MS);
        }),
      ]);

    try {
      const { supabase } = await withTimeout(import('@/integrations/supabase/client'));
      const { data: result, error } = await withTimeout(
        supabase.functions.invoke('fetch-metals-price')
      );

      if (error || !result?.success) {
        console.error('Price fetch error:', error ?? result);
        console.warn('시세 연결 지연, 기본 데이터 사용');
        applyFallbackData();
        return;
      }

      const { gold, silver, copper, usdkrw, collectedAt } = result;

      setData({
        collectedAt,
        gold: {
          baseDate: gold.baseDate,
          buy: gold.krwPerDon,
          sell: Math.round(gold.krwPerDon * 0.815),
          prevBuy: gold.prevKrwPerDon ?? gold.krwPerDon,
          source: gold.source,
        },
        silver: {
          baseDate: silver.baseDate,
          buy: silver.krwPerDon,
          sell: Math.round(silver.krwPerDon * 0.66),
          prevBuy: silver.prevKrwPerDon ?? silver.krwPerDon,
          source: silver.source,
        },
        copper: {
          baseDate: copper.baseDate,
          tonUsd: copper.usdPerTon,
          prevTonUsd: copper.prevUsdPerTon ?? copper.usdPerTon,
          usdkrw: usdkrw,
          source: copper.source,
        },
      });
    } catch (err) {
      console.error('Failed to fetch metals prices:', err);
      console.warn('시세 로드 실패, 기본 데이터 사용');
      applyFallbackData();
    } finally {
      setIsLoading(false);
      const elapsed = Date.now() - splashStart.current;
      const remaining = Math.max(0, SPLASH_MIN_MS - elapsed);
      setTimeout(() => setShowSplash(false), remaining);
    }
  }, []);
  useEffect(() => {
    fetchMetalsPrices();
  }, [fetchMetalsPrices]);

  const handleRefresh = () => {
    fetchMetalsPrices();
  };

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
        <SummaryBox data={data} />

        <GoldCard data={data.gold} />
        <SilverCard data={data.silver} />
        <AdBanner slot="between-price-cards" size="medium" />
        <CopperCard data={data.copper} />

        <AdBanner slot="before-calculators" size="large" />

        <GoldCalculator goldData={data.gold} />
        <GoldSavingSimulator goldData={data.gold} />

        <AdBanner slot="between-calculators" size="medium" />

        <SilverInvestmentCalculator silverData={data.silver} />
      </div>

      <div className="mt-6">
        <AdBanner slot="footer" size="small" />
      </div>

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
