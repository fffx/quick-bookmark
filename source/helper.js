/* global setTimeout, clearTimeout, navigator */
import browser from "webextension-polyfill";

export function debounce(func, wait = 100) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      func.apply(this, args);
    }, wait);
  };
}

// Cache for getBrowserName to avoid repeated detection
let cachedBrowserName;
export function getBrowserName() {
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
  console.log("cachedBrowserName ---", cachedBrowserName);
  return cachedBrowserName;
}

// https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/getCurrent
export const getCurrentTab = () => {
  return new Promise((resolve) => {
    browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      resolve(tabs[0]);
    });
  });
};

// TODO: allow user config this behavior?
export const removeHashtag = (url) => url.split("#")[0];

export const isSameBookmarkUrl = (url1, url2) => {
  if (!url1 || !url2) return false;
  return removeHashtag(url1) === removeHashtag(url2);
};
