# Architecture

## Runtime Model

Manifest V3 extension with two runtime entry points:

| Entry | Source | Runs as |
| --- | --- | --- |
| Popup | `source/Popup/index.tsx` | React 19 app mounted into `popup.html` (`#popup-root`) |
| Background | `source/Background/index.ts` | Service worker (Chrome/Opera/Edge) or background script (Firefox) |

There is no content script and no messaging between popup and background;
each talks directly to the WebExtension APIs via `webextension-polyfill`
(promisified `browser.*`).

## Directory Layout

```
source/
  manifest.json          # MV3 manifest with __browser__-prefixed override keys
  assets/icons/          # bookmark.png / bookmark.svg icons
  Background/index.ts    # badge updater
  Popup/
    index.tsx            # React root
    Popup.tsx            # main component (state, keyboard, windowing)
    CategoryItem.tsx     # one row: icon, title, click behavior
    loadBookmarks.ts     # bookmark tree loading + annotation
    searchEngine.ts      # FuseIndex: Fuse.js wrapper
    searchQuery.ts       # buildSearchResults, getVisibleWindow, NewFolderNode
    styles.scss
  lib/
    tree.ts              # BookmarkTreeNode/FolderNode types, tree walkers, sort
    url.ts               # removeHashtag, isSameBookmarkUrl, urlMatchScore
    browser.ts           # getBrowserName (cached UA sniff), getCurrentTab
    debounce.ts          # generic debounce
    constants.ts         # SEPARATOR = " / "
  styles/                # shared scss partials (_reset, _variables, _fonts)
views/
  popup.html             # popup template (width=500 viewport)
  options.html           # generated but unused (no options script)
test/                    # Vitest unit/component tests
e2e/                     # Playwright tests against real Firefox
```

## Data Flow (Popup)

```
browser.bookmarks.getTree() ─┐
                             ├─> loadBookmarkFolders()
getCurrentTab() ─────────────┘        │
                                      ▼
        filterRecursively(): annotate each folder with
        titlePrefix ("Root / Parent") and dirPath
                                      │
        addPinyin() (zh users only) ──┤
        buildUrlScores() → containsCurrentTab + urlMatchScore
        sortNodes() (current-tab first, URL match, then recency)
                                      ▼
              allFolderNodes: FolderNode[] ──> FuseIndex (lazy, memoized)
                                      │
   search input ──debounce(150ms)──> buildSearchResults(text)
                                      │   (fuzzy results + NEW-folder entries)
                                      ▼
              categoryNodes: CategoryNode[] + cursor
                                      │
              getVisibleWindow(cursor, maxVisibleItems=50)
                                      ▼
                     <CategoryItem> rows (click/Enter → add or remove
                     bookmark, or create folder then add)
```

## Key Types

- `BookmarkTreeNode` — alias of the polyfill's `Bookmarks.BookmarkTreeNode`.
- `FolderNode` (`source/lib/tree.ts`) — a `BookmarkTreeNode` folder annotated by
  `loadBookmarks` with:
  - `titlePrefix` — parent path, e.g. `"Bookmarks bar / Dev"` (no trailing separator)
  - `dirPath` — full path of the folder (search key)
  - `pinyinTitle`, `firstLetter` — pinyin search keys (Chinese users only)
  - `containsCurrentTab` — whether a direct child's URL matches the active tab
  - `urlMatchScore` — best match to the active tab (5 exact, 4 origin,
    3 hostname, 2 folder-title keyword, 1 child keyword); used to suggest
    folders when the tab is unsaved
    url.ts helpers: `extractUrlKeywords`, `folderMatchScore`
- `SearchNode` (`searchEngine.ts`) — the subset of fields Fuse indexes.
- `NewFolderNode` (`searchQuery.ts`) — synthetic row with `id: "NEW"`,
  `parentId`, `parentTitle`; `isNewFolderNode()` is the type guard (plain
  `node.id === "NEW"` cannot narrow the union because `FolderNode.id` is a
  plain string).
- `CategoryNode = FolderNode | NewFolderNode`.

## Cross-Browser Strategy

1. **Build time**: `wext-manifest-loader` strips/renames `__chrome|firefox__`,
   `__firefox__`, `__chrome|opera|edge__` prefixed manifest keys per
   `TARGET_BROWSER`. Firefox gets `background.scripts` +
   `browser_specific_settings.gecko.id`; Chromium flavors get
   `background.service_worker`.
2. **Runtime**: `getBrowserName()` sniffs the UA once (cached). The only
   behavioral fork is folder detection in `loadBookmarks.isFolder`:
   Firefox folder ids are non-numeric strings, so Firefox uses
   `!node.url && Boolean(node.title)` while Chromium uses
   `!node.url && Number(node.id) > 0`.

## State & Performance Choices

- All popup state is local React state; nothing persists between popup
  openings (the popup reloads the tree each time).
- The Fuse index is memoized on `(allFolderNodes, isSupportPinyin)`.
- Search input is debounced 150 ms through a ref that always points at the
  latest handler.
- Rendering is windowed: at most `maxVisibleItems` (default 50) rows are
  mounted, centered on the cursor (`getVisibleWindow`).
- URL matching builds a `Map<folderId, true>` in one pass instead of
  repeated scans, and skips the `#` split for URLs without a hash.
- Pinyin conversion runs only for `zh*` locales and only on titles matching
  `/[\u3400-\u9FBF]/`.
- After first render, the list re-sorts once (`resorted` flag) so folders
  containing the current tab bubble to the top.
