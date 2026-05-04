const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  const { searchParams } = new URL(req.url);
  const path = searchParams.get('path');
  if (!path) {
    return new Response(JSON.stringify({ error: 'path parameter required' }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  const bggUrl = `https://boardgamegeek.com/xmlapi2/${path}`;

  // BGG queues cold requests and returns 202 — retry up to 5× with 2s gaps
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(bggUrl, {
      headers: {
        'User-Agent': 'ShelfGeek/1.0',
        'Authorization': `Bearer ${Deno.env.get('BGG_TOKEN')}`,
      },
    });
    if (res.status === 202 && attempt < 4) {
      await new Promise(r => setTimeout(r, 2000));
      continue;
    }
    const text = await res.text();
    return new Response(text, {
      status: res.status,
      headers: { ...CORS, 'Content-Type': res.headers.get('Content-Type') ?? 'application/xml' },
    });
  }

  return new Response(JSON.stringify({ error: 'BGG did not respond in time' }), {
    status: 504, headers: { ...CORS, 'Content-Type': 'application/json' },
  });
});
