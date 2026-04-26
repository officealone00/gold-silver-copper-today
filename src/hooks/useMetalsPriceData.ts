// src/hooks/useMetalsPriceData.ts
// v3 final: GitHub Pages JSON 직접 fetch (Supabase Edge Function 폐기)
import { useState, useCallback, useRef } from 'react';
import { mockPriceData } from '@/services/mockData';
import type { PriceData } from '@/services/mockData';

const REQUEST_TIMEOUT_MS = 7000;

// GitHub Actions가 매일 갱신하는 prices.json
// (만약 GitHub Pages 사용자명/레포명 다르면 여기 URL 수정)
const PRICES_URL =
  'https://officealone00.github.io/gold-silver-copper-today/data/prices.json';

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
      // 캐시 우회 위해 타임스탬프 쿼리 추가 (CDN 캐시 방지)
      const url = `${PRICES_URL}?t=${Date.now()}`;
      const res = await withTimeout(
        fetch(url, { cache: 'no-store' }) as Promise<Response>,
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result = await res.json();

      if (!result?.success) {
        console.warn('[useMetalsPriceData] success=false, fallback');
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
          buy: gold.krwPerDon,
          sell: safe(gold.krwPerDonSell, Math.round(gold.krwPerDon * 0.815)),
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
