/** Which phone/browser is this — for add-to-home instructions that match what the person actually sees. */
export type Platform = "ios-safari-26" | "ios-safari" | "ios-other" | "android-chrome" | "android-samsung" | "android-other" | "desktop";

export function platform(ua = navigator.userAgent, touchPoints = typeof navigator !== "undefined" ? navigator.maxTouchPoints : 0): Platform {
  const ios = /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && touchPoints > 1);
  if (ios) {
    if (/crios|fxios|edgios|opios/i.test(ua)) return "ios-other";
    const v = Number(ua.match(/Version\/(\d+)/)?.[1] ?? 0);
    return v >= 26 ? "ios-safari-26" : "ios-safari"; // Safari 26 moved Share into the ⋯ menu
  }
  if (/android/i.test(ua)) {
    if (/samsungbrowser/i.test(ua)) return "android-samsung";
    if (/chrome/i.test(ua) && !/edga|opr|firefox/i.test(ua)) return "android-chrome";
    return "android-other";
  }
  return "desktop";
}

export const isStandalone = () =>
  matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;

/** Chrome/Android's install event (not in TS's DOM lib). Captured once, app-wide. */
export interface InstallEvent extends Event { prompt(): Promise<void>; userChoice: Promise<{ outcome: string }> }
let deferred: InstallEvent | null = null;
const subs = new Set<() => void>();
if (typeof window !== "undefined") {
  addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferred = e as InstallEvent; subs.forEach((f) => f()); });
}
export const installEvent = () => deferred;
export const onInstallEvent = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  await deferred.prompt();
  const { outcome } = await deferred.userChoice;
  deferred = null;
  return outcome === "accepted";
}
