import { DON_TO_GRAM } from './unitConverter';

export function calcGoldPrice(
  weightG: number,
  pricePerDon: number
): number {
  return (weightG / DON_TO_GRAM) * pricePerDon;
}

export function calcCopperKgUsd(tonUsd: number): number {
  return tonUsd / 1000;
}

export function calcCopperKgKrw(tonUsd: number, usdkrw: number): number {
  return (tonUsd / 1000) * usdkrw;
}

export function calcSavingSimulation(
  monthlyAmount: number,
  months: number,
  buyPricePerDon: number
) {
  const monthlyDon = monthlyAmount / buyPricePerDon;
  const totalDon = monthlyDon * months;
  const totalGram = totalDon * DON_TO_GRAM;
  const totalInvestment = monthlyAmount * months;
  const currentValue = totalDon * buyPricePerDon;
  const profitLoss = currentValue - totalInvestment;
  const returnRate = totalInvestment > 0 ? (profitLoss / totalInvestment) * 100 : 0;

  return {
    monthlyDon,
    totalDon,
    totalGram,
    totalInvestment,
    currentValue,
    profitLoss,
    returnRate,
  };
}

export function calcSilverByWeight(
  weightG: number,
  pricePerDon: number
): number {
  return (weightG / DON_TO_GRAM) * pricePerDon;
}

export function calcSilverByAmount(
  amount: number,
  pricePerDon: number
) {
  const don = amount / pricePerDon;
  const gram = don * DON_TO_GRAM;
  return { don, gram };
}
