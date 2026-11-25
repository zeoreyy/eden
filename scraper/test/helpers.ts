import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export function fixture(path: string, encoding: "utf8" | "latin1" = "utf8"): string {
  const buf = readFileSync(fileURLToPath(new URL(`../fixtures/${path}`, import.meta.url)));
  return new TextDecoder(encoding).decode(buf);
}

export function fixtureJson<T = unknown>(path: string, encoding: "utf8" | "latin1" = "utf8"): T {
  return JSON.parse(fixture(path, encoding)) as T;
}
