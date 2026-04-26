// scraper/probe.js
// GitHub Actions runner에서 어떤 한국 금시세 소스가 통과하는지 정찰
// 결과는 워크플로 로그에서 확인

const UA_DESKTOP =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120.0 Safari/537.36';
const UA_MOBILE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) ' +
  'AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

const targets = [
  // 한국금거래소 본사 (모바일/PC)
  { name: 'koreagoldx-mobile', url: 'https://m.koreagoldx.co.kr/api/main', method: 'POST' },
  { name: 'koreagoldx-pc',     url: 'https://www.koreagoldx.co.kr/api/main', method: 'POST' },

  // 한국금거래소 지점 (각 지점이 별도 도메인 + 별도 호스팅 가능성)
  { name: 'jongro',   url: 'https://jongro.koreagoldx.co.kr/api/main', method: 'POST' },
  { name: 'songpa',   url: 'https://songpa.koreagoldx.co.kr/api/main', method: 'POST' },
  { name: 'gold-dj',  url: 'https://gold-dj.koreagoldx.co.kr/api/main', method: 'POST' },
  { name: 'cheongna', url: 'https://cheongna.koreagoldx.co.kr/api/main', method: 'POST' },

  // 사업자 사이트 (다른 도메인)
  { name: 'exgold', url: 'https://www.exgold.co.kr/', method: 'GET' },

  // 다른 회사 (한국표준금거래소, 순금나라, 한국금은)
  { name: 'goldgold',     url: 'https://goldgold.co.kr/', method: 'GET' },
  { name: 'soongumnara',  url: 'https://www.soongumnara.co.kr/', method: 'GET' },
  { name: 'hkgold',       url: 'http://www.hkgold.co.kr/', method: 'GET' },

  // KB국민은행 금시세 페이지
  { name: 'kbstar', url: 'https://obank.kbstar.com/quics?page=C023489', method: 'GET' },

  // 네이버 금융 — 금 일별시세 (CMDT_GC: 국제금)
  { name: 'naver-CMDT_GC', url: 'https://finance.naver.com/marketindex/worldDailyQuote.naver?marketindexCd=CMDT_GC', method: 'GET' },
];

async function probe(t) {
  const start = Date.now();
  const headers = t.method === 'POST'
    ? {
        'User-Agent': UA_MOBILE,
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Accept-Language': 'ko-KR,ko;q=0.9',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': new URL(t.url).origin + '/',
        'Origin': new URL(t.url).origin,
      }
    : {
        'User-Agent': UA_DESKTOP,
        'Accept': 'text/html,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9',
      };
  try {
    const res = await fetch(t.url, {
      method: t.method,
      headers,
      body: t.method === 'POST' ? '' : undefined,
    });
    const ms = Date.now() - start;
    const ct = res.headers.get('content-type') || '';
    let bodyHint = '';
    if (res.ok) {
      const buf = await res.arrayBuffer();
      let text;
      try { text = new TextDecoder('utf-8', { fatal: true }).decode(buf); }
      catch { text = new TextDecoder('euc-kr').decode(buf); }

      // 핵심 단서 추출
      if (ct.includes('json')) {
        try {
          const j = JSON.parse(text);
          if (j.officialPrice4) {
            const p = j.officialPrice4;
            bodyHint = `JSON: s_pure=${p.s_pure} p_pure=${p.p_pure} s_silver=${p.s_silver}`;
          } else {
            bodyHint = `JSON keys: ${Object.keys(j).slice(0, 8).join(',')}`;
          }
        } catch (_) {
          bodyHint = `non-json text (${text.length} chars)`;
        }
      } else {
        // HTML에서 가격 단서 찾기
        const goldMatch = text.match(/순금[^<]{0,200}/);
        const wonMatch = text.match(/[\d,]{6,}\s*원/);
        bodyHint = `HTML(${text.length} chars), 순금 단서: ${goldMatch?.[0]?.substring(0, 80) || '없음'}, 원: ${wonMatch?.[0] || '없음'}`;
      }
    }
    console.log(`[${res.status}] ${ms}ms  ${t.name.padEnd(20)} ${bodyHint}`);
  } catch (e) {
    console.log(`[ERR]      ${t.name.padEnd(20)} ${e.message}`);
  }
}

console.log('▶ probe start:', new Date().toISOString());
for (const t of targets) {
  await probe(t);
  await new Promise((r) => setTimeout(r, 500));
}
console.log('▶ probe end');
