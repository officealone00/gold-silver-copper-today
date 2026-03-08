import { useState } from 'react';
import { formatNumber, formatPercent } from '@/utils/formatNumber';
import { calcSavingSimulation } from '@/utils/priceCalculator';
import type { PriceData } from '@/services/mockData';

interface GoldSavingSimulatorProps {
  goldData: PriceData['gold'];
}

const GoldSavingSimulator = ({ goldData }: GoldSavingSimulatorProps) => {
  const [monthlyAmount, setMonthlyAmount] = useState<string>('');
  const [months, setMonths] = useState<number>(12);

  const amountQuick = [100000, 300000, 500000, 1000000];
  const monthQuick = [6, 12, 24, 36];

  const monthly = parseInt(monthlyAmount) || 0;
  const result = monthly > 0
    ? calcSavingSimulation(monthly, months, goldData.buy)
    : null;

  return (
    <div className="mx-5 price-card">
      <h2 className="text-base font-bold mb-4">📊 금 적립 시뮬레이션</h2>

      {/* Monthly amount */}
      <label className="text-sm text-muted-foreground mb-1 block">월 적립 금액</label>
      <input
        type="number"
        inputMode="numeric"
        value={monthlyAmount}
        onChange={(e) => setMonthlyAmount(e.target.value)}
        placeholder="금액 입력 (원)"
        className="w-full px-4 py-3 rounded-xl bg-muted text-foreground text-base outline-none focus:ring-2 focus:ring-primary mb-2"
      />
      <div className="flex gap-2 mb-4">
        {amountQuick.map((a) => (
          <button
            key={a}
            onClick={() => setMonthlyAmount(String(a))}
            className={`quick-btn flex-1 text-xs ${String(a) === monthlyAmount ? 'quick-btn-active' : 'quick-btn-inactive'}`}
          >
            {a >= 10000 ? `${a / 10000}만` : formatNumber(a)}
          </button>
        ))}
      </div>

      {/* Months */}
      <label className="text-sm text-muted-foreground mb-1 block">적립 기간</label>
      <div className="flex gap-2 mb-4">
        {monthQuick.map((m) => (
          <button
            key={m}
            onClick={() => setMonths(m)}
            className={`quick-btn flex-1 ${months === m ? 'quick-btn-active' : 'quick-btn-inactive'}`}
          >
            {m}개월
          </button>
        ))}
      </div>

      {/* Result */}
      {result && (
        <div className="bg-muted rounded-xl p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">월 구매량</span>
            <span>{result.monthlyDon.toFixed(3)}돈</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">총 돈 수량</span>
            <span>{result.totalDon.toFixed(3)}돈</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">총 g</span>
            <span>{result.totalGram.toFixed(2)}g</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">총 투자금</span>
            <span>{formatNumber(result.totalInvestment)}원</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">평가 금액</span>
            <span>{formatNumber(Math.round(result.currentValue))}원</span>
          </div>
          <div className="border-t pt-2 flex justify-between">
            <span className="text-sm font-semibold">손익</span>
            <span className={`text-base font-bold ${result.profitLoss >= 0 ? 'text-rise' : 'text-fall'}`}>
              {result.profitLoss >= 0 ? '+' : ''}{formatNumber(Math.round(result.profitLoss))}원
              ({formatPercent(result.returnRate)})
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoldSavingSimulator;
