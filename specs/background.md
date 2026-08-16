# Background Specification

`source/Background/index.ts` has a single responsibility: keep the toolbar
badge in sync with how many bookmarks point at the active tab.

## Behavior

1. On any trigger (below), query the active tab of the current window.
   If there is none, do nothing.
2. Fetch the whole bookmark tree and collect **every** node (any depth)
   whose URL matches the tab URL per `isSameBookmarkUrl` (fragment
   stripped).
3. Set the badge text for that tab:
   - `N > 0` → the count as a string (e.g. `"2"`),
   - `0` → empty string (badge hidden).

The badge is per-tab (`tabId` is passed), so switching tabs/windows shows
each tab's own count.

## Triggers

| Event | Listener |
| --- | --- |
| `browser.bookmarks.onCreated` | recount after adding |
| `browser.bookmarks.onRemoved` | recount after removing |
| `browser.tabs.onUpdated` | recount on navigation/URL change |
| `browser.tabs.onActivated` | recount on tab switch |
| `browser.windows.onFocusChanged` | recount on window switch |
| service worker startup | initial recount |

## Platform Notes

- Chrome/Opera/Edge: runs as an MV3 **service worker**
  (`background.service_worker`); listeners must stay top-level (they are).
- Firefox: runs as a **background script** (`background.scripts`) under the
  stable gecko id `{BE7CE6AD-AE07-4D04-A8DF-A2DA5044FE03}`.
- Imports `emoji-log` for debug logging side effects; errors from the
  bookmark/tab queries are unhandled promise rejections by design (the badge
  simply stays stale until the next event).
