import browser from "webextension-polyfill";
import type Browser from "webextension-polyfill";
import { filterRecursively, sortNodes } from "../lib/tree";
import type { BookmarkTreeNode, FolderNode } from "../lib/tree";
import { getBrowserName, getCurrentTab } from "../lib/browser";
import {
  buildFolderMatchContext,
  folderMatchScore,
  isSameBookmarkUrl,
} from "../lib/url";

// A folder is a bookmark node without a url. Chrome/Opera/Edge assign
// numeric ids, Firefox does not, so the browser-specific check differs.
const isFolder = (node: FolderNode): boolean => {
  if (getBrowserName() === "firefox") {
    return !node.url && Boolean(node.title);
  }
  return !node.url && Number(node.id) > 0;
};

const addPinyin = (
  node: FolderNode,
  convertToPinyin: (
    text: string,
    separator: string,
    lowerCase: boolean,
  ) => string,
): void => {
  node.pinyinTitle = /[\u3400-\u9FBF]/.test(node.title)
    ? convertToPinyin(node.title, " ", true)
    : node.title;
};

// Fast path: only exact URL match (fragment stripped). Cheap enough for the
// critical popup path so the list can paint immediately.
const markContainsCurrentTab = (
  folderNodes: FolderNode[],
  currentTab: Browser.Tabs.Tab | null | undefined,
): void => {
  const tabUrl = currentTab?.url;
  for (const node of folderNodes) {
    node.urlMatchScore = 0;
    node.containsCurrentTab = false;
    if (!tabUrl || !node.children?.length) continue;
    for (const child of node.children) {
      if (isSameBookmarkUrl(tabUrl, child.url)) {
        node.containsCurrentTab = true;
        node.urlMatchScore = 5;
        break;
      }
    }
  }
};

/*
 * Full ranking for unsaved tabs: origin/host, folder-title keywords, and
 * child-bookmark keywords. Intended to run after the popup has painted
 * (idle/next tick) so it does not delay the first frame.
 */
export function rankFoldersForTab(
  folderNodes: FolderNode[],
  tabUrl: string | null | undefined,
): FolderNode[] {
  // Tab already saved: exact-match folders are first; skip expensive walk.
  if (!tabUrl || folderNodes.some((n) => n.containsCurrentTab)) {
    return folderNodes;
  }

  const ctx = buildFolderMatchContext(tabUrl);
  if (!ctx) return folderNodes;

  for (const node of folderNodes) {
    const score = folderMatchScore(ctx, node);
    node.urlMatchScore = score;
    node.containsCurrentTab = score === 5;
  }
  folderNodes.sort(sortNodes);
  return folderNodes;
}

export interface LoadedBookmarks {
  folderNodes: FolderNode[];
  rootNodes: BookmarkTreeNode[];
  currentTab: Browser.Tabs.Tab | null | undefined;
}

/*
 * Loads the bookmark tree and returns all folders with search metadata:
 * pinyin titles (when supported), whether they contain the current tab
 * (exact URL only), sorted current-tab first then by recency.
 * Keyword/origin suggestions are applied later via rankFoldersForTab().
 */
export async function loadBookmarkFolders({
  isSupportPinyin,
}: {
  isSupportPinyin: boolean;
}): Promise<LoadedBookmarks> {
  const [bookmarkItems, currentTab, pinyinModule] = await Promise.all([
    browser.bookmarks.getTree(),
    getCurrentTab().catch(() => null), // Don't fail if tab query fails
    // Loaded on demand: only Chinese users need the pinyin dictionary.
    isSupportPinyin ? import("tiny-pinyin") : null,
  ]);

  const folderNodes = filterRecursively(bookmarkItems, null, isFolder);

  if (pinyinModule) {
    const convertToPinyin = pinyinModule.default.convertToPinyin;
    folderNodes.forEach((node) => addPinyin(node, convertToPinyin));
  }

  markContainsCurrentTab(folderNodes, currentTab);
  folderNodes.sort(sortNodes);

  return {
    folderNodes,
    rootNodes: bookmarkItems[0]?.children ?? [],
    currentTab,
  };
}
