// scraper/scrape.js (ESM)
// GitHub Actions에서 매일 1회 실행. 한국금거래소 + Yahoo HG=F + 네이버 환율 fetch.
// 결과: data/prices.json 생성

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UA_DESKTOP =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120.0 Safari/537.36';
const UA_MOBILE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) ' +
  'AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

const LB_PER_TON = 2204.62;

// ───── 1) 한국금거래소 /api/main → 금/은 (원/돈) ─────
async function fetchKoreaGoldX() {
  const res = await fetch('https://m.koreagoldx.co.kr/api/main', {
    method: 'POST',
    headers: {
      'User-Agent': UA_MOBILE,
      'Accept': 'application/json, text/javascript, */*; q=0.01',
      'Accept-Language': 'ko-KR,ko;q=0.9',
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-Requested-With': 'XMLHttpRequest',
      'Referer': 'https://m.koreagoldx.co.kr/',
      'Origin': 'https://m.koreagoldx.co.kr',
    },
    body: '',
  });
  if (!res.ok) throw new Error(`koreagoldx HTTP ${res.status}`);

  const json = await res.json();
  const p = json.officialPrice4;
  if (!p || !p.s_pure) throw new Error('officialPrice4 missing');

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

// ───── 2) Yahoo Finance HG=F → 구리 USD/lb → USD/ton ─────
async function fetchYahooCopper() {
  const url =
    'https://query1.finance.yahoo.com/v8/finance/chart/HG=F?interval=1d&range=5d';
  const res = await fetch(url, { headers: { 'User-Agent': UA_DESKTOP } });
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

// ───── 3) 네이버 환율 (EUC-KR) → USD/KRW. 실패시 Yahoo KRW=X ─────
async function fetchNaverFx() {
  const res = await fetch('https://finance.naver.com/marketindex/exchangeList.naver', {
    headers: {
      'User-Agent': UA_DESKTOP,
      'Accept': 'text/html,*/*;q=0.8',
      'Accept-Language': 'ko-KR,ko;q=0.9',
      'Referer': 'https://finance.naver.com/',
    },
  });
  if (!res.ok) throw new Error(`naver fx HTTP ${res.status}`);
  const buf = await res.arrayBuffer();
  const html = new TextDecoder('euc-kr').decode(buf);
  const m = html.match(/미국\s*USD[\s\S]*?<td\s+class="sale">\s*([\d,.]+)\s*<\/td>/);
  if (!m) throw new Error('naver fx parse failed');
  const v = Number(m[1].replace(/,/g, ''));
  if (!Number.isFinite(v) || v < 500 || v > 5000) throw new Error(`naver fx invalid: ${v}`);
  return v;
}

async function fetchYahooFx() {
  const url =
    'https://query1.finance.yahoo.com/v8/finance/chart/KRW=X?interval=1d&range=2d';
  const res = await fetch(url, { headers: { 'User-Agent': UA_DESKTOP } });
  const json = await res.json();
  const v = Number(json?.chart?.result?.[0]?.meta?.regularMarketPrice);
  if (!Number.isFinite(v) || v < 500 || v > 5000) throw new Error('yahoo fx invalid');
  return v;
}

// ───── main ─────
console.log('▶ scrape start:', new Date().toISOString());

const outPath = path.join(__dirname, '..', 'data', 'prices.json');
let prev = null;
try {
  if (fs.existsSync(outPath)) {
    prev = JSON.parse(fs.readFileSync(outPath, 'utf8'));
    console.log('  prev base_date:', prev?.collectedAt);
  }
} catch (_) {}

const [gxRes, cuRes, fxRes] = await Promise.allSettled([
  fetchKoreaGoldX(),
  fetchYahooCopper(),
  fetchNaverFx().catch(() => fetchYahooFx()),
]);

console.log('  gold/silver:', gxRes.status, gxRes.status === 'rejected' ? gxRes.reason?.message : 'OK');
console.log('  copper:', cuRes.status, cuRes.status === 'rejected' ? cuRes.reason?.message : 'OK');
console.log('  fx:', fxRes.status, fxRes.status === 'rejected' ? fxRes.reason?.message : 'OK');

const today = new Date().toISOString().split('T')[0];
const usdkrw = fxRes.status === 'fulfilled' ? fxRes.value : prev?.usdkrw;
if (!usdkrw) {
  console.error('FATAL: usdkrw unavailable and no prev cache');
  process.exit(1);
}

const out = {
  success: true,
  collectedAt: new Date().toISOString(),
  usdkrw,
  source: '한국금거래소 + Yahoo Finance',

  gold:
    gxRes.status === 'fulfilled'
      ? {
          baseDate: today,
          krwPerDon: gxRes.value.goldBuy,
          krwPerDonSell: gxRes.value.goldSell,
          prevKrwPerDon: gxRes.value.goldPrevBuy,
          source: '한국금거래소',
        }
      : prev?.gold || {
          baseDate: today, krwPerDon: 0, krwPerDonSell: 0, prevKrwPerDon: 0, source: '한국금거래소',
        },

  silver:
    gxRes.status === 'fulfilled'
      ? {
          baseDate: today,
          krwPerDon: gxRes.value.silverBuy,
          krwPerDonSell: gxRes.value.silverSell,
          prevKrwPerDon: gxRes.value.silverPrevBuy,
          source: '한국금거래소',
        }
      : prev?.silver || {
          baseDate: today, krwPerDon: 0, krwPerDonSell: 0, prevKrwPerDon: 0, source: '한국금거래소',
        },

  copper:
    cuRes.status === 'fulfilled'
      ? {
          baseDate: today,
          usdPerTon: cuRes.value.usdPerTon,
          prevUsdPerTon: cuRes.value.prevUsdPerTon,
          source: 'COMEX HG=F',
        }
      : prev?.copper || {
          baseDate: today, usdPerTon: 0, prevUsdPerTon: 0, source: 'COMEX HG=F',
        },
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');

console.log('✓ wrote', outPath);
console.log(JSON.stringify(out, null, 2));
