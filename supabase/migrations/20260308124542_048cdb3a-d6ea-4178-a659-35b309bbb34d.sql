-- 금은동 일일 시세 저장 테이블
CREATE TABLE public.metal_prices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  base_date DATE NOT NULL,
  metal TEXT NOT NULL CHECK (metal IN ('gold', 'silver', 'copper')),
  usd_per_toz NUMERIC NOT NULL DEFAULT 0,
  krw_per_gram NUMERIC NOT NULL DEFAULT 0,
  krw_per_don NUMERIC NOT NULL DEFAULT 0,
  usd_per_ton NUMERIC NOT NULL DEFAULT 0,
  usdkrw NUMERIC NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'Metals.dev',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (base_date, metal)
);

-- 공개 읽기 허용 (시세 데이터는 공개)
ALTER TABLE public.metal_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read metal prices"
  ON public.metal_prices FOR SELECT
  USING (true);

-- 인덱스
CREATE INDEX idx_metal_prices_date_metal ON public.metal_prices (base_date DESC, metal);
CREATE INDEX idx_metal_prices_metal_date ON public.metal_prices (metal, base_date DESC);