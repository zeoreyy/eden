import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import type { Programme, Zone } from "@eden/shared";
import { ZONES } from "@eden/shared";

export type Load =
  | { state: "loading" }
  | { state: "error" }
  | { state: "ready"; programme: Programme };

/** One fetch of /api/programme. Offline, the service worker answers with the last copy (NetworkFirst). */
export function useProgramme(): [Load, () => void] {
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const ctl = new AbortController();
    setLoad({ state: "loading" });
    fetch("/api/programme", { signal: ctl.signal })
      .then((r) => (r.ok ? (r.json() as Promise<Programme>) : Promise.reject(new Error(String(r.status)))))
      .then((programme) => setLoad({ state: "ready", programme }))
      .catch((e: Error) => { if (e.name !== "AbortError") setLoad({ state: "error" }); });
    return () => ctl.abort();
  }, [attempt]);
  return [load, useCallback(() => setAttempt((n) => n + 1), [])];
}

/** Current time, refreshed every minute (past sessions drop off Hoje on their own). */
export function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    const vis = () => document.visibilityState === "visible" && setNow(Date.now());
    document.addEventListener("visibilitychange", vis);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", vis); };
  }, []);
  return now;
}

export function useOnline(): boolean {
  return useSyncExternalStore(
    (cb) => { addEventListener("online", cb); addEventListener("offline", cb); return () => { removeEventListener("online", cb); removeEventListener("offline", cb); }; },
    () => navigator.onLine,
  );
}

// ── Router: / (week, today selected), /comercial[/<cinema>], /autor[/<cinema>] ──
// ?dia= day · ?ver=cinemas · ?filme= film sheet · ?sessao= session lit in the sheet (shared link)
// Search + filters (José: they follow you across days and tabs): ?q= · ?depois=HH:MM · ?ate=<minutes> · ?zona=
export type Tab = "semana" | "comercial" | "autor";
export interface Filters { q?: string; after?: string; maxMin?: number; zone?: Zone }
export interface Route extends Filters { tab: Tab; cinemaId?: string; film?: string; day?: string; view?: "cinemas"; session?: string }

/** Just the search + filter part of a route (carried over when you change tab or day). */
export function filtersOf(r: Route): Filters {
  return { ...(r.q ? { q: r.q } : {}), ...(r.after ? { after: r.after } : {}), ...(r.maxMin ? { maxMin: r.maxMin } : {}), ...(r.zone ? { zone: r.zone } : {}) };
}
export const hasFilters = (f: Filters) => !!(f.q?.trim() || f.after || f.maxMin || f.zone);

export function parseRoute(loc: Location = location): Route {
  const [first, second] = loc.pathname.split("/").filter(Boolean);
  const tab: Tab = first === "comercial" || first === "autor" ? first : "semana"; // old /semana links land home
  const q = new URLSearchParams(loc.search);
  const film = q.get("filme") ?? undefined;
  const day = /^\d{4}-\d{2}-\d{2}$/.test(q.get("dia") ?? "") ? q.get("dia")! : undefined;
  const view = q.get("ver") === "cinemas" && tab !== "semana" ? ("cinemas" as const) : undefined;
  const session = film ? q.get("sessao") ?? undefined : undefined;
  const text = q.get("q")?.slice(0, 60) || undefined;
  const after = /^([01]\d|2[0-3]):[0-5]\d$/.test(q.get("depois") ?? "") ? q.get("depois")! : undefined;
  const ate = Number(q.get("ate"));
  const maxMin = Number.isInteger(ate) && ate >= 30 && ate <= 300 ? ate : undefined;
  const zona = q.get("zona");
  const zone = ZONES.some((z) => z.id === zona) ? (zona as Zone) : undefined;
  return {
    tab, ...(second && (tab === "comercial" || tab === "autor") ? { cinemaId: decodeURIComponent(second) } : {}), ...(view ? { view } : {}),
    ...(day ? { day } : {}), ...(text ? { q: text } : {}), ...(after ? { after } : {}), ...(maxMin ? { maxMin } : {}), ...(zone ? { zone } : {}),
    ...(film ? { film } : {}), ...(session ? { session } : {}),
  };
}

export function routeHref(r: Route): string {
  const path = r.tab === "semana" ? "/" : `/${r.tab}${r.cinemaId ? `/${encodeURIComponent(r.cinemaId)}` : ""}`;
  const q = new URLSearchParams();
  if (r.view) q.set("ver", r.view);
  if (r.day) q.set("dia", r.day);
  if (r.q) q.set("q", r.q);
  if (r.after) q.set("depois", r.after);
  if (r.maxMin) q.set("ate", String(r.maxMin));
  if (r.zone) q.set("zona", r.zone);
  if (r.film) q.set("filme", r.film);
  if (r.film && r.session) q.set("sessao", r.session);
  return q.size ? `${path}?${q}` : path;
}

const listeners = new Set<() => void>();
let current: Route = typeof location === "undefined" ? { tab: "semana" } : parseRoute();
if (typeof window !== "undefined") addEventListener("popstate", () => { current = parseRoute(); listeners.forEach((l) => l()); });

export function useRoute(): [Route, (r: Route, opts?: { replace?: boolean }) => void] {
  const route = useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb); }, () => current);
  const go = useCallback((r: Route, opts?: { replace?: boolean }) => {
    // The sheet is pushed with a marker so closing it can simply go back.
    history[opts?.replace ? "replaceState" : "pushState"](r.film ? { sheet: true } : null, "", routeHref(r));
    current = parseRoute();
    listeners.forEach((l) => l());
    if (!r.film && !opts?.replace) scrollTo({ top: 0 });
  }, []);
  return [route, go];
}

/** Close the film sheet: back if we opened it, else drop ?filme= in place (deep link). */
export function closeSheet(route: Route, go: (r: Route, o?: { replace?: boolean }) => void) {
  if ((history.state as { sheet?: boolean } | null)?.sheet) history.back();
  else go({ ...route, film: undefined, session: undefined }, { replace: true });
}
