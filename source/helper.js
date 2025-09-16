import browser from "webextension-polyfill";

export function debounce(func, wait = 200) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      func.apply(this, args);
    }, wait);
  };
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
