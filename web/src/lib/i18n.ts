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
    // search + filters
    search: "Procurar filme", clearSearch: "Limpar pesquisa",
    after: "Depois das", afterTitle: "Sessões depois das", afterValue: (hhmm: string) => `Depois das ${hhmm}`,
    duration: "Duração", durationTitle: "Filmes até", durationValue: (h: number, m: number) => `Até ${h}h ${String(m).padStart(2, "0")}`,
    zone: "Zona", zoneTitle: "Zona", allZones: "Todas",
    clear: "Limpar", apply: "Aplicar", removeFilter: (name: string) => `Tirar o filtro ${name}`,
    noResultsDay: "Nada neste dia com esta pesquisa.", seeDay: (d: string) => `Ver ${d} ›`,
    noResultsWeek: "Nada esta semana com esta pesquisa.", clearFilters: "Limpar pesquisa e filtros", hasResults: "tem resultados",
    // share
    shareSession: "Partilhar sessão", copied: "Link copiado", todayWord: "hoje", tomorrowWord: "amanhã",
    shareText: (film: string, when: string, cinema: string) => `${film} · ${when} · ${cinema}?`,
    // info
    about: "Sobre a eden", aboutLine: "Todas as sessões de cinema de Lisboa, da semana, num só sítio. Grátis, sem anúncios.",
    howItWorks: "Como funciona", shareApp: "Partilhar a eden", shareAppText: "eden: todas as sessões de cinema de Lisboa, num só sítio.",
    feedback: "Enviar feedback", feedbackSubject: "eden — feedback",
    galo: "Em homenagem ao Éden Teatro (1937) e ao «Galo», o cinema mais barato de Lisboa.",
    // tour
    next: "Seguinte", skipTour: "Saltar", start: "Começar", stepOf: (i: number, n: number) => `Passo ${i} de ${n}`,
    tourWelcomeTitle: "Bem-vindo à eden", tourWelcome: "Todas as sessões de cinema de Lisboa desta semana, num só sítio.",
    tourDays: "Escolha o dia. Hoje vem primeiro.",
    tourSearch: "Procure um filme, ou filtre por hora, duração e zona.",
    tourFilm: "Toque num filme para ver todas as sessões e as críticas no IMDb e no Letterboxd.",
    tourChip: "Toque numa hora para comprar o bilhete no site do cinema.",
    tourTabs: "Comercial e Autor: só esses cinemas, por filme ou por cinema.",
    tourInfo: "Aqui pode partilhar a eden e enviar ideias.",
    installTitleTour: "Leve a eden no ecrã principal", installApp: "Instalar a eden",
    installSteps: {
      "ios-safari-26": ["Toque em ⋯, ao lado do endereço", "Toque em Partilhar", "Toque em «Adicionar ao ecrã principal»"],
      "ios-safari": ["Toque em Partilhar, em baixo", "Toque em «Adicionar ao ecrã principal»"],
      "ios-other": ["Toque em Partilhar, na barra do endereço", "Toque em «Adicionar ao ecrã principal»"],
      "android-chrome": ["Toque no menu ⋮", "Toque em «Adicionar ao ecrã principal» ou «Instalar app»"],
      "android-samsung": ["Toque no menu ≡", "Toque em «Adicionar página a» e depois «Ecrã principal»"],
      "android-other": ["Abra o menu do browser", "Toque em «Adicionar ao ecrã principal»"],
    } as Record<string, string[]>,
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
    // search + filters
    search: "Search films", clearSearch: "Clear search",
    after: "After", afterTitle: "Sessions after", afterValue: (hhmm: string) => `After ${hhmm}`,
    duration: "Length", durationTitle: "Films up to", durationValue: (h: number, m: number) => `Up to ${h}h ${String(m).padStart(2, "0")}`,
    zone: "Area", zoneTitle: "Area", allZones: "All",
    clear: "Clear", apply: "Apply", removeFilter: (name: string) => `Remove the ${name} filter`,
    noResultsDay: "Nothing on this day for this search.", seeDay: (d: string) => `See ${d} ›`,
    noResultsWeek: "Nothing this week for this search.", clearFilters: "Clear search and filters", hasResults: "has results",
    // share
    shareSession: "Share session", copied: "Link copied", todayWord: "today", tomorrowWord: "tomorrow",
    shareText: (film: string, when: string, cinema: string) => `${film} · ${when} · ${cinema}?`,
    // info
    about: "About eden", aboutLine: "Every cinema session in Lisbon this week, in one place. Free, no ads.",
    howItWorks: "How it works", shareApp: "Share eden", shareAppText: "eden: every cinema session in Lisbon, in one place.",
    feedback: "Send feedback", feedbackSubject: "eden — feedback",
    galo: "A nod to the Éden Teatro (1937) and the “Galo”, Lisbon's cheapest cinema.",
    // tour
    next: "Next", skipTour: "Skip", start: "Start", stepOf: (i: number, n: number) => `Step ${i} of ${n}`,
    tourWelcomeTitle: "Welcome to eden", tourWelcome: "Every cinema session in Lisbon this week, in one place.",
    tourDays: "Pick a day. Today comes first.",
    tourSearch: "Search for a film, or filter by time, length and area.",
    tourFilm: "Tap a film for all its sessions and its reviews on IMDb and Letterboxd.",
    tourChip: "Tap a time to buy the ticket on the cinema's site.",
    tourTabs: "Commercial and Arthouse: just those cinemas, by film or by cinema.",
    tourInfo: "Share eden and send ideas from here.",
    installTitleTour: "Keep eden on your home screen", installApp: "Install eden",
    installSteps: {
      "ios-safari-26": ["Tap ⋯ next to the address", "Tap Share", "Tap “Add to Home Screen”"],
      "ios-safari": ["Tap Share at the bottom", "Tap “Add to Home Screen”"],
      "ios-other": ["Tap Share in the address bar", "Tap “Add to Home Screen”"],
      "android-chrome": ["Tap the ⋮ menu", "Tap “Add to Home screen” or “Install app”"],
      "android-samsung": ["Tap the ≡ menu", "Tap “Add page to”, then “Home screen”"],
      "android-other": ["Open the browser menu", "Tap “Add to Home screen”"],
    } as Record<string, string[]>,
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
