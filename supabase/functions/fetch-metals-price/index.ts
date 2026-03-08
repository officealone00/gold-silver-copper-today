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

    // Fetch latest metal prices in USD with KRW conversion rate
    const url = `https://api.metals.dev/v1/latest?api_key=${apiKey}&currency=USD&unit=toz`;
    console.log('Fetching metals prices from metals.dev...');

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

    // Extract prices (USD per troy ounce)
    const goldUsdPerToz = data.metals.gold || 0;
    const silverUsdPerToz = data.metals.silver || 0;
    const copperUsdPerTon = (data.metals.copper || 0) * 32150.75; // copper is per toz, convert to per ton

    // Get KRW conversion rate
    // metals.dev currencies are inverse: USD/KRW
    // currencies.KRW gives how many KRW per 1 USD
    const krwRate = data.currencies?.KRW || 1340;

    // Gold: convert to KRW per gram, then per don (3.75g)
    // 1 troy ounce = 31.1034768g
    const goldKrwPerGram = (goldUsdPerToz / 31.1034768) * krwRate;
    const goldKrwPerDon = goldKrwPerGram * 3.75;

    // Silver: convert to KRW per gram, then per don (3.75g)
    const silverKrwPerGram = (silverUsdPerToz / 31.1034768) * krwRate;
    const silverKrwPerDon = silverKrwPerGram * 3.75;

    // Copper: metals.dev gives per troy ounce, convert to USD per metric ton
    // 1 metric ton = 32,150.75 troy ounces
    const copperUsdPerToz = data.metals.copper || 0;
    const copperUsdPerMetricTon = copperUsdPerToz * 32150.75;

    const now = new Date();
    const baseDate = now.toISOString().split('T')[0];

    const result = {
      success: true,
      collectedAt: now.toISOString(),
      usdkrw: Math.round(krwRate * 100) / 100,
      gold: {
        baseDate,
        usdPerToz: Math.round(goldUsdPerToz * 100) / 100,
        krwPerGram: Math.round(goldKrwPerGram * 100) / 100,
        krwPerDon: Math.round(goldKrwPerDon),
        source: 'Metals.dev (국제시세)',
      },
      silver: {
        baseDate,
        usdPerToz: Math.round(silverUsdPerToz * 100) / 100,
        krwPerGram: Math.round(silverKrwPerGram * 100) / 100,
        krwPerDon: Math.round(silverKrwPerDon),
        source: 'Metals.dev (국제시세)',
      },
      copper: {
        baseDate,
        usdPerToz: Math.round(copperUsdPerToz * 100) / 100,
        usdPerTon: Math.round(copperUsdPerMetricTon),
        source: 'Metals.dev (LME)',
      },
      rawTimestamp: data.timestamp,
    };

    console.log('Metals prices fetched:', JSON.stringify(result));

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching metals prices:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
