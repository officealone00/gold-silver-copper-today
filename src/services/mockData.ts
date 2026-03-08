export interface PriceData {
  collectedAt: string;
  gold: {
    baseDate: string;
    buy: number;
    sell: number;
    prevBuy: number;
    source: string;
  };
  silver: {
    baseDate: string;
    buy: number;
    sell: number;
    prevBuy: number;
    source: string;
  };
  copper: {
    baseDate: string;
    tonUsd: number;
    prevTonUsd: number;
    usdkrw: number;
    source: string;
  };
}

export const mockPriceData: PriceData = {
  collectedAt: "2026-03-09T06:00:00+09:00",
  gold: {
    baseDate: "2026-03-09",
    buy: 1080000,
    sell: 881000,
    prevBuy: 1060000,
    source: "한국금거래소",
  },
  silver: {
    baseDate: "2026-03-09",
    buy: 21310,
    sell: 14060,
    prevBuy: 21180,
    source: "한국금거래소",
  },
  copper: {
    baseDate: "2026-03-08",
    tonUsd: 12808,
    prevTonUsd: 12834,
    usdkrw: 1340,
    source: "LME",
  },
};

export function getChangePercent(current: number, prev: number): number {
  if (prev === 0) return 0;
  return ((current - prev) / prev) * 100;
}

export function getChangeAmount(current: number, prev: number): number {
  return current - prev;
}
