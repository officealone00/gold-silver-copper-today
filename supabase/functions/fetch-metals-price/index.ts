import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface MetalsDevResponse {
  status: string;
  currency: string;
  unit: string;
  metals: Record<string, number>;
  currencies: Record<string, number>;
  timestamp: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('METALS_DEV_API_KEY');
    if (!apiKey) {
      throw new Error('METALS_DEV_API_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch latest metal prices
    const url = `https://api.metals.dev/v1/latest?api_key=${apiKey}&currency=USD&unit=toz`;
    console.log('Fetching metals prices...');

    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Metals.dev API error [${response.status}]: ${errText}`);
    }

    const data: MetalsDevResponse = await response.json();
    if (data.status !== 'success') {
      throw new Error(`Metals.dev returned status: ${data.status}`);
    }

    const goldUsdPerToz = data.metals.gold || 0;
    const silverUsdPerToz = data.metals.silver || 0;
    const copperUsdPerToz = data.metals.copper || 0;
    const krwRate = data.currencies?.KRW || 1340;

    // Convert to KRW
    const goldKrwPerGram = (goldUsdPerToz / 31.1034768) * krwRate;
    const goldKrwPerDon = goldKrwPerGram * 3.75;
    const silverKrwPerGram = (silverUsdPerToz / 31.1034768) * krwRate;
    const silverKrwPerDon = silverKrwPerGram * 3.75;
    const copperUsdPerTon = copperUsdPerToz * 32150.75;

    const today = new Date().toISOString().split('T')[0];

    // Upsert today's prices into DB
    const metals = [
      {
        base_date: today,
        metal: 'gold',
        usd_per_toz: Math.round(goldUsdPerToz * 100) / 100,
        krw_per_gram: Math.round(goldKrwPerGram * 100) / 100,
        krw_per_don: Math.round(goldKrwPerDon),
        usd_per_ton: 0,
        usdkrw: Math.round(krwRate * 100) / 100,
        source: 'Metals.dev',
      },
      {
        base_date: today,
        metal: 'silver',
        usd_per_toz: Math.round(silverUsdPerToz * 100) / 100,
        krw_per_gram: Math.round(silverKrwPerGram * 100) / 100,
        krw_per_don: Math.round(silverKrwPerDon),
        usd_per_ton: 0,
        usdkrw: Math.round(krwRate * 100) / 100,
        source: 'Metals.dev',
      },
      {
        base_date: today,
        metal: 'copper',
        usd_per_toz: Math.round(copperUsdPerToz * 100) / 100,
        krw_per_gram: 0,
        krw_per_don: 0,
        usd_per_ton: Math.round(copperUsdPerTon),
        usdkrw: Math.round(krwRate * 100) / 100,
        source: 'Metals.dev',
      },
    ];

    const { error: upsertError } = await supabase
      .from('metal_prices')
      .upsert(metals, { onConflict: 'base_date,metal' });

    if (upsertError) {
      console.error('DB upsert error:', upsertError);
    }

    // Get previous day's prices (most recent before today)
    const { data: prevPrices } = await supabase
      .from('metal_prices')
      .select('*')
      .lt('base_date', today)
      .order('base_date', { ascending: false })
      .limit(3);

    // Build prev data map
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
      gold: {
        baseDate: today,
        usdPerToz: Math.round(goldUsdPerToz * 100) / 100,
        krwPerGram: Math.round(goldKrwPerGram * 100) / 100,
        krwPerDon: Math.round(goldKrwPerDon),
        prevKrwPerDon: prevMap.gold ? Number(prevMap.gold.krw_per_don) : null,
        source: 'Metals.dev (국제시세)',
      },
      silver: {
        baseDate: today,
        usdPerToz: Math.round(silverUsdPerToz * 100) / 100,
        krwPerGram: Math.round(silverKrwPerGram * 100) / 100,
        krwPerDon: Math.round(silverKrwPerDon),
        prevKrwPerDon: prevMap.silver ? Number(prevMap.silver.krw_per_don) : null,
        source: 'Metals.dev (국제시세)',
      },
      copper: {
        baseDate: today,
        usdPerTon: Math.round(copperUsdPerTon),
        prevUsdPerTon: prevMap.copper ? Number(prevMap.copper.usd_per_ton) : null,
        source: 'Metals.dev (LME)',
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
