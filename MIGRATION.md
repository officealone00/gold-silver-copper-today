# 시세 소스 변경: 국제 API → 한국 직접 시세

## 변경 요약

| 항목 | Before | After |
|------|--------|-------|
| 금/은 | metals.dev/MetalpriceAPI 국제도매가 → 환산 | **한국금거래소 `/api/main` 살때/팔때 직접** |
| 구리 | metals.dev XCU | **Yahoo Finance HG=F** (USD/lb → USD/ton) |
| 환율 | metals.dev currencies.KRW | **네이버 금융 환율** (백업: Yahoo KRW=X) |
| API 키 | METALS_DEV_API_KEY, METALPRICEAPI_KEY | **0개** |

검증된 실제 응답 (2026-04-25 KST 08:33):
- 순금 살때 980,000원/돈 · 팔때 820,000원/돈
- 은 살때 15,310원/돈 · 팔때 12,560원/돈
- COMEX 구리 6.027 USD/lb → 13,287 USD/ton
- 환율 1,477.50원/USD (네이버) ≈ 1,476.32 (Yahoo)

## 적용 순서

### 1) DB 마이그레이션 (팔때 컬럼 추가)

Supabase 대시보드 → SQL Editor → 아래 실행:

```sql
ALTER TABLE metal_prices
  ADD COLUMN IF NOT EXISTS krw_per_don_sell numeric;
```

또는 CLI:
```bash
supabase db push
```

### 2) Edge Function 배포

```bash
supabase functions deploy fetch-metals-price
```

기존 secret `METALS_DEV_API_KEY`, `METALPRICEAPI_KEY`는 더이상 안 씀. 지워도 되고 그냥 둬도 됨.

### 3) 프론트엔드 빌드 & 콘솔 등록

```bash
npx ait build
```
새 deploymentId를 앱인토스 콘솔에 등록.

### 4) (선택) cron 시각 변경

한국금거래소는 KST 09시쯤 갱신. 현재 cron `0 16 * * *` (KST 01:00)는 어제 종가 가져옴.
GitHub Actions나 Supabase scheduled function에서 **`30 0 * * *` (KST 09:30)** 으로 옮기면 자연스러움.
검수 통과 후 바꾸자.

## 톤당 → kg당 환산 (참고)

```
LME/COMEX 구리는 메트릭톤(1000kg) 기준 USD
  USD/ton ÷ 1000 = USD/kg
  USD/kg × USDKRW = KRW/kg
```
`src/utils/priceCalculator.ts`의 `calcCopperKgUsd`/`calcCopperKgKrw`가 이미 정확. 수정 불필요.

예: 13,287 USD/ton × 1,477.5원 ÷ 1000 = **19,627원/kg**

## 잠재 리스크 & 대응

1. **한국금거래소 `/api/main` 응답 구조 변경** → `officialPrice4` 누락 시 명시적 throw + DB 캐시 fallback
2. **봇 차단 강화** → User-Agent + Referer + Origin 위장 적용. 일 1회 호출이라 매너 OK
3. **Yahoo HG=F 다운** → DB의 어제 값으로 fallback (mock copper도 있음)
4. **네이버 환율 EUC-KR 디코딩 실패** → Yahoo KRW=X로 자동 fallback
5. **"내가 살 때" VAT 포함가** → 한국금거래소가 VAT 포함가를 살때로 표기. 이게 한국 사용자 체감가라 그대로 사용

## 검수(앱인토스) 영향

새 응답 shape이 기존 PriceData 타입과 호환되도록 hook에서 매핑 처리.
`GoldCard`/`SilverCard`/`CopperCard` 표시 텍스트는 그대로 동작.
- GoldCard: `{data.source} 기준` → "한국금거래소 기준"
- CopperCard: `{data.source} 기준` → "COMEX HG=F 기준" (런던금속거래소 하드코딩 제거됨)

API 실패 시 fallback + 에러 UI는 기존 구조(SafeAdBanner / mockData fallback) 그대로 유지됨.
