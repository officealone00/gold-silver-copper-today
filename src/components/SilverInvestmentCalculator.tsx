import { useState, useEffect, useRef } from 'react';
import { formatNumber } from '@/utils/formatNumber';
import { calcSilverByWeight, calcSilverByAmount } from '@/utils/priceCalculator';
import { DON_TO_GRAM } from '@/utils/unitConverter';
import type { PriceData } from '@/services/mockData';

interface SilverInvestmentCalculatorProps {
  silverData: PriceData['silver'];
  onFirstCalc?: () => void;
}

const SilverInvestmentCalculator = ({ silverData, onFirstCalc }: SilverInvestmentCalculatorProps) => {
  const [mode, setMode] = useState<'weight' | 'amount'>('weight');
  const [input, setInput] = useState('');
  const [unit, setUnit] = useState<'g' | 'don'>('don');
  const firstCalcRef = useRef(false);

  const inputNum = parseFloat(input) || 0;

  useEffect(() => {
    if (inputNum > 0 && !firstCalcRef.current) {
      firstCalcRef.current = true;
      onFirstCalc?.();
    }
  }, [inputNum, onFirstCalc]);

  const renderWeightResult = () => {
    if (inputNum <= 0) return null;
    const weightG = unit === 'don' ? inputNum * DON_TO_GRAM : inputNum;
    const total = calcSilverByWeight(weightG, silverData.buy);
    return (
      <div className="bg-muted rounded-xl p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">입력</span>
          <span>{input} {unit === 'don' ? '돈' : 'g'}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">g 환산</span>
          <span>{weightG.toFixed(2)}g</span>
        </div>
        <div className="border-t pt-2 flex justify-between">
          <span className="text-sm font-semibold">총 금액</span>
          <span className="text-lg font-bold text-primary">{formatNumber(Math.round(total))}원</span>
        </div>
      </div>
    );
  };

  const renderAmountResult = () => {
    if (inputNum <= 0) return null;
    const { don, gram } = calcSilverByAmount(inputNum, silverData.buy);
    return (
      <div className="bg-muted rounded-xl p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">투자 금액</span>
          <span>{formatNumber(inputNum)}원</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">구매 가능 돈</span>
          <span>{don.toFixed(3)}돈</span>
        </div>
        <div className="border-t pt-2 flex justify-between">
          <span className="text-sm font-semibold">구매 가능 g</span>
          <span className="text-lg font-bold text-primary">{gram.toFixed(2)}g</span>
        </div>
      </div>
    );
  };

  return (
    <div className="mx-5 price-card">
      <h2 className="text-base font-bold mb-4">🪙 은 투자 계산기</h2>

      <div className="flex gap-2 mb-3">
        <button
          onClick={() => { setMode('weight'); setInput(''); }}
          className={`quick-btn flex-1 ${mode === 'weight' ? 'quick-btn-active' : 'quick-btn-inactive'}`}
        >
          수량 → 금액
        </button>
        <button
          onClick={() => { setMode('amount'); setInput(''); }}
          className={`quick-btn flex-1 ${mode === 'amount' ? 'quick-btn-active' : 'quick-btn-inactive'}`}
        >
          금액 → 수량
        </button>
      </div>

      {mode === 'weight' && (
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
      )}

      <input
        type="number"
        inputMode="decimal"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={mode === 'weight' ? `수량 입력 (${unit === 'don' ? '돈' : 'g'})` : '투자 금액 입력 (원)'}
        className="w-full px-4 py-3 rounded-xl bg-muted text-foreground text-base outline-none focus:ring-2 focus:ring-primary mb-3"
      />

      {mode === 'weight' ? renderWeightResult() : renderAmountResult()}
    </div>
  );
};

export default SilverInvestmentCalculator;