import { formatNumber } from '@/utils/formatNumber';
import { calcCopperKgUsd, calcCopperKgKrw } from '@/utils/priceCalculator';
import { getChangePercent } from '@/services/mockData';
import type { PriceData } from '@/services/mockData';

interface CopperCardProps {
  data: PriceData['copper'];
}

const CopperCard = ({ data }: CopperCardProps) => {
  const kgUsd = calcCopperKgUsd(data.tonUsd);
  const kgKrw = calcCopperKgKrw(data.tonUsd, data.usdkrw);
  const changePct = getChangePercent(data.tonUsd, data.prevTonUsd);
  const isUp = changePct > 0;
  const colorClass = isUp ? 'text-rise' : changePct < 0 ? 'text-fall' : 'text-neutral';

  return (
    <div className="mx-5 price-card">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-full bg-copper-bg flex items-center justify-center">
          <span className="text-lg">🥉</span>
        </div>
        <div>
          <h2 className="text-base font-bold">오늘 동 시세</h2>
          <p className="text-xs text-muted-foreground">{data.source} · 런던금속거래소</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">톤당 가격</span>
          <span className="text-lg font-bold">{formatNumber(data.tonUsd)} USD/ton</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">1kg 가격</span>
          <span className="text-base font-medium">{kgUsd.toFixed(3)} USD</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">1kg 원화</span>
          <span className="text-base font-medium">{formatNumber(Math.round(kgKrw))}원</span>
        </div>
        <div className="border-t pt-2 flex justify-between items-center">
          <span className="text-sm text-muted-foreground">전일 대비</span>
          <span className={`text-sm font-semibold ${colorClass}`}>
            {changePct > 0 ? '▲' : changePct < 0 ? '▼' : ''} {Math.abs(changePct).toFixed(1)}%
          </span>
        </div>
      </div>

      <div className="mt-3 text-[11px] text-muted-foreground">
        기준일 {data.baseDate.replace(/-/g, '.')} · 환율 {formatNumber(data.usdkrw)}원/USD
      </div>
    </div>
  );
};

export default CopperCard;
