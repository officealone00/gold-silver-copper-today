// src/hooks/useMetalsPriceData.ts
// v2 final: 한국금거래소 직접 시세 (krwPerDon=살때, krwPerDonSell=팔때)
import { useState, useCallback, useRef } from 'react';
import { mockPriceData } from '@/services/mockData';
import type { PriceData } from '@/services/mockData';

const REQUEST_TIMEOUT_MS = 7000;

function withTimeout<T>(promise: Promise<T>, ms = REQUEST_TIMEOUT_MS): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('REQUEST_TIMEOUT')), ms),
    ),
  ]);
}

export function useMetalsPriceData() {
  const [data, setData] = useState<PriceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [usedFallback, setUsedFallback] = useState(false);
  const fetchCount = useRef(0);

  const applyFallback = useCallback(() => {
    setData((prev) => prev ?? mockPriceData);
    setUsedFallback(true);
  }, []);

  const fetchPrices = useCallback(async () => {
    setIsLoading(true);
    fetchCount.current += 1;

    try {
      const { supabase } = await withTimeout(import('@/integrations/supabase/client'));
      const { data: result, error } = await withTimeout(
        supabase.functions.invoke('fetch-metals-price'),
      );

      if (error || !result?.success) {
        console.warn('[useMetalsPriceData] API error, using fallback');
        applyFallback();
        return;
      }

      const { gold, silver, copper, usdkrw, collectedAt } = result;
      const safe = (v: unknown, fb: number) =>
        typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : fb;

      setData({
        collectedAt,
        gold: {
          baseDate: gold.baseDate,
          buy: gold.krwPerDon,                                                 // 살 때 (한국금거래소 그대로)
          sell: safe(gold.krwPerDonSell, Math.round(gold.krwPerDon * 0.815)), // 팔 때
          prevBuy: safe(gold.prevKrwPerDon, mockPriceData.gold.prevBuy),
          source: gold.source,
        },
        silver: {
          baseDate: silver.baseDate,
          buy: silver.krwPerDon,
          sell: safe(silver.krwPerDonSell, Math.round(silver.krwPerDon * 0.66)),
          prevBuy: safe(silver.prevKrwPerDon, mockPriceData.silver.prevBuy),
          source: silver.source,
        },
        copper: {
          baseDate: copper.baseDate,
          tonUsd: copper.usdPerTon,
          prevTonUsd: safe(copper.prevUsdPerTon, mockPriceData.copper.prevTonUsd),
          usdkrw,
          source: copper.source,
        },
      });
      setUsedFallback(false);
    } catch (err) {
      console.error('[useMetalsPriceData] fetch error:', err);
      applyFallback();
    } finally {
      setIsLoading(false);
    }
  }, [applyFallback]);

  return { data, isLoading, usedFallback, fetchPrices };
}
