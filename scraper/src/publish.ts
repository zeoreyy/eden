/** Read/write the programme in Cloudflare KV via the REST API (the scraper runs in GitHub Actions, outside the Worker). */
import type { Programme } from "@eden/shared";

/** Same key the Worker reads (worker/src/index.ts). */
export const PROGRAMME_KEY = "programme:v1";

export interface KvConfig { token: string; accountId: string; namespaceId: string }

export function kvConfig(env = process.env): KvConfig {
  const { CLOUDFLARE_API_TOKEN: token, CLOUDFLARE_ACCOUNT_ID: accountId, KV_NAMESPACE_ID: namespaceId } = env;
  const missing = Object.entries({ CLOUDFLARE_API_TOKEN: token, CLOUDFLARE_ACCOUNT_ID: accountId, KV_NAMESPACE_ID: namespaceId })
    .filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) throw new Error(`missing ${missing.join(", ")} (see .env.example)`);
  return { token: token!, accountId: accountId!, namespaceId: namespaceId! };
}

function valueUrl(c: KvConfig, key: string) {
  return `https://api.cloudflare.com/client/v4/accounts/${c.accountId}/storage/kv/namespaces/${c.namespaceId}/values/${encodeURIComponent(key)}`;
}

/** Last published programme (for the "keep last good data" fallback), or undefined if none yet. */
export async function loadPublished(c: KvConfig): Promise<Programme | undefined> {
  const res = await fetch(valueUrl(c, PROGRAMME_KEY), { headers: { Authorization: `Bearer ${c.token}` } });
  if (res.status === 404) return undefined;
  if (!res.ok) throw new Error(`KV read failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as Programme;
}

export async function publish(c: KvConfig, p: Programme): Promise<void> {
  const res = await fetch(valueUrl(c, PROGRAMME_KEY), {
    method: "PUT",
    headers: { Authorization: `Bearer ${c.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(p),
  });
  if (!res.ok) throw new Error(`KV write failed: ${res.status} ${await res.text()}`);
}
