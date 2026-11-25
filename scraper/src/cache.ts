/** Tiny JSON file cache with per-entry timestamps (scraper/.cache/, gitignored; persisted between CI runs in Phase 6). */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

export const CACHE_DIR = fileURLToPath(new URL("../.cache/", import.meta.url));

interface Entry<T> { at: string; v: T }

export class JsonCache<T> {
  private data: Record<string, Entry<T>> = {};
  constructor(private file: string | null) {
    if (file && existsSync(file)) this.data = JSON.parse(readFileSync(file, "utf8"));
  }
  static open<T>(name: string) {
    return new JsonCache<T>(`${CACHE_DIR}${name}.json`);
  }
  /** Value if younger than maxAgeDays. */
  get(key: string, maxAgeDays: number, now = new Date()): T | undefined {
    const e = this.data[key];
    if (!e) return undefined;
    return now.getTime() - Date.parse(e.at) <= maxAgeDays * 86_400_000 ? e.v : undefined;
  }
  /** Value regardless of age (fallback when the API fails). */
  stale(key: string): T | undefined {
    return this.data[key]?.v;
  }
  set(key: string, v: T, now = new Date()) {
    this.data[key] = { at: now.toISOString(), v };
  }
  save() {
    if (!this.file) return;
    mkdirSync(dirname(this.file), { recursive: true });
    writeFileSync(this.file, JSON.stringify(this.data));
  }
}
