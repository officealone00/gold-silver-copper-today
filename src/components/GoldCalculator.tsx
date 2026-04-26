import { useState, useEffect, useRef } from 'react';
import { formatNumber } from '@/utils/formatNumber';
import { calcGoldPrice } from '@/utils/priceCalculator';
import { DON_TO_GRAM } from '@/utils/unitConverter';
import type { PriceData } from '@/services/mockData';

interface GoldCalculatorProps {
  goldData: PriceData['gold'];
  onFirstCalc?: () => void;
}

const GoldCalculator = ({ goldData, onFirstCalc }: GoldCalculatorProps) => {
  const [weight, setWeight] = useState<string>('');
  const [unit, setUnit] = useState<'g' | 'don'>('don');
  const [priceType, setPriceType] = useState<'buy' | 'sell'>('buy');
  const firstCalcRef = useRef(false);

  const quickDon = [1, 3, 5, 10];
  const pricePerDon = priceType === 'buy' ? goldData.buy : goldData.sell;

  const weightNum = parseFloat(weight) || 0;
  const weightG = unit === 'don' ? weightNum * DON_TO_GRAM : weightNum;
  const weightDon = unit === 'don' ? weightNum : weightNum / DON_TO_GRAM;
  const totalPrice = calcGoldPrice(weightG, pricePerDon);

  useEffect(() => {
    if (weightNum > 0 && !firstCalcRef.current) {
      firstCalcRef.current = true;
      onFirstCalc?.();
    }
  }, [weightNum, onFirstCalc]);

  const handleQuick = (don: number) => {
    setUnit('don');
    setWeight(String(don));
  };

  return (
    <div className="mx-5 price-card">
      <h2 className="text-base font-bold mb-4">💰 금 계산기</h2>

      <div className="flex gap-2 mb-3">
        {(['don', 'g'] as const).map((u) => (
          <button
            key={u}
            onClick={() => setUnit(u)}
            className={`quick-btn ${unit === u ? 'quick-btn-active' : 'quick-btn-inactive'}`}
          >
            {u === 'don' ? '돈' : 'g'}
          </button>
        ))}
      </div>

      <div className="flex gap-2 mb-3">
        {(['buy', 'sell'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setPriceType(t)}
            className={`quick-btn ${priceType === t ? 'quick-btn-active' : 'quick-btn-inactive'}`}
          >
            {t === 'buy' ? '매수' : '매도'}
          </button>
        ))}
      </div>

      <input
        type="number"
        inputMode="decimal"
        value={weight}
        onChange={(e) => setWeight(e.target.value)}
        placeholder={`무게 입력 (${unit === 'don' ? '돈' : 'g'})`}
        className="w-full px-4 py-3 rounded-xl bg-muted text-foreground text-base outline-none focus:ring-2 focus:ring-primary mb-3"
      />

      <div className="flex gap-2 mb-4">
        {quickDon.map((d) => (
          <button
            key={d}
            onClick={() => handleQuick(d)}
            className="quick-btn quick-btn-inactive flex-1"
          >
            {d}돈
          </button>
        ))}
      </div>

      {weightNum > 0 && (
        <div className="bg-muted rounded-xl p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">입력</span>
            <span>{weight} {unit === 'don' ? '돈' : 'g'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">g 환산</span>
            <span>{weightG.toFixed(2)}g</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">돈 환산</span>
            <span>{weightDon.toFixed(2)}돈</span>
          </div>
          <div className="border-t pt-2 flex justify-between">
            <span className="text-sm font-semibold">총 금액</span>
            <span className="text-lg font-bold text-primary">{formatNumber(Math.round(totalPrice))}원</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoldCalculator;