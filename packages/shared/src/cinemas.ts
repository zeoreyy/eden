import type { Cinema } from "./types.ts";

/** The 19 cinemas. Do not add others (docs/spec.md). Venue URLs verified 24 Nov 2026. */
const NOS_VENUE = "https://www.cinemas.nos.pt/cinemas"; // NOS has no per-cinema page (modal only)

export const CINEMAS: readonly Cinema[] = [
  // — Cinemas NOS (sourceRef = theater uuid)
  { id: "nos-almada-forum", name: "Cinemas NOS Almada Forum", shortName: "Almada Forum", kind: "commercial", chain: "NOS", source: "nos", url: NOS_VENUE, sourceRef: "cf8fe24f-5589-40b8-acac-f2b230c63598" },
  { id: "nos-amoreiras", name: "Cinemas NOS Amoreiras", shortName: "Amoreiras", kind: "commercial", chain: "NOS", source: "nos", url: NOS_VENUE, sourceRef: "ea2970b2-8c00-4bd5-8716-586269b2f98f" },
  { id: "nos-cascaishopping", name: "Cinemas NOS CascaiShopping", shortName: "CascaiShopping", kind: "commercial", chain: "NOS", source: "nos", url: NOS_VENUE, sourceRef: "54b58378-917a-45b3-ab7b-890ae6b567cb" },
  { id: "nos-colombo", name: "Cinemas NOS Colombo", shortName: "Colombo", kind: "commercial", chain: "NOS", source: "nos", url: NOS_VENUE, sourceRef: "e0ea3044-4a1b-46b1-bca2-69fd8eae16d7" },
  { id: "nos-forum-montijo", name: "Cinemas NOS Forum Montijo", shortName: "Montijo", kind: "commercial", chain: "NOS", source: "nos", url: NOS_VENUE, sourceRef: "433306d2-1f37-4f72-a6eb-83bdb389feb8" },
  { id: "nos-odivelas-strada", name: "Cinemas NOS Odivelas Strada", shortName: "Odivelas", kind: "commercial", chain: "NOS", source: "nos", url: NOS_VENUE, sourceRef: "dcd7d577-ad37-4382-b750-f44940a75b1a" },
  { id: "nos-oeiras-parque", name: "Cinemas NOS Oeiras Parque", shortName: "Oeiras", kind: "commercial", chain: "NOS", source: "nos", url: NOS_VENUE, sourceRef: "9ac5a984-6792-4cec-870c-5e6beaba6d69" },
  { id: "nos-vasco-da-gama", name: "Cinemas NOS Vasco da Gama", shortName: "Vasco da Gama", kind: "commercial", chain: "NOS", source: "nos", url: NOS_VENUE, sourceRef: "4686b0dd-f485-40a6-afcb-5babdcfc467b" },

  // — UCI (sourceRef = Vista siteId; UBBO id/slug to verify in Phase 1)
  { id: "uci-el-corte-ingles", name: "UCI El Corte Inglés", shortName: "El Corte Inglés", kind: "commercial", chain: "UCI", source: "uci", url: "https://www.ucicinemas.pt/cinemas/el-corte-ingles/", sourceRef: "077" },
  { id: "uci-ubbo", name: "UCI LUXE UBBO", shortName: "UBBO", kind: "commercial", chain: "UCI", source: "uci", url: "https://www.ucicinemas.pt/cinemas/ubbo/" },

  // — Cinema City (sourceRef = site selector id)
  { id: "cc-alegro-alfragide", name: "Cinema City Alegro Alfragide", shortName: "Alfragide", kind: "commercial", chain: "CinemaCity", source: "cinemacity", url: "https://www.cinemacity.pt/editorial/cinema-city-alegro-alfragide/", sourceRef: "3183" },
  { id: "cc-alegro-setubal", name: "Cinema City Alegro Setúbal", shortName: "Setúbal", kind: "commercial", chain: "CinemaCity", source: "cinemacity", url: "https://www.cinemacity.pt/editorial/cinema-city-alegro-setubal/", sourceRef: "6300511" },
  { id: "cc-alvalade", name: "Cinema City Alvalade", shortName: "Alvalade", kind: "commercial", chain: "CinemaCity", source: "cinemacity", url: "https://www.cinemacity.pt/editorial/cinema-city-alvalade/", sourceRef: "96" },
  { id: "cc-campo-pequeno", name: "Cinema City Campo Pequeno", shortName: "Campo Pequeno", kind: "commercial", chain: "CinemaCity", source: "cinemacity", url: "https://www.cinemacity.pt/editorial/cinema-city-campo-pequeno/", sourceRef: "2669" },

  // — Cinema de Autor
  { id: "cinemateca", name: "Cinemateca Portuguesa", shortName: "Cinemateca", kind: "arthouse", source: "cinemateca", url: "https://www.cinemateca.pt/" },
  { id: "sao-jorge", name: "Cinema São Jorge", shortName: "São Jorge", kind: "arthouse", source: "saojorge", url: "https://cinemasaojorge.pt/" },
  { id: "nimas", name: "Cinema Medeia Nimas", shortName: "Nimas", kind: "arthouse", source: "nimas", url: "https://medeiafilmes.com/cinemas/cinema-medeia-nimas" },
  { id: "ideal", name: "Cinema Ideal", shortName: "Ideal", kind: "arthouse", source: "ideal", url: "https://www.cinemaidealemcasa.pt/" },
  { id: "fernando-lopes", name: "Cinema Fernando Lopes", shortName: "Fernando Lopes", kind: "arthouse", source: "fernandolopes", url: "https://cinemafernandolopes.pt/" },
];

export const CINEMA_BY_ID: ReadonlyMap<string, Cinema> = new Map(CINEMAS.map((c) => [c.id, c]));

export function cinemasForSource(source: Cinema["source"]): Cinema[] {
  return CINEMAS.filter((c) => c.source === source);
}
