import { useEffect, useMemo, useState, type ReactNode } from "react";
import { CINEMA_BY_ID } from "@eden/shared";
import type { Film, Programme } from "@eden/shared";
import { LangContext, initialLang, saveLang, strings, useT, type Lang } from "./lib/i18n.ts";
import { closeSheet, useNow, useOnline, useProgramme, useRoute, routeHref, type Route, type Tab } from "./lib/hooks.ts";
import { beyondCommercialWeek, filmsOnDay, weekDays } from "./lib/programme.ts";
import { ago, lisbonDate, longDate } from "./lib/time.ts";
import { Emblem, Facade, SalaBackdrop } from "./components/Art.tsx";
import { DaySelector, PageTitle, Ribbon, StaleNotes } from "./components/Bits.tsx";
import { FilmCard } from "./components/FilmCard.tsx";
import { FilmSheet } from "./components/FilmSheet.tsx";
import { CinemaList, CinemaTimeline } from "./components/Cinemas.tsx";

export function App() {
  const [lang, setLang] = useState<Lang>(initialLang);
  const t = strings(lang);
  useEffect(() => { document.documentElement.lang = lang; saveLang(lang); }, [lang]);
  const ctx = useMemo(() => ({ lang, t }), [lang, t]);
  const [load, retry] = useProgramme();
  const [route, go] = useRoute();

  return (
    <LangContext.Provider value={ctx}>
      <a className="skip" href="#main">{t.skip}</a>
      <header className={route.tab === "hoje" ? "top with-facade" : "top"}>
        {route.tab === "hoje" ? <Facade /> : (
          <a className="brand" href="/" onClick={(e) => { e.preventDefault(); go({ tab: "hoje" }); }}>
            <Emblem size={26} /><span translate="no">eden</span>
          </a>
        )}
        <button type="button" className="lang" onClick={() => setLang(lang === "pt" ? "en" : "pt")} aria-label={t.langLabel}>{t.langSwitch}</button>
      </header>
      <main id="main" tabIndex={-1}>
        {load.state === "loading" && <p className="status" role="status">{t.loading}</p>}
        {load.state === "error" && (
          <div className="status" role="alert"><p>{t.loadError}</p><button type="button" className="retry" onClick={retry}>{t.retry}</button></div>
        )}
        {load.state === "ready" && <Screens p={load.programme} route={route} go={go} />}
      </main>
      <TabBar route={route} go={go} />
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

  const list = (date: string) => {
    const items = filmsOnDay(p, films, date, date === today ? now : undefined);
    if (!items.length) return <p className="empty">{date === today ? t.noMoreToday : t.noneThatDay}</p>;
    return items.map(({ film, sessions }, i) => (
      <div key={film.key}>
        {i > 0 && <Ribbon />}
        <FilmCard film={film} sessions={sessions} onOpen={() => openFilm(film.key)} eager={i === 0} />
      </div>
    ));
  };

  let body: ReactNode;
  if (route.tab === "hoje") {
    body = (
      <>
        <Hero><PageTitle title={t.today} sub={longDate(today, lang)} /></Hero>
        <StaleNotes p={p} now={now} />
        <div className="list">{list(today)}</div>
      </>
    );
  } else if (route.tab === "semana") {
    body = (
      <>
        <Hero>
          <PageTitle title={t.week} sub={longDate(day, lang)} />
          <DaySelector days={days} today={today} value={day} onChange={pickDay} />
        </Hero>
        {beyondCommercialWeek(today, day) && <p className="note">{t.nextWeekNote}</p>}
        <StaleNotes p={p} now={now} />
        <div className="list">{list(day)}</div>
      </>
    );
  } else {
    const kind = route.tab === "comercial" ? "commercial" : "arthouse";
    const cinema = route.cinemaId ? CINEMA_BY_ID.get(route.cinemaId) : undefined;
    body = cinema && cinema.kind === kind ? (
      <>
        <Hero>
          <a className="back" href={routeHref({ tab: route.tab })} onClick={(e) => { e.preventDefault(); go({ tab: route.tab, ...(route.day ? { day: route.day } : {}) }); }}>{t.back}</a>
          <PageTitle title={cinema.shortName} sub={longDate(day, lang)} />
          <DaySelector days={days} today={today} value={day} onChange={pickDay} />
        </Hero>
        {kind === "commercial" && beyondCommercialWeek(today, day) && <p className="note">{t.nextWeekNote}</p>}
        <StaleNotes p={{ ...p, sources: { [cinema.source]: p.sources[cinema.source] } as Programme["sources"] }} now={now} />
        <CinemaTimeline p={p} films={films} cinemaId={cinema.id} date={day} now={day === today ? now : undefined} onFilm={openFilm} />
      </>
    ) : (
      <>
        <Hero><PageTitle title={kind === "commercial" ? t.commercial : t.arthouse} sub={longDate(today, lang)} /></Hero>
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

/** Page title area with the sala as a faint backdrop. */
function Hero({ children }: { children: ReactNode }) {
  return <div className="hero"><SalaBackdrop />{children}</div>;
}

const TABS: Tab[] = ["hoje", "semana", "comercial", "autor"];

function TabBar({ route, go }: { route: Route; go: (r: Route) => void }) {
  const { t } = useT();
  const label: Record<Tab, string> = { hoje: t.today, semana: t.week, comercial: t.commercial, autor: t.arthouse };
  return (
    <nav className="tabs" aria-label={t.sections}>
      {TABS.map((tab) => (
        <a key={tab} href={routeHref({ tab })} aria-current={route.tab === tab ? "page" : undefined}
          onClick={(e) => { e.preventDefault(); go({ tab }); }}>{label[tab]}</a>
      ))}
    </nav>
  );
}
