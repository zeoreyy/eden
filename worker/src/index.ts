// eden Worker: static web app (assets) + GET /api/programme from KV.
// The scraper (GitHub Actions) writes the whole programme as one JSON value; this only reads it.

// Same key the scraper writes (scraper/src/publish.ts). Not exported: every export of the main module must be a handler.
const PROGRAMME_KEY = "programme:v1";

const json = (body: unknown, status: number, cache = "no-store") =>
  Response.json(body, { status, headers: { "Cache-Control": cache } });

export default {
  async fetch(request, env): Promise<Response> {
    const { pathname } = new URL(request.url);

    if (pathname === "/api/programme") {
      if (request.method !== "GET" && request.method !== "HEAD") {
        return new Response("Method Not Allowed", { status: 405, headers: { Allow: "GET, HEAD" } });
      }
      // Streamed, not buffered (~1 MB). cacheTtl keeps hot reads at the edge; data changes ≤ 3×/day.
      const body = await env.PROGRAMME.get(PROGRAMME_KEY, { type: "stream", cacheTtl: 300 });
      if (!body) return json({ error: "programme not published yet" }, 503);
      return new Response(request.method === "HEAD" ? null : body, {
        headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=600" },
      });
    }

    if (pathname.startsWith("/api/")) return json({ error: "not found" }, 404);
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
