export async function onRequest({ request, env }) {
  // 設定 CORS Header
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*', // 或限定為 'https://your-app.vercel.app'
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // 處理瀏覽器的預檢請求 (Preflight Options)
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method === 'POST') {
    try {
      const { message } = await request.json();

      const res = await fetch(`${env.SUPABASE_URL}/rest/v1/messages`, {
        method: 'POST',
        headers: {
          'apikey': env.SUPABASE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ content: message })
      });

      if (!res.ok) throw new Error(await res.text());

      return Response.json({ success: true }, { headers: corsHeaders });
    } catch (err) {
      return Response.json({ success: false, error: err.message }, { status: 400, headers: corsHeaders });
    }
  }

  return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
}