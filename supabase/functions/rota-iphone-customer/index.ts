Deno.serve(async () => {
  const r = await fetch("https://raw.githubusercontent.com/sgokhansalas-eng/rota-app/main/install/customer.html");
  const body = await r.text();
  return new Response(body, { status: r.status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
});