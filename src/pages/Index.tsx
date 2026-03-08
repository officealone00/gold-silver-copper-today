import { useState, useEffect, useCallback } from 'react';
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
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const Index = () => {
  const [data, setData] = useState<PriceData>(mockPriceData);
  const [isLoading, setIsLoading] = useState(false);

  const fetchGoldPrice = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('fetch-gold-price');

      if (error) {
        console.error('Edge function error:', error);
        toast.error('금 시세를 불러오지 못했습니다. 기본 데이터를 표시합니다.');
        return;
      }

      if (result?.success && result.gold) {
        const gold = result.gold;
        const prevBuy = Math.round(gold.pricePerDon - gold.changeAmountPerDon);

        setData(prev => ({
          ...prev,
          collectedAt: result.collectedAt,
          gold: {
            baseDate: gold.baseDate,
            buy: Math.round(gold.pricePerDon),
            sell: Math.round(gold.pricePerDon * 0.815), // 매도가 추정 (약 81.5%)
            prevBuy: prevBuy,
            source: gold.source,
          },
        }));
      }
    } catch (err) {
      console.error('Failed to fetch gold price:', err);
      toast.error('금 시세를 불러오지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGoldPrice();
  }, [fetchGoldPrice]);

  const handleRefresh = () => {
    fetchGoldPrice();
  };

  return (
    <div className="min-h-screen bg-background pb-10 max-w-lg mx-auto">
      <Header collectedAt={data.collectedAt} onRefresh={handleRefresh} />

      <div className="space-y-4">
        <SummaryBox data={data} />

        {/* 시세 카드 사이 광고 */}
        <GoldCard data={data.gold} />
        <SilverCard data={data.silver} />
        <AdBanner slot="between-price-cards" size="medium" />
        <CopperCard data={data.copper} />

        {/* 계산기 섹션 전 광고 */}
        <AdBanner slot="before-calculators" size="large" />

        <GoldCalculator goldData={data.gold} />
        <GoldSavingSimulator goldData={data.gold} />

        {/* 계산기 사이 광고 */}
        <AdBanner slot="between-calculators" size="medium" />

        <SilverInvestmentCalculator silverData={data.silver} />
      </div>

      {/* 하단 광고 */}
      <div className="mt-6">
        <AdBanner slot="footer" size="small" />
      </div>

      {/* Footer */}
      <div className="mt-4 px-5 space-y-3">
        <p className="text-xs text-muted-foreground leading-relaxed">
          본 시세 정보는 참고용이며 실제 거래 가격과 차이가 있을 수 있습니다.
        </p>
        <p className="text-xs text-muted-foreground">
          출처: 네이버 금융(신한은행) · 한국금거래소 · LME
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
