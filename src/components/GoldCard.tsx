import { formatNumber, formatPercent } from '@/utils/formatNumber';
import { getChangePercent, getChangeAmount } from '@/services/mockData';
import type { PriceData } from '@/services/mockData';

interface GoldCardProps {
  data: PriceData['gold'];
}

const GoldCard = ({ data }: GoldCardProps) => {
  const changeAmt = getChangeAmount(data.buy, data.prevBuy);
  const changePct = getChangePercent(data.buy, data.prevBuy);
  const isUp = changeAmt > 0;
  const colorClass = isUp ? 'text-rise' : changeAmt < 0 ? 'text-fall' : 'text-neutral';
  const arrow = isUp ? '▲' : changeAmt < 0 ? '▼' : '';

  return (
    <div className="mx-5 price-card">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-full bg-gold-bg flex items-center justify-center">
          <span className="text-lg">🥇</span>
        </div>
        <div>
          <h2 className="text-base font-bold">오늘 금 시세</h2>
          <p className="text-xs text-muted-foreground">{data.source} 기준</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">한돈 매수</span>
          <span className="text-lg font-bold">{formatNumber(data.buy)}원</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">한돈 매도</span>
          <span className="text-base font-medium text-muted-foreground">{formatNumber(data.sell)}원</span>
        </div>
        <div className="border-t pt-2 flex justify-between items-center">
          <span className="text-sm text-muted-foreground">전일 대비</span>
          <span className={`text-sm font-semibold ${colorClass}`}>
            {arrow} {formatNumber(Math.abs(changeAmt))}원 ({formatPercent(changePct)})
          </span>
        </div>
      </div>

      <div className="mt-3 text-[11px] text-muted-foreground">
        기준일 {data.baseDate.replace(/-/g, '.')}
      </div>
    </div>
  );
};

export default GoldCard;
