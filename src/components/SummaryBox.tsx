import { getChangePercent } from '@/services/mockData';
import type { PriceData } from '@/services/mockData';

interface SummaryBoxProps {
  data: PriceData;
}

const SummaryBox = ({ data }: SummaryBoxProps) => {
  const items = [
    {
      label: '동',
      change: getChangePercent(data.copper.tonUsd, data.copper.prevTonUsd),
    },
    {
      label: '은',
      change: getChangePercent(data.silver.buy, data.silver.prevBuy),
    },
    {
      label: '금',
      change: getChangePercent(data.gold.buy, data.gold.prevBuy),
    },
  ];

  return (
    <div className="mx-5 price-card">
      <h2 className="text-sm font-semibold text-muted-foreground mb-3">오늘 시세 요약</h2>
      <div className="flex gap-4">
        {items.map((item) => {
          const isUp = item.change > 0;
          const isDown = item.change < 0;
          const arrow = isUp ? '▲' : isDown ? '▼' : '─';
          const colorClass = isUp ? 'text-rise' : isDown ? 'text-fall' : 'text-neutral';

          return (
            <div key={item.label} className="flex-1 text-center">
              <div className="text-xs text-muted-foreground mb-1">{item.label}</div>
              <div className={`text-base font-bold ${colorClass}`}>
                {arrow} {Math.abs(item.change).toFixed(1)}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SummaryBox;
