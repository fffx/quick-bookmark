import browser from "webextension-polyfill";
import type Browser from "webextension-polyfill";

// Cache the detected name to avoid repeated UA parsing.
let cachedBrowserName: string | undefined;
export function getBrowserName(): string {
  if (cachedBrowserName) return cachedBrowserName;

  const ua = navigator.userAgent || "";
  if (ua.includes("Edg/")) {
    cachedBrowserName = "edge";
  } else if (ua.includes("OPR/") || ua.includes("Opera")) {
    cachedBrowserName = "opera";
  } else if (ua.includes("Firefox")) {
    cachedBrowserName = "firefox";
  } else {
    cachedBrowserName = "chrome";
  }
  return cachedBrowserName;
}

// https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/getCurrent
export const getCurrentTab = (): Promise<Browser.Tabs.Tab | undefined> =>
  browser.tabs
    .query({ active: true, currentWindow: true })
    .then((tabs) => tabs[0]);
