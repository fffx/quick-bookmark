export const removeHashtag = (url: string): string => url.split("#")[0];

export const isSameBookmarkUrl = (
  url1: string | null | undefined,
  url2: string | null | undefined,
): boolean => {
  if (!url1 || !url2) return false;
  return removeHashtag(url1) === removeHashtag(url2);
};

// Hostname labels / path segments too generic to use as match keywords.
const KEYWORD_STOP = new Set([
  "www",
  "www2",
  "m",
  "mobile",
  "app",
  "api",
  "cdn",
  "static",
  "assets",
  "en",
  "us",
  "uk",
  "de",
  "fr",
  "jp",
  "cn",
  "es",
  "it",
  "ru",
  "com",
  "org",
  "net",
  "edu",
  "gov",
  "io",
  "co",
  "me",
  "info",
  "biz",
  "dev",
  "html",
  "htm",
  "php",
  "asp",
  "aspx",
  "jsp",
  "index",
  "home",
  "page",
  "default",
]);

const MIN_KEYWORD_LEN = 3;

/*
 * Meaningful tokens from a URL (hostname labels + path segments), lowercased,
 * with common TLDs/locale/noise stripped. Used to suggest folders when the
 * current tab is not bookmarked yet.
 */
export const extractUrlKeywords = (
  url: string | null | undefined,
): string[] => {
  if (!url) return [];
  try {
    const parsed = new URL(removeHashtag(url));
    const parts = [
      ...parsed.hostname.split("."),
      ...parsed.pathname.split("/"),
    ];
    const seen = new Set<string>();
    const keywords: string[] = [];
    for (const raw of parts) {
      const token = raw.toLowerCase().replace(/[^a-z0-9\u3400-\u9fbf]+/g, "");
      if (
        token.length < MIN_KEYWORD_LEN ||
        KEYWORD_STOP.has(token) ||
        seen.has(token)
      ) {
        continue;
      }
      seen.add(token);
      keywords.push(token);
    }
    return keywords;
  } catch {
    return [];
  }
};

const titleMatchesKeyword = (title: string, keyword: string): boolean => {
  const t = title.toLowerCase();
  if (t.length < MIN_KEYWORD_LEN) return false;
  return t === keyword || t.includes(keyword) || keyword.includes(t);
};

export interface FolderMatchContext {
  tabUrl: string;
  tabBare: string;
  tabOrigin: string;
  tabHost: string;
  keywords: string[];
}

// Precompute tab URL pieces once per ranking pass (not per folder).
export const buildFolderMatchContext = (
  tabUrl: string | null | undefined,
): FolderMatchContext | null => {
  if (!tabUrl) return null;
  const tabBare = removeHashtag(tabUrl);
  let tabOrigin = "";
  let tabHost = "";
  try {
    const tab = new URL(tabBare);
    tabOrigin = tab.origin;
    tabHost = tab.hostname;
  } catch {
    // keywords may still be empty; caller handles null-ish host.
  }
  return {
    tabUrl,
    tabBare,
    tabOrigin,
    tabHost,
    keywords: extractUrlKeywords(tabUrl),
  };
};

// Higher is a better match for suggesting folders when the tab is unsaved.
// 5 = exact URL, 4 = same origin, 3 = same hostname,
// 2 = folder title matches a tab-URL keyword,
// 1 = a child bookmark URL/title contains a tab-URL keyword,
// 0 = none.
export const folderMatchScore = (
  tabUrlOrCtx: string | null | undefined | FolderMatchContext,
  folder: {
    title: string;
    children?: Array<{ url?: string; title?: string } | null | undefined>;
  },
): number => {
  const ctx =
    typeof tabUrlOrCtx === "object" && tabUrlOrCtx !== null
      ? tabUrlOrCtx
      : buildFolderMatchContext(tabUrlOrCtx);
  if (!ctx) return 0;

  let best = 0;
  const { tabBare, tabOrigin, tabHost, keywords } = ctx;

  for (const keyword of keywords) {
    if (titleMatchesKeyword(folder.title, keyword)) {
      best = 2;
      break;
    }
  }

  const children = folder.children;
  if (!children || children.length === 0) return best;

  for (const child of children) {
    if (!child) continue;
    const rawUrl = child.url;
    if (rawUrl && tabHost) {
      const b = removeHashtag(rawUrl);
      if (tabBare === b) return 5;
      try {
        const bm = new URL(b);
        if (bm.origin === tabOrigin) {
          best = Math.max(best, 4);
          continue;
        }
        if (bm.hostname === tabHost) {
          best = Math.max(best, 3);
          continue;
        }
      } catch {
        // fall through to keyword check
      }
    }

    if (best >= 2 || keywords.length === 0) continue;

    const haystack = `${rawUrl ?? ""} ${child.title ?? ""}`.toLowerCase();
    for (const keyword of keywords) {
      if (haystack.includes(keyword)) {
        best = Math.max(best, 1);
        break;
      }
    }
  }

  return best;
};
