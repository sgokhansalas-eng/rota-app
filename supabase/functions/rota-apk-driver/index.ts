Deno.serve(async (_req) => {
  const src = "https://raw.githubusercontent.com/sgokhansalas-eng/rota-app/main/apk/ROTA-Surucu.apk";
  const r = await fetch(src, { cache: "no-store" });
  if (!r.ok) return new Response("APK bulunamadı", { status: 502 });
  const h = new Headers();
  h.set("Content-Type", "application/vnd.android.package-archive");
  h.set("Content-Disposition", 'attachment; filename="ROTA-Surucu.apk"');
  h.set("Cache-Control", "no-store, max-age=0");
  h.set("X-Content-Type-Options", "nosniff");
  const len = r.headers.get("content-length");
  if (len) h.set("Content-Length", len);
  return new Response(r.body, { status: 200, headers: h });
});