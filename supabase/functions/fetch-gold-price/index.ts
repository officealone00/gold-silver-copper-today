const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Fetch Naver finance gold detail page
    const response = await fetch('https://finance.naver.com/marketindex/goldDetail.naver', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'ko-KR,ko;q=0.9',
      },
    });

    if (!response.ok) {
      throw new Error(`Naver finance request failed: ${response.status}`);
    }

    const html = await response.text();

    // Parse gold price per gram (원/g)
    const pricePerGramMatch = html.match(/class="no_today"[^>]*>[\s\S]*?<em[^>]*>([\d,]+\.?\d*)<\/em>/);
    
    // Parse change amount and direction
    const changeMatch = html.match(/class="no_exday"[^>]*>[\s\S]*?<em[^>]*>[\s\S]*?([\d,]+\.?\d*)<\/em>/);
    const isUpMatch = html.match(/class="no_exday"[^>]*>[\s\S]*?class="(up|down|same)"/);
    
    // Parse date info
    const dateMatch = html.match(/(\d{4}\.\d{2}\.\d{2})/);

    // Fallback: try simpler pattern matching from the page content
    let pricePerGram = 0;
    let changeAmount = 0;
    let isUp = true;
    let baseDate = new Date().toISOString().split('T')[0];

    // Try to extract price from known patterns
    // The page shows: _245,132.2_ 원/g
    const simplePrice = html.match(/_?([\d,]+\.?\d*)_?\s*원\/g/);
    if (simplePrice) {
      pricePerGram = parseFloat(simplePrice[1].replace(/,/g, ''));
    } else if (pricePerGramMatch) {
      pricePerGram = parseFloat(pricePerGramMatch[1].replace(/,/g, ''));
    }

    // Try to extract change: 전일대비 _3,147.44_ _(+1.3%)_
    const simpleChange = html.match(/전일대비[^_]*_?([\d,]+\.?\d*)_?/);
    if (simpleChange) {
      changeAmount = parseFloat(simpleChange[1].replace(/,/g, ''));
    } else if (changeMatch) {
      changeAmount = parseFloat(changeMatch[1].replace(/,/g, ''));
    }

    // Check direction from percentage
    const pctMatch = html.match(/\(([\+\-][\d.]+%)\)/);
    if (pctMatch) {
      isUp = pctMatch[1].startsWith('+');
    } else if (isUpMatch) {
      isUp = isUpMatch[1] === 'up';
    }

    if (dateMatch) {
      baseDate = dateMatch[1].replace(/\./g, '-');
    }

    // Calculate don price (1돈 = 3.75g)
    const pricePerDon = Math.round(pricePerGram * 3.75 * 100) / 100;
    const changePerDon = Math.round(changeAmount * 3.75 * 100) / 100;

    // Calculate change percentage
    const prevPricePerGram = pricePerGram - (isUp ? changeAmount : -changeAmount);
    const changePct = prevPricePerGram > 0 
      ? ((pricePerGram - prevPricePerGram) / prevPricePerGram) * 100 
      : 0;

    const result = {
      success: true,
      gold: {
        baseDate,
        pricePerGram,
        pricePerDon,
        changeAmountPerGram: isUp ? changeAmount : -changeAmount,
        changeAmountPerDon: isUp ? changePerDon : -changePerDon,
        changePercent: isUp ? Math.abs(changePct) : -Math.abs(changePct),
        source: '신한은행',
      },
      collectedAt: new Date().toISOString(),
    };

    console.log('Gold price fetched:', JSON.stringify(result));

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching gold price:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
