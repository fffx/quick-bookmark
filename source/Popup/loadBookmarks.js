import browser from "webextension-polyfill";
import Pinyin from "tiny-pinyin";
import { filterRecursively, sortNodes } from "../lib/tree";
import { getBrowserName, getCurrentTab } from "../lib/browser";
import { removeHashtag } from "../lib/url";

// A folder is a bookmark node without a url. Chrome/Opera/Edge assign
// numeric ids, Firefox does not, so the browser-specific check differs.
const isFolder = (node) => {
  if (getBrowserName() === "firefox") {
    return !node.url && node.title;
  }
  return !node.url && node.id > 0;
};

const addPinyin = (node) => {
  node.pinyinTitle = /[\u3400-\u9FBF]/.test(node.title)
    ? Pinyin.convertToPinyin(node.title, " ", true)
    : node.title;
};

// Map of folder id -> true when any direct child matches the current tab URL.
const buildUrlMap = (folderNodes, currentTab) => {
  if (!currentTab?.url) return null;

  const urlMap = new Map();
  const currentUrl = removeHashtag(currentTab.url);

  for (const node of folderNodes) {
    if (!node.children || node.children.length === 0) continue;
    for (const child of node.children) {
      const rawUrl = child.url;
      // Avoid the hashtag split for the common case (URLs without '#').
      if (
        rawUrl &&
        (rawUrl === currentUrl ||
          (rawUrl.includes("#") && removeHashtag(rawUrl) === currentUrl))
      ) {
        urlMap.set(node.id, true);
        break;
      }
    }
  }
  return urlMap;
};

/*
 * Loads the bookmark tree and returns all folders with search metadata:
 * pinyin titles (when supported), whether they contain the current tab,
 * and a stable sort order (current-tab folders first, then by recency).
 */
export async function loadBookmarkFolders({ isSupportPinyin }) {
  const [bookmarkItems, currentTab] = await Promise.all([
    browser.bookmarks.getTree(),
    getCurrentTab().catch(() => null), // Don't fail if tab query fails
  ]);

  const folderNodes = filterRecursively(bookmarkItems, null, isFolder);

  if (isSupportPinyin) {
    folderNodes.forEach(addPinyin);
  }

  const urlMap = buildUrlMap(folderNodes, currentTab);
  folderNodes.forEach((node) => {
    node.containsCurrentTab = urlMap ? urlMap.get(node.id) === true : false;
  });

  folderNodes.sort(sortNodes);

  return {
    folderNodes,
    rootNodes: bookmarkItems[0].children,
    currentTab,
  };
}
