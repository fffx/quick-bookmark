/* global setTimeout, clearTimeout, navigator */
import browser from "webextension-polyfill";
import { SEPARATOR} from "./Popup/CategoryItem"
export const filterRecursively = (nodeArray, parentNode, filterFn, results) => {
  results = results || [];
  
  // Pre-compute parent path information
  const parentTitlePrefix = parentNode?.titlePrefix && parentNode?.title 
    ? `${parentNode.titlePrefix}${SEPARATOR}${parentNode.title}`
    : parentNode?.title || null;

  for (let i = 0; i < nodeArray.length; i++) {
    const node = nodeArray[i];
    const hasChildren = node.children && node.children.length > 0;

    // Set titlePrefix efficiently
    node.titlePrefix = parentTitlePrefix;

    // Set dirPath based on whether it's a bookmark or folder.
    // Leaf bookmarks are skipped: they are filtered out below and never
    // searched or rendered, so computing their dirPath is wasted work.
    if (!node.url || hasChildren) {
      node.dirPath = node.url
        ? (parentTitlePrefix ? `${parentTitlePrefix}${SEPARATOR}${node.title}` : node.title)
        : (parentTitlePrefix || node.title);
    }

    // Apply filter and add to results
    if (filterFn(node)) results.push(node);

    // Recursively process children if they exist
    if (hasChildren) {
      filterRecursively(node.children, node, filterFn, results);
    }
  }

  return results;
};

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
  // console.log("cachedBrowserName ---", cachedBrowserName);
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
  // console.log('isSameBookmarkUrl===============', url1, url2, removeHashtag(url1) === removeHashtag(url2))
  return removeHashtag(url1) === removeHashtag(url2);
};

export const sortNodes = (a, b) => {
  if (a.containsCurrentTab && !b.containsCurrentTab) {
    return -1;
  } else if (b.containsCurrentTab && !a.containsCurrentTab) {
    return 1;
  } else {
    return b.dateGroupModified - a.dateGroupModified;
  }
};
