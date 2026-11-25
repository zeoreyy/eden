/** Title normalisation (film identity across cinemas) and display casing. */
import { levenshtein, squash, stripAccents } from "./util.ts";

const ZERO_WIDTH = /[​-‍﻿]/g;
const ARTICLES = new Set(["o", "a", "os", "as", "um", "uma", "the", "el", "la", "los", "las", "le", "les", "il", "lo"]);

/** Cleanup for any title we display: zero-width chars, spacing, trailing "(1922)". */
export function tidyTitle(s: string): string {
  return s.replace(ZERO_WIDTH, "").replace(/\s+/g, " ").replace(/\s*\((?:1[89]|20)\d\d\)\s*$/, "").trim();
}

/** "Nosferatu (1922)" → 1922. */
export function yearInTitle(s: string): number | undefined {
  const m = s.match(/\(((?:1[89]|20)\d\d)\)\s*$/);
  return m ? Number(m[1]) : undefined;
}

/** Suffixes that describe the screening, not the film. */
const SCREENING_SUFFIXES = [
  /\s*\((?:vo|vp|vo\/vp|vp\/vo|legendado|dobrado|imax|3d|2d|4dx)\)\s*$/i,
  /\s*[-–—:]?\s*\d+\s*[ºo°]?\s*anivers[aá]rio\s*$/i,
  /\s*[-–—:]?\s*vers[aã]o\s+restaurada\s*$/i,
];

/**
 * Identity key: lowercase, no accents, no punctuation, no screening suffixes, articles un-inverted.
 * "CHRISTOPHERS, OS" / "Os Christophers" → "os christophers"; "HEXE: O REINO" / "Hexe - O Reino" → "hexe o reino".
 */
export function normTitle(s: string): string {
  let t = tidyTitle(s);
  for (const re of SCREENING_SUFFIXES) t = t.replace(re, "");
  t = stripAccents(t).toLowerCase();
  const inv = t.match(/^(.*\S),\s*(\p{L}+)$/u);
  if (inv && ARTICLES.has(inv[2]!)) t = `${inv[2]} ${inv[1]}`;
  return t.replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

/** Title to send to a search: screening suffixes ("30º ANIVERSÁRIO", "(VO)") removed, accents kept. */
export function searchTitle(s: string): string {
  let t = tidyTitle(s);
  for (const re of SCREENING_SUFFIXES) t = t.replace(re, "");
  return t;
}

const LEADING_ARTICLE = /^(?:the|a|an|o|os|as|um|uma|le|la|les|l|el|il|lo|der|die|das)\s+/;

/** Equal keys, ignoring a leading article ("shining" = "the shining"). */
export function sameTitle(a: string, b: string): boolean {
  // also "minimos e monstros" = "minimos monstros" (TMDB "Mínimos & Monstros")
  const core = (x: string) => x.replace(LEADING_ARTICLE, "").replace(/\s(?:e|and)\s/g, " ");
  return a === b || (core(a) === core(b) && core(a).length >= 4);
}

/** "In the Mood For Love — Disponível Para Amar" → both halves (for searching only). */
export function titleParts(s: string): string[] {
  const parts = tidyTitle(s).split(/\s+[-–—|]\s+|:\s+/).map((p) => p.trim()).filter((p) => squash(p).length >= 3);
  return parts.length > 1 ? parts : [];
}

/** Near-identical keys ("dune parte tres" ≈ "duna parte tres"); only for longer titles. */
export function fuzzyEqual(a: string, b: string): boolean {
  const x = squash(a);
  const y = squash(b);
  if (x === y) return x.length > 0;
  const n = Math.min(x.length, y.length);
  if (n < 8) return false;
  return levenshtein(x, y) <= Math.max(1, Math.floor(n / 10));
}

export function isAllCaps(s: string): boolean {
  const letters = s.replace(/[^\p{L}]/gu, "");
  return letters.length > 2 && s === s.toUpperCase();
}

const SMALL = new Set(
  "a o as os e de do da dos das em no na nos nas um uma com por para ao aos à às of the and in on to for at by".split(" "),
);
const ROMAN = /^(?:ii|iii|iv|vi|vii|viii|ix|xi|xii)$/i;

/** "SENSIBILIDADE E BOM SENSO" → "Sensibilidade e Bom Senso" (only used when no cinema gives a mixed-case title). */
export function titleCase(s: string): string {
  let prevBreak = true;
  return s
    .toLowerCase()
    .split(" ")
    .map((w) => {
      const bare = w.replace(/[^\p{L}]/gu, "");
      let out: string;
      if (ROMAN.test(bare)) out = w.toUpperCase();
      else if (!prevBreak && SMALL.has(bare)) out = w;
      else out = w.replace(/\p{L}/u, (c) => c.toUpperCase());
      prevBreak = /[:\-–—.!?]$/.test(w) || /^[-–—]$/.test(w);
      return out;
    })
    .join(" ");
}

/** Stable slug for keys: "os christophers" → "os-christophers". */
export function slug(norm: string): string {
  return norm.replace(/\s+/g, "-").slice(0, 60);
}
