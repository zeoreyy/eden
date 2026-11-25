/** PT default + EN toggle (spec). A plain dictionary; the choice is kept in localStorage. */
import { createContext, useContext } from "react";

export type Lang = "pt" | "en";

const dict = {
  pt: {
    today: "Hoje", week: "Semana", commercial: "Comercial", arthouse: "Autor",
    sections: "Secções",
    sessions: (n: number) => `${n} ${n === 1 ? "sessão" : "sessões"}`,
    more: (n: number) => `+ ${n} ${n === 1 ? "sessão" : "sessões"}`,
    noMoreToday: "Não há mais sessões hoje.",
    noneThatDay: "Sem sessões neste dia.",
    nextWeekNote: "A programação comercial da próxima semana sai à quinta-feira.",
    noTimes: "sem horários", seeSite: "ver no site",
    updated: (ago: string) => `atualizado ${ago}`,
    letterboxd: "Ver no Letterboxd",
    badge: "Autor",
    loading: "A carregar a programação…",
    loadError: "Não foi possível carregar a programação. Verifique a ligação à internet.",
    retry: "Tentar de novo",
    offline: (ago: string) => `Sem ligação: programação de ${ago}.`,
    close: "Fechar", back: "Voltar", days: "Dias", skip: "Saltar para as sessões",
    langSwitch: "EN", langLabel: "EN, switch to English",
    sessionsAt: (cinema: string) => `Sessões em ${cinema}`,
    footer: (ago: string) => `Programação das salas, atualizada ${ago}.`,
    credits: "Dados de filmes: TMDB (sem endosso do TMDB). Classificações IMDb via OMDb.",
    moreAbout: "Sobre o filme", cinemaPage: "Site do cinema",
    films: "Filmes", cinemas: "Cinemas", view: "Ver por", nextOn: (d: string) => `próxima: ${d}`, nothingSoon: "sem sessões marcadas",
    installTitle: "Leve a eden no telemóvel",
    installIos: "Toque em Partilhar e depois em «Adicionar ao ecrã principal».",
    installAndroid: "Instale a app: abre como uma app, sem browser.",
    install: "Adicionar ao ecrã principal", notNow: "Agora não", loadingShort: "A abrir a sala…",
  },
  en: {
    today: "Today", week: "Week", commercial: "Commercial", arthouse: "Arthouse",
    sections: "Sections",
    sessions: (n: number) => `${n} ${n === 1 ? "session" : "sessions"}`,
    more: (n: number) => `+ ${n} ${n === 1 ? "session" : "sessions"}`,
    noMoreToday: "No more sessions today.",
    noneThatDay: "No sessions on this day.",
    nextWeekNote: "Next week's commercial programme comes out on Thursday.",
    noTimes: "no times", seeSite: "see website",
    updated: (ago: string) => `updated ${ago}`,
    letterboxd: "See on Letterboxd",
    badge: "Arthouse",
    loading: "Loading the programme…",
    loadError: "Couldn't load the programme. Check your internet connection.",
    retry: "Try again",
    offline: (ago: string) => `Offline: programme from ${ago}.`,
    close: "Close", back: "Back", days: "Days", skip: "Skip to sessions",
    langSwitch: "PT", langLabel: "PT, mudar para português",
    sessionsAt: (cinema: string) => `Sessions at ${cinema}`,
    footer: (ago: string) => `Cinema programmes, updated ${ago}.`,
    credits: "Film data: TMDB (not endorsed or certified by TMDB). IMDb ratings via OMDb.",
    moreAbout: "About the film", cinemaPage: "Cinema's page",
    films: "Films", cinemas: "Cinemas", view: "View by", nextOn: (d: string) => `next: ${d}`, nothingSoon: "nothing scheduled",
    installTitle: "Keep eden on your phone",
    installIos: "Tap Share, then “Add to Home Screen”.",
    installAndroid: "Install the app: it opens like an app, no browser.",
    install: "Add to Home Screen", notNow: "Not now", loadingShort: "Opening the sala…",
  },
} as const;

export type Strings = (typeof dict)["pt"];

export function strings(lang: Lang): Strings {
  return dict[lang] as Strings;
}

export function initialLang(): Lang {
  try {
    const saved = localStorage.getItem("eden.lang");
    if (saved === "pt" || saved === "en") return saved;
  } catch { /* storage blocked */ }
  return "pt";
}

export function saveLang(lang: Lang) {
  try { localStorage.setItem("eden.lang", lang); } catch { /* storage blocked */ }
}

export const LangContext = createContext<{ lang: Lang; t: Strings }>({ lang: "pt", t: dict.pt as Strings });
export const useT = () => useContext(LangContext);
