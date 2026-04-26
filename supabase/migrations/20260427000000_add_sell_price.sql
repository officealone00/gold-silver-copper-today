-- 팔때(매입가) 보관용 컬럼 추가.
-- 기존 행은 NULL로 두고 새 스크래핑이 채움.
ALTER TABLE metal_prices
  ADD COLUMN IF NOT EXISTS krw_per_don_sell numeric;
