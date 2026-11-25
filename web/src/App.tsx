import { useEffect, useMemo, useState, type ReactNode } from "react";
import { CINEMA_BY_ID } from "@eden/shared";
import type { Film, Programme } from "@eden/shared";
import { LangContext, initialLang, saveLang, strings, useT, type Lang } from "./lib/i18n.ts";
import { closeSheet, useNow, useOnline, useProgramme, useRoute, routeHref, type Route, type Tab } from "./lib/hooks.ts";
import { beyondCommercialWeek, filmsOnDay, weekDays } from "./lib/programme.ts";
import { ago, lisbonDate, longDate, weekdayLong } from "./lib/time.ts";
import { Emblem, SalaCeiling, SalaSeats } from "./components/Art.tsx";
import { DaySelector, PageTitle, Ribbon, StaleNotes } from "./components/Bits.tsx";
import { FilmCard } from "./components/FilmCard.tsx";
import { FilmSheet } from "./components/FilmSheet.tsx";
import { CinemaList } from "./components/Cinemas.tsx";
import { InstallPrompt } from "./components/InstallPrompt.tsx";
import { Splash } from "./components/Splash.tsx";

export function App() {
  const [lang, setLang] = useState<Lang>(initialLang);
  const t = strings(lang);
  useEffect(() => { document.documentElement.lang = lang; saveLang(lang); }, [lang]);
  const ctx = useMemo(() => ({ lang, t }), [lang, t]);
  const [load, retry] = useProgramme();
  const [route, go] = useRoute();

  return (
    <LangContext.Provider value={ctx}>
      <Splash ready={load.state !== "loading"} />
      {/* The sala around the content: ceiling lights above, rows of seats below (José). */}
      <div className="sala-bg" aria-hidden="true"><SalaCeiling /><SalaSeats /></div>
      <a className="skip" href="#main">{t.skip}</a>
      <header className="top">
        <a className="brand" href="/" onClick={(e) => { e.preventDefault(); go({ tab: "semana" }); }}>
          <Emblem size={26} /><span translate="no">eden</span>
        </a>
        <button type="button" className="lang" onClick={() => setLang(lang === "pt" ? "en" : "pt")} aria-label={t.langLabel}>{t.langSwitch}</button>
      </header>
      <main id="main" tabIndex={-1}>
        {load.state === "error" && (
          <div className="status" role="alert"><p>{t.loadError}</p><button type="button" className="retry" onClick={retry}>{t.retry}</button></div>
        )}
        {load.state === "ready" && <Screens p={load.programme} route={route} go={go} />}
      </main>
      <TabBar route={route} go={go} />
      {load.state === "ready" && <InstallPrompt />}
    </LangContext.Provider>
  );
}

function Screens({ p, route, go }: { p: Programme; route: Route; go: (r: Route, o?: { replace?: boolean }) => void }) {
  const { t, lang } = useT();
  const now = useNow();
  const online = useOnline();
  const today = lisbonDate(new Date(now));
  const films = useMemo(() => new Map<string, Film>(p.films.map((f) => [f.key, f])), [p]);
  const days = weekDays(today);
  // Selected day lives in the URL (?dia=), so it can be shared and survives reload.
  const day = route.day && days.includes(route.day) ? route.day : today;
  const pickDay = (d: string) => go({ ...route, day: d === today ? undefined : d }, { replace: true });
  const openFilm = (key: string) => go({ ...route, film: key });
  const sheetFilm = route.film ? films.get(route.film) : undefined;
  const dayTitle = day === today ? t.today : weekdayLong(day, lang);
  const daySub = longDate(day, lang).replace(/^[^,\s]+,?\s*/, ""); // "25 de novembro" (the weekday is the title)

  const cards = (cinemaId?: string) => {
    const items = filmsOnDay(p, films, day, day === today ? now : undefined, cinemaId);
    if (!items.length) return <p className="empty">{day === today ? t.noMoreToday : t.noneThatDay}</p>;
    return items.map(({ film, sessions }, i) => (
      <div key={film.key}>
        {i > 0 && <Ribbon />}
        <FilmCard film={film} sessions={sessions} onOpen={() => openFilm(film.key)} eager={i === 0} showCinema={!cinemaId} />
      </div>
    ));
  };

  let body: ReactNode;
  if (route.tab === "semana") {
    body = (
      <>
        <PageTitle title={dayTitle} sub={daySub} />
        <DaySelector days={days} today={today} value={day} onChange={pickDay} />
        {beyondCommercialWeek(today, day) && <p className="note">{t.nextWeekNote}</p>}
        <div className="list">{cards()}</div>
        {/* Cinemas without times: still shown (never hidden), but after the films (José). */}
        <StaleNotes p={p} now={now} />
      </>
    );
  } else {
    const kind = route.tab === "comercial" ? "commercial" : "arthouse";
    const cinema = route.cinemaId ? CINEMA_BY_ID.get(route.cinemaId) : undefined;
    body = cinema && cinema.kind === kind ? (
      <>
        <a className="back" href={routeHref({ tab: route.tab })} onClick={(e) => { e.preventDefault(); go({ tab: route.tab, ...(route.day ? { day: route.day } : {}) }); }}>{t.back}</a>
        <PageTitle title={cinema.shortName} sub={`${dayTitle} · ${daySub}`} />
        <DaySelector days={days} today={today} value={day} onChange={pickDay} />
        {kind === "commercial" && beyondCommercialWeek(today, day) && <p className="note">{t.nextWeekNote}</p>}
        <StaleNotes p={{ ...p, sources: { [cinema.source]: p.sources[cinema.source] } as Programme["sources"] }} now={now} />
        <div className="list">{cards(cinema.id)}</div>
      </>
    ) : (
      <>
        <PageTitle title={kind === "commercial" ? t.commercial : t.arthouse} sub={longDate(today, lang)} />
        <CinemaList p={p} kind={kind} today={today} now={now} onPick={(id) => go({ tab: route.tab, cinemaId: id, ...(route.day ? { day: route.day } : {}) })} />
      </>
    );
  }

  return (
    <>
      {!online && <p className="note offline" role="status">{t.offline(ago(p.generatedAt, lang, now))}</p>}
      {body}
      <footer className="foot"><p>{t.footer(ago(p.generatedAt, lang, now))}</p><p className="credits">{t.credits}</p></footer>
      {sheetFilm && <FilmSheet p={p} film={sheetFilm} today={today} now={now} onClose={() => closeSheet(route, go)} />}
    </>
  );
}

const TABS: Tab[] = ["semana", "comercial", "autor"];

function TabBar({ route, go }: { route: Route; go: (r: Route) => void }) {
  const { t } = useT();
  const label: Record<Tab, string> = { semana: t.week, comercial: t.commercial, autor: t.arthouse };
  return (
    <nav className="tabs" aria-label={t.sections}>
      {TABS.map((tab) => (
        <a key={tab} href={routeHref({ tab })} aria-current={route.tab === tab ? "page" : undefined}
          onClick={(e) => { e.preventDefault(); go({ tab }); }}>{label[tab]}</a>
      ))}
    </nav>
  );
}
