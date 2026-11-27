import { useEffect, useMemo, useState, type ReactNode } from "react";
import { CINEMA_BY_ID } from "@eden/shared";
import type { Film, Programme } from "@eden/shared";
import { LangContext, initialLang, saveLang, strings, useT, type Lang } from "./lib/i18n.ts";
import { closeSheet, filtersOf, hasFilters, useNow, useOnline, useProgramme, useRoute, routeHref, type Route, type Tab } from "./lib/hooks.ts";
import { beyondCommercialWeek, daysWithResults, filmsOnDay, weekDays, type FilmFilter } from "./lib/programme.ts";
import { ago, dayOfMonth, lisbonDate, longDate, weekdayLong, weekdayShort } from "./lib/time.ts";
import { Emblem, SalaCeiling, SalaSeats } from "./components/Art.tsx";
import { DaySelector, PageTitle, Ribbon, StaleNotes, ViewToggle } from "./components/Bits.tsx";
import { FilmCard } from "./components/FilmCard.tsx";
import { FilmSheet } from "./components/FilmSheet.tsx";
import { CinemaList } from "./components/Cinemas.tsx";
import { InfoSheet, Toaster } from "./components/Info.tsx";
import { InstallPrompt } from "./components/InstallPrompt.tsx";
import { SearchBar } from "./components/Search.tsx";
import { Splash } from "./components/Splash.tsx";
import { Tour, tourSeen } from "./components/Tour.tsx";

type Go = (r: Route, o?: { replace?: boolean }) => void;

export function App() {
  const [lang, setLang] = useState<Lang>(initialLang);
  const t = strings(lang);
  useEffect(() => { document.documentElement.lang = lang; saveLang(lang); }, [lang]);
  const ctx = useMemo(() => ({ lang, t }), [lang, t]);
  const [load, retry] = useProgramme();
  const [route, go] = useRoute();
  const [info, setInfo] = useState(false);
  // Guided tour: once per device, after the splash has walked you in (or replayed from the info sheet).
  const [tour, setTour] = useState(false);
  useEffect(() => {
    if (load.state !== "ready" || tourSeen() || route.film || route.tab !== "semana") return;
    const id = setTimeout(() => setTour(true), 2300);
    return () => clearTimeout(id);
  }, [load.state]); // eslint-disable-line react-hooks/exhaustive-deps

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
        <span className="top-actions">
          <button type="button" className="round-btn" data-tour="info" onClick={() => setInfo(true)} aria-label={t.about}>
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><circle cx="9" cy="9" r="7.5" fill="none" stroke="currentColor" strokeWidth="1.3" /><path d="M9 8v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /><circle cx="9" cy="5.4" r=".9" fill="currentColor" /></svg>
          </button>
          <button type="button" className="round-btn lang" onClick={() => setLang(lang === "pt" ? "en" : "pt")} aria-label={t.langLabel}>{t.langSwitch}</button>
        </span>
      </header>
      <main id="main" tabIndex={-1}>
        {load.state === "error" && (
          <div className="status" role="alert"><p>{t.loadError}</p><button type="button" className="retry" onClick={retry}>{t.retry}</button></div>
        )}
        {load.state === "ready" && <Screens p={load.programme} route={route} go={go} />}
      </main>
      <TabBar route={route} go={go} />
      {load.state === "ready" && !tour && <InstallPrompt />}
      {info && <InfoSheet onClose={() => setInfo(false)} onTour={() => { setInfo(false); go({ tab: "semana" }); setTimeout(() => setTour(true), 350); }} />}
      {tour && load.state === "ready" && <Tour onDone={() => setTour(false)} />}
      <Toaster />
    </LangContext.Provider>
  );
}

function Screens({ p, route, go }: { p: Programme; route: Route; go: Go }) {
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
  const searching = hasFilters(route);

  /** Search + filters (from the URL) on top of the page's own scope (all, one kind, one cinema). */
  const scoped = (scope: FilmFilter): FilmFilter => ({ ...scope, ...filtersOf(route) });
  const marked = (scope: FilmFilter) => (searching ? daysWithResults(p, films, days, today, now, scoped(scope)) : undefined);
  const dayLabel = (d: string) => (d === today ? t.today.toLowerCase() : `${weekdayShort(d, lang)} ${dayOfMonth(d)}`);

  /** Film cards for the selected day. With a search that has nothing today: point to the first day that has. */
  const cards = (scope: FilmFilter = {}) => {
    const filter = scoped(scope);
    const items = filmsOnDay(p, films, day, day === today ? now : undefined, filter);
    if (!items.length) {
      if (!searching) return <p className="empty">{day === today ? t.noMoreToday : t.noneThatDay}</p>;
      const other = days.find((d) => d !== day && filmsOnDay(p, films, d, d === today ? now : undefined, filter).length);
      return (
        <div className="no-results">
          <p>{other ? t.noResultsDay : t.noResultsWeek}</p>
          {other
            ? <button type="button" className="link-btn" onClick={() => pickDay(other)}>{t.seeDay(dayLabel(other))}</button>
            : <button type="button" className="link-btn" onClick={() => go({ ...route, q: undefined, after: undefined, maxMin: undefined, zone: undefined }, { replace: true })}>{t.clearFilters}</button>}
        </div>
      );
    }
    return items.map(({ film, sessions }, i) => (
      <div key={film.key}>
        {i > 0 && <Ribbon />}
        <FilmCard film={film} sessions={sessions} onOpen={() => openFilm(film.key)} eager={i === 0}
          showCinema={!scope.cinemaId} badge={!scope.cinemaId && scope.kind !== "arthouse"} />
      </div>
    ));
  };

  let body: ReactNode;
  if (route.tab === "semana") {
    body = (
      <>
        <PageTitle title={dayTitle} sub={daySub} />
        <SearchBar route={route} go={go} />
        <DaySelector days={days} today={today} value={day} onChange={pickDay} marked={marked({})} />
        {beyondCommercialWeek(today, day) && <p className="note">{t.nextWeekNote}</p>}
        <div className="list">{cards()}</div>
        {/* Cinemas without times: still shown (never hidden), but after the films (José). */}
        <StaleNotes p={p} now={now} />
      </>
    );
  } else {
    const kind = route.tab === "comercial" ? "commercial" : "arthouse";
    const cinema = route.cinemaId ? CINEMA_BY_ID.get(route.cinemaId) : undefined;
    const keep = { ...filtersOf(route), ...(route.day ? { day: route.day } : {}) };
    body = cinema && cinema.kind === kind ? (
      <>
        <a className="back" href={routeHref({ tab: route.tab, view: "cinemas", ...keep })} onClick={(e) => { e.preventDefault(); go({ tab: route.tab, view: "cinemas", ...keep }); }}>{t.back}</a>
        <PageTitle title={cinema.shortName} sub={`${dayTitle} · ${daySub}`} />
        <SearchBar route={route} go={go} zone={false} />
        <DaySelector days={days} today={today} value={day} onChange={pickDay} marked={marked({ cinemaId: cinema.id })} />
        {kind === "commercial" && beyondCommercialWeek(today, day) && <p className="note">{t.nextWeekNote}</p>}
        <StaleNotes p={{ ...p, sources: { [cinema.source]: p.sources[cinema.source] } as Programme["sources"] }} now={now} />
        <div className="list">{cards({ cinemaId: cinema.id })}</div>
      </>
    ) : (
      <>
        <PageTitle title={kind === "commercial" ? t.commercial : t.arthouse} sub={route.view === "cinemas" ? longDate(today, lang) : `${dayTitle} · ${daySub}`} />
        {/* José: in Comercial/Autor you may want the films, not the cinemas — default Filmes. */}
        <ViewToggle value={route.view ?? "filmes"} onChange={(v) => go({ ...route, view: v === "cinemas" ? "cinemas" : undefined }, { replace: true })} />
        {route.view === "cinemas" ? (
          <>
            <SearchBar route={route} go={go} only="zone" />
            <CinemaList p={p} kind={kind} today={today} now={now} zone={route.zone}
              onPick={(id) => go({ tab: route.tab, cinemaId: id, view: "cinemas", ...keep })} />
          </>
        ) : (
          <>
            <SearchBar route={route} go={go} />
            <DaySelector days={days} today={today} value={day} onChange={pickDay} marked={marked({ kind })} />
            {kind === "commercial" && beyondCommercialWeek(today, day) && <p className="note">{t.nextWeekNote}</p>}
            <div className="list">{cards({ kind })}</div>
            <StaleNotes p={p} kind={kind} now={now} />
          </>
        )}
      </>
    );
  }

  return (
    <>
      {!online && <p className="note offline" role="status">{t.offline(ago(p.generatedAt, lang, now))}</p>}
      {body}
      <footer className="foot"><p>{t.footer(ago(p.generatedAt, lang, now))}</p><p className="credits">{t.credits}</p></footer>
      {sheetFilm && <FilmSheet p={p} film={sheetFilm} today={today} now={now} litSession={route.session} onClose={() => closeSheet(route, go)} />}
    </>
  );
}

const TABS: Tab[] = ["semana", "comercial", "autor"];

function TabBar({ route, go }: { route: Route; go: Go }) {
  const { t } = useT();
  const label: Record<Tab, string> = { semana: t.week, comercial: t.commercial, autor: t.arthouse };
  // Search, filters and the day follow you to the other tabs (José).
  const keep = { ...filtersOf(route), ...(route.day ? { day: route.day } : {}) };
  return (
    <nav className="tabs" aria-label={t.sections}>
      {TABS.map((tab) => (
        <a key={tab} href={routeHref({ tab, ...keep })} aria-current={route.tab === tab ? "page" : undefined}
          onClick={(e) => { e.preventDefault(); go({ tab, ...keep }); }}>{label[tab]}</a>
      ))}
    </nav>
  );
}

