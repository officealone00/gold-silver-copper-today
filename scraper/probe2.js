// scraper/probe2.js
// v2: 통과한 사이트 (exgold, soongumnara) 깊이 분석

const UA_DESKTOP =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120.0 Safari/537.36';
const UA_MOBILE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) ' +
  'AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

async function fetchHtml(url, headers = {}) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA_DESKTOP, 'Accept-Language': 'ko-KR,ko;q=0.9', ...headers },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = await res.arrayBuffer();
  let html;
  try { html = new TextDecoder('utf-8', { fatal: true }).decode(buf); }
  catch { html = new TextDecoder('euc-kr').decode(buf); }
  return html;
}

async function probeJsonEndpoint(url, origin) {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'User-Agent': UA_MOBILE,
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Accept-Language': 'ko-KR,ko;q=0.9',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': origin + '/',
        'Origin': origin,
      },
      body: '',
    });
    const text = await res.text();
    return { status: res.status, ct: res.headers.get('content-type'), bodyHead: text.substring(0, 500) };
  } catch (e) {
    return { error: e.message };
  }
}

// ─────────────────────────────────────────────
console.log('═══════════════════════════════════════════════');
console.log('▶ 1. exgold (한국금거래소 사업자 사이트) 분석');
console.log('═══════════════════════════════════════════════');

const exHtml = await fetchHtml('https://www.exgold.co.kr/');
console.log('length:', exHtml.length);

// 순금시세 주변 영역
const goldMatch = exHtml.match(/순금시세[\s\S]{0,800}/);
if (goldMatch) {
  console.log('\n[순금시세 주변 800자]:');
  console.log(goldMatch[0].replace(/\s+/g, ' '));
}

// JavaScript ajax 호출 추적
console.log('\n[ajax 호출 패턴]:');
const ajaxMatches = [...exHtml.matchAll(/\$\.(?:ajax|get|post)\([\s\S]{0,400}/g)].slice(0, 5);
ajaxMatches.forEach((m, i) => {
  console.log(`  #${i}: ${m[0].replace(/\s+/g, ' ').substring(0, 350)}`);
});

// /api/ 같은 endpoint URL
console.log('\n[/api/ URL 후보]:');
const apiUrls = [...exHtml.matchAll(/['"]([\/\w\-\.]+\/api\/[\w\-\/]+)['"]/g)];
const uniqApi = [...new Set(apiUrls.map(m => m[1]))].slice(0, 10);
uniqApi.forEach(u => console.log('  ' + u));

// counter 클래스 박스 (시세 자리)
console.log('\n[counter 클래스 (시세 placeholder)]:');
const counterMatch = exHtml.match(/counter[\s\S]{0,200}/);
if (counterMatch) console.log('  ' + counterMatch[0].substring(0, 200).replace(/\s+/g, ' '));

// ─── 2. exgold의 /api/main 직접 시도 ───
console.log('\n[exgold /api/main POST 시도]:');
const r1 = await probeJsonEndpoint('https://www.exgold.co.kr/api/main', 'https://www.exgold.co.kr');
console.log('  ', JSON.stringify(r1));

// ─────────────────────────────────────────────
console.log('\n═══════════════════════════════════════════════');
console.log('▶ 2. soongumnara (순금나라) 분석');
console.log('═══════════════════════════════════════════════');

const sgHtml = await fetchHtml('https://www.soongumnara.co.kr/');
console.log('length:', sgHtml.length);

// 1,020,000원 주변 (실제 시세 위치 확인)
const priceMatch = sgHtml.match(/[\s\S]{0,400}1,020,000원[\s\S]{0,200}/);
if (priceMatch) {
  console.log('\n[1,020,000원 주변]:');
  console.log(priceMatch[0].replace(/\s+/g, ' ').substring(0, 800));
}

// 살때/팔때 패턴
console.log('\n[살때/팔때 DOM 영역]:');
const buyMatch = sgHtml.match(/살\s*때[\s\S]{0,500}/);
if (buyMatch) console.log(buyMatch[0].replace(/\s+/g, ' ').substring(0, 600));

// soongumnara ajax
console.log('\n[soongumnara ajax]:');
const sgAjax = [...sgHtml.matchAll(/\$\.(?:ajax|get|post)\([\s\S]{0,400}/g)].slice(0, 5);
sgAjax.forEach((m, i) => console.log(`  #${i}: ${m[0].replace(/\s+/g, ' ').substring(0, 350)}`));

console.log('\n[soongumnara /api/main 시도]:');
const r2 = await probeJsonEndpoint('https://www.soongumnara.co.kr/api/main', 'https://www.soongumnara.co.kr');
console.log('  ', JSON.stringify(r2));

console.log('\n▶ probe2 end');
