// supabase/functions/fetch-metals-price/index.ts
// v3 final: 한국금거래소 /api/main + Yahoo Finance HG=F + 네이버 환율
// API key 없음. cheerio 없음. 정규식 + JSON 파싱만 사용.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120.0 Safari/537.36';

const KOREA_GOLDX_MOBILE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 ' +
  '(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

const TIMEOUT_MS = 7000;

function withTimeout<T>(p: Promise<T>, ms = TIMEOUT_MS): Promise<T> {
  return Promise.race([
    p,
    new Promise<never>((_, rej) => setTimeout(() => rej(new Error('TIMEOUT')), ms)),
  ]);
}

// ───────────────────────────────────────────────
// 1) 한국금거래소 /api/main → 금/은 (원/돈, 살때/팔때)
// ───────────────────────────────────────────────
interface KoreaGoldX {
  date: string;
  goldBuy: number;
  goldSell: number;
  goldPrevBuy: number;
  silverBuy: number;
  silverSell: number;
  silverPrevBuy: number;
}

function extractCookieHeader(headers: Headers): string {
  const getSetCookie = (headers as Headers & { getSetCookie?: () => string[] }).getSetCookie;
  const setCookies = getSetCookie
    ? getSetCookie.call(headers)
    : (headers.get('set-cookie') || '')
        .split(/,(?=\s*[^;,=\s]+=[^;,]+)/)
        .map((cookie) => cookie.trim())
        .filter(Boolean);

  return setCookies
    .map((cookie) => cookie.split(';')[0]?.trim())
    .filter(Boolean)
    .join('; ');
}

async function fetchKoreaGoldX(): Promise<KoreaGoldX> {
  const mainRes = await fetch('https://m.koreagoldx.co.kr/', {
    method: 'GET',
    headers: {
      'User-Agent': KOREA_GOLDX_MOBILE_UA,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'ko-KR,ko;q=0.9',
    },
  });
  if (!mainRes.ok) throw new Error(`koreagoldx main HTTP ${mainRes.status}`);

  await mainRes.text();
  const cookieHeader = extractCookieHeader(mainRes.headers);

  const res = await fetch('https://m.koreagoldx.co.kr/api/main', {
    method: 'POST',
    headers: {
      'User-Agent': KOREA_GOLDX_MOBILE_UA,
      'Accept': 'application/json, text/javascript, */*; q=0.01',
      'Accept-Language': 'ko-KR,ko;q=0.9',
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-Requested-With': 'XMLHttpRequest',
      'Referer': 'https://m.koreagoldx.co.kr/',
      'Origin': 'https://m.koreagoldx.co.kr',
      'Sec-Fetch-Site': 'same-origin',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Dest': 'empty',
      'Cookie': cookieHeader,
    },
    body: '',
  });
  if (!res.ok) throw new Error(`koreagoldx HTTP ${res.status}`);

  const json = await res.json();
  const p = json.officialPrice4;
  if (!p || !p.s_pure) throw new Error('officialPrice4 missing or invalid');

  const goldBuy = Number(p.s_pure);
  const goldSell = Number(p.p_pure);
  const silverBuy = Number(p.s_silver);
  const silverSell = Number(p.p_silver);

  return {
    date: String(p.date || ''),
    goldBuy,
    goldSell,
    goldPrevBuy: goldBuy - Number(p.turm_s_pure || 0),
    silverBuy,
    silverSell,
    silverPrevBuy: silverBuy - Number(p.turm_s_silver || 0),
  };
}

// ───────────────────────────────────────────────
// 2) Yahoo Finance HG=F → 구리 (USD/lb → USD/ton)
// ───────────────────────────────────────────────
const LB_PER_TON = 2204.62; // 1 metric ton = 2204.62 lb

async function fetchYahooCopper(): Promise<{ usdPerTon: number; prevUsdPerTon: number }> {
  const url =
    'https://query1.finance.yahoo.com/v8/finance/chart/HG=F?interval=1d&range=5d';
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`yahoo HG=F HTTP ${res.status}`);
  const json = await res.json();
  const meta = json?.chart?.result?.[0]?.meta;
  if (!meta?.regularMarketPrice) throw new Error('yahoo HG=F no meta');

  const usdPerLb = Number(meta.regularMarketPrice);
  const prevUsdPerLb = Number(meta.chartPreviousClose ?? usdPerLb);

  return {
    usdPerTon: Math.round(usdPerLb * LB_PER_TON),
    prevUsdPerTon: Math.round(prevUsdPerLb * LB_PER_TON),
  };
}

// ───────────────────────────────────────────────
// 3) 네이버 환율 (EUC-KR) → USD/KRW. 실패시 Yahoo KRW=X
// ───────────────────────────────────────────────
async function fetchNaverFx(): Promise<number> {
  const res = await fetch('https://finance.naver.com/marketindex/exchangeList.naver', {
    headers: {
      'User-Agent': UA,
      'Accept': 'text/html,*/*;q=0.8',
      'Accept-Language': 'ko-KR,ko;q=0.9',
      'Referer': 'https://finance.naver.com/',
    },
  });
  if (!res.ok) throw new Error(`naver fx HTTP ${res.status}`);
  const buf = await res.arrayBuffer();
  const html = new TextDecoder('euc-kr').decode(buf);
  // <td class="tit">..미국 USD..</td><td class="sale">1,477.50</td>
  const m = html.match(/미국\s*USD[\s\S]*?<td\s+class="sale">\s*([\d,.]+)\s*<\/td>/);
  if (!m) throw new Error('naver fx parse failed');
  const v = Number(m[1].replace(/,/g, ''));
  if (!Number.isFinite(v) || v < 500 || v > 5000) throw new Error(`naver fx invalid: ${v}`);
  return v;
}

async function fetchYahooFx(): Promise<number> {
  const url =
    'https://query1.finance.yahoo.com/v8/finance/chart/KRW=X?interval=1d&range=2d';
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  const json = await res.json();
  const v = Number(json?.chart?.result?.[0]?.meta?.regularMarketPrice);
  if (!Number.isFinite(v) || v < 500 || v > 5000) throw new Error('yahoo fx invalid');
  return v;
}

// ───────────────────────────────────────────────
// Main handler
// ───────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const today = new Date().toISOString().split('T')[0];

    // ── 캐시 hit 확인 ──
    const { data: todayPrices } = await supabase
      .from('metal_prices')
      .select('*')
      .eq('base_date', today);

    if (todayPrices && todayPrices.length >= 3) {
      const goldRow = todayPrices.find((r: any) => r.metal === 'gold');
      const silverRow = todayPrices.find((r: any) => r.metal === 'silver');
      const copperRow = todayPrices.find((r: any) => r.metal === 'copper');
      if (goldRow && silverRow && copperRow) {
        const { data: prevPrices } = await supabase
          .from('metal_prices')
          .select('*')
          .lt('base_date', today)
          .order('base_date', { ascending: false })
          .limit(3);
        const prevMap: Record<string, any> = {};
        for (const p of prevPrices || []) if (!prevMap[p.metal]) prevMap[p.metal] = p;

        return new Response(
          JSON.stringify({
            success: true,
            collectedAt: new Date().toISOString(),
            usdkrw: Number(goldRow.usdkrw),
            source: '한국금거래소 + Yahoo Finance',
            gold: {
              baseDate: today,
              krwPerDon: Number(goldRow.krw_per_don),
              krwPerDonSell: Number(goldRow.krw_per_don_sell ?? goldRow.krw_per_don),
              prevKrwPerDon: prevMap.gold ? Number(prevMap.gold.krw_per_don) : null,
              source: '한국금거래소',
            },
            silver: {
              baseDate: today,
              krwPerDon: Number(silverRow.krw_per_don),
              krwPerDonSell: Number(silverRow.krw_per_don_sell ?? silverRow.krw_per_don),
              prevKrwPerDon: prevMap.silver ? Number(prevMap.silver.krw_per_don) : null,
              source: '한국금거래소',
            },
            copper: {
              baseDate: today,
              usdPerTon: Number(copperRow.usd_per_ton),
              prevUsdPerTon: prevMap.copper ? Number(prevMap.copper.usd_per_ton) : null,
              source: 'COMEX HG=F',
            },
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    }

    // ── 캐시 miss → 외부 3개 병렬 호출 ──
    const [gxRes, cuRes, fxRes] = await Promise.allSettled([
      withTimeout(fetchKoreaGoldX()),
      withTimeout(fetchYahooCopper()),
      withTimeout(fetchNaverFx()).catch(() => withTimeout(fetchYahooFx())),
    ]);

    if (gxRes.status !== 'fulfilled') {
      throw new Error(
        `한국금거래소 실패: ${gxRes.reason instanceof Error ? gxRes.reason.message : gxRes.reason}`,
      );
    }
    if (cuRes.status !== 'fulfilled') {
      throw new Error(
        `구리 실패: ${cuRes.reason instanceof Error ? cuRes.reason.message : cuRes.reason}`,
      );
    }
    if (fxRes.status !== 'fulfilled') {
      throw new Error(
        `환율 실패: ${fxRes.reason instanceof Error ? fxRes.reason.message : fxRes.reason}`,
      );
    }

    const gx = gxRes.value;
    const cu = cuRes.value;
    const usdkrw = fxRes.value;

    // ── DB upsert ──
    const metals = [
      {
        base_date: today,
        metal: 'gold',
        usd_per_toz: 0,
        krw_per_gram: Math.round(gx.goldBuy / 3.75),
        krw_per_don: gx.goldBuy,
        krw_per_don_sell: gx.goldSell,
        usd_per_ton: 0,
        usdkrw,
        source: '한국금거래소',
      },
      {
        base_date: today,
        metal: 'silver',
        usd_per_toz: 0,
        krw_per_gram: Math.round(gx.silverBuy / 3.75),
        krw_per_don: gx.silverBuy,
        krw_per_don_sell: gx.silverSell,
        usd_per_ton: 0,
        usdkrw,
        source: '한국금거래소',
      },
      {
        base_date: today,
        metal: 'copper',
        usd_per_toz: 0,
        krw_per_gram: 0,
        krw_per_don: 0,
        krw_per_don_sell: 0,
        usd_per_ton: cu.usdPerTon,
        usdkrw,
        source: 'COMEX HG=F',
      },
    ];

    const { error: upsertError } = await supabase
      .from('metal_prices')
      .upsert(metals, { onConflict: 'base_date,metal' });
    if (upsertError) console.error('DB upsert error:', upsertError);

    return new Response(
      JSON.stringify({
        success: true,
        collectedAt: new Date().toISOString(),
        usdkrw,
        source: '한국금거래소 + Yahoo Finance',
        gold: {
          baseDate: today,
          krwPerDon: gx.goldBuy,            // 살 때
          krwPerDonSell: gx.goldSell,       // 팔 때
          prevKrwPerDon: gx.goldPrevBuy,    // 한국금거래소 turm_s_pure 활용
          source: '한국금거래소',
        },
        silver: {
          baseDate: today,
          krwPerDon: gx.silverBuy,
          krwPerDonSell: gx.silverSell,
          prevKrwPerDon: gx.silverPrevBuy,
          source: '한국금거래소',
        },
        copper: {
          baseDate: today,
          usdPerTon: cu.usdPerTon,
          prevUsdPerTon: cu.prevUsdPerTon,
          source: 'COMEX HG=F',
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[fetch-metals-price] error:', errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
