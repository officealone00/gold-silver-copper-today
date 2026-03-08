import { useState } from 'react';
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

const Index = () => {
  const [data] = useState<PriceData>(mockPriceData);

  const handleRefresh = () => {
    // In production, fetch fresh data here
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
          출처: 한국금거래소 · LME · 환율 API
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
