import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ── Types ──────────────────────────────────────────────
interface MetalPriceAPIResponse {
  success: boolean;
  base: string;
  rates: Record<string, number>;
}

interface MetalsDevResponse {
  status: string;
  currency: string;
  unit: string;
  metals: Record<string, number>;
  currencies: Record<string, number>;
  timestamp: string;
}

interface ParsedPrices {
  goldUsdPerToz: number;
  silverUsdPerToz: number;
  copperUsdPerToz: number;
  krwRate: number;
  source: string;
}

// ── Fetch from MetalpriceAPI (primary) ─────────────────
async function fetchFromMetalpriceAPI(apiKey: string): Promise<ParsedPrices> {
  const url = 'https://api.metalpriceapi.com/v1/latest?api_key=' + apiKey + '&base=USD&currencies=XAU,XAG,XCU,KRW';
  console.log('[MetalpriceAPI] Fetching...');

  const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
  const rawText = await res.text();
  console.log('[MetalpriceAPI] Status:', res.status, 'Body:', rawText.substring(0, 500));

  if (!res.ok) {
    throw new Error(`MetalpriceAPI error [${res.status}]: ${rawText}`);
  }

  const data: MetalPriceAPIResponse = JSON.parse(rawText);
  if (!data.success) {
    throw new Error(`MetalpriceAPI returned success=false: ${rawText.substring(0, 300)}`);
  }

  // rates: 1 USD = X unit → price per oz = 1 / rate
  const goldUsdPerToz = data.rates.USDXAU ? 1 / data.rates.USDXAU : 0;
  const silverUsdPerToz = data.rates.USDXAG ? 1 / data.rates.USDXAG : 0;
  const copperUsdPerToz = data.rates.USDXCU ? 1 / data.rates.USDXCU : 0;
  const krwRate = data.rates.USDKRW || 1340;

  console.log('[MetalpriceAPI] Parsed:', { goldUsdPerToz, silverUsdPerToz, copperUsdPerToz, krwRate });

  return { goldUsdPerToz, silverUsdPerToz, copperUsdPerToz, krwRate, source: 'MetalpriceAPI' };
}

// ── Fetch from metals.dev (fallback) ───────────────────
async function fetchFromMetalsDev(apiKey: string): Promise<ParsedPrices> {
  const url = `https://api.metals.dev/v1/latest?api_key=${apiKey}&currency=USD&unit=toz`;
  console.log('[metals.dev] Fetching (fallback)...');

  const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`metals.dev API error [${res.status}]: ${errText}`);
  }

  const data: MetalsDevResponse = await res.json();
  if (data.status !== 'success') {
    throw new Error(`metals.dev returned status: ${data.status}`);
  }

  const krwPerUsd = data.currencies?.KRW;
  const krwRate = krwPerUsd && krwPerUsd > 0 ? (1 / krwPerUsd) : 1340;

  return {
    goldUsdPerToz: data.metals.gold || 0,
    silverUsdPerToz: data.metals.silver || 0,
    copperUsdPerToz: data.metals.copper || 0,
    krwRate,
    source: 'Metals.dev',
  };
}

// ── Main handler ───────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Try MetalpriceAPI first, fall back to metals.dev
    let prices: ParsedPrices;
    const metalpriceApiKey = Deno.env.get('METALPRICEAPI_KEY');
    const metalsDevApiKey = Deno.env.get('METALS_DEV_API_KEY');

    try {
      if (!metalpriceApiKey) throw new Error('METALPRICEAPI_KEY not configured');
      prices = await fetchFromMetalpriceAPI(metalpriceApiKey);
    } catch (primaryErr) {
      console.warn('[Primary API failed]', primaryErr instanceof Error ? primaryErr.message : primaryErr);
      try {
        if (!metalsDevApiKey) throw new Error('METALS_DEV_API_KEY not configured');
        prices = await fetchFromMetalsDev(metalsDevApiKey);
      } catch (fallbackErr) {
        console.error('[Fallback API also failed]', fallbackErr instanceof Error ? fallbackErr.message : fallbackErr);
        throw new Error('All price APIs failed');
      }
    }

    const { goldUsdPerToz, silverUsdPerToz, copperUsdPerToz, krwRate, source } = prices;

    // Convert units
    const goldKrwPerGram = (goldUsdPerToz / 31.1034768) * krwRate;
    const goldKrwPerDon = goldKrwPerGram * 3.75;
    const silverKrwPerGram = (silverUsdPerToz / 31.1034768) * krwRate;
    const silverKrwPerDon = silverKrwPerGram * 3.75;
    const copperUsdPerTon = copperUsdPerToz * 32150.75;

    const today = new Date().toISOString().split('T')[0];

    // Upsert 3 rows into metal_prices
    const metals = [
      {
        base_date: today,
        metal: 'gold',
        usd_per_toz: Math.round(goldUsdPerToz * 100) / 100,
        krw_per_gram: Math.round(goldKrwPerGram * 100) / 100,
        krw_per_don: Math.round(goldKrwPerDon),
        usd_per_ton: 0,
        usdkrw: Math.round(krwRate * 100) / 100,
        source,
      },
      {
        base_date: today,
        metal: 'silver',
        usd_per_toz: Math.round(silverUsdPerToz * 100) / 100,
        krw_per_gram: Math.round(silverKrwPerGram * 100) / 100,
        krw_per_don: Math.round(silverKrwPerDon),
        usd_per_ton: 0,
        usdkrw: Math.round(krwRate * 100) / 100,
        source,
      },
      {
        base_date: today,
        metal: 'copper',
        usd_per_toz: Math.round(copperUsdPerToz * 100) / 100,
        krw_per_gram: 0,
        krw_per_don: 0,
        usd_per_ton: Math.round(copperUsdPerTon),
        usdkrw: Math.round(krwRate * 100) / 100,
        source,
      },
    ];

    const { error: upsertError } = await supabase
      .from('metal_prices')
      .upsert(metals, { onConflict: 'base_date,metal' });

    if (upsertError) {
      console.error('DB upsert error:', upsertError);
    }

    // Get previous day's prices
    const { data: prevPrices } = await supabase
      .from('metal_prices')
      .select('*')
      .lt('base_date', today)
      .order('base_date', { ascending: false })
      .limit(3);

    const prevMap: Record<string, any> = {};
    if (prevPrices) {
      for (const p of prevPrices) {
        if (!prevMap[p.metal]) {
          prevMap[p.metal] = p;
        }
      }
    }

    const result = {
      success: true,
      collectedAt: new Date().toISOString(),
      usdkrw: Math.round(krwRate * 100) / 100,
      source,
      gold: {
        baseDate: today,
        usdPerToz: Math.round(goldUsdPerToz * 100) / 100,
        krwPerGram: Math.round(goldKrwPerGram * 100) / 100,
        krwPerDon: Math.round(goldKrwPerDon),
        prevKrwPerDon: prevMap.gold ? Number(prevMap.gold.krw_per_don) : null,
        source: `${source} (국제시세)`,
      },
      silver: {
        baseDate: today,
        usdPerToz: Math.round(silverUsdPerToz * 100) / 100,
        krwPerGram: Math.round(silverKrwPerGram * 100) / 100,
        krwPerDon: Math.round(silverKrwPerDon),
        prevKrwPerDon: prevMap.silver ? Number(prevMap.silver.krw_per_don) : null,
        source: `${source} (국제시세)`,
      },
      copper: {
        baseDate: today,
        usdPerTon: Math.round(copperUsdPerTon),
        prevUsdPerTon: prevMap.copper ? Number(prevMap.copper.usd_per_ton) : null,
        source: `${source} (LME)`,
      },
    };

    console.log('Metals prices fetched & saved:', JSON.stringify(result));

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
