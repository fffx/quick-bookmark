# Popup Functional Specification

The popup is the only user interface. It opens via the toolbar icon or the
keyboard shortcut and closes itself after a successful add/remove.

## Layout

- A sticky search input (`#search`, placeholder `Filter ...`, autofocus,
  `autocomplete="off"`) at the top.
- A scrollable list (`#wrapper`) of category rows below it.
- Viewport width 500 (`views/popup.html`); minimum list size 200×200.
- Row states are styled by class: `.focus` (keyboard selection, purple),
  `:hover` (blue), `.create` ("new folder" rows, separated by a top border),
  `.contains-current-tab` (bold).

## Initial Load

1. `loadBookmarkFolders()` fetches the bookmark tree and the active tab in
   parallel; a tab-query failure degrades to `currentTab = null` rather than
   failing the load.
2. Folders are annotated (paths, pinyin, `containsCurrentTab`,
   `urlMatchScore`) and sorted: current-tab folders first; when the tab is
   not saved, folders ranked by match quality (same origin/host, folder
   title keyword from the tab URL, child bookmark keyword), then
   `dateGroupModified` descending.
3. The full sorted folder list is displayed with the cursor at row 0.
4. The search input is focused on open and re-focused whenever the browser
   window regains focus (`windows.onFocusChanged`); `onBlur` immediately
   re-focuses the input so typing never leaves the popup.

## Search Behavior

- Every keystroke debounces 150 ms, then:
  - **Empty query** → reload the full folder list (restores default sort and
    clears synthetic rows).
  - **Non-empty query** → `buildSearchResults()` (see [search.md](./search.md)):
    fuzzy matches plus optional "new folder" rows; the cursor moves to the
    first "real" match for plain queries, or row 0 for path queries.

## Row Rendering (`CategoryItem`)

Each row shows:

- **Icon**:
  - folder-plus (`HiOutlineFolderAdd`) for `NEW` rows,
  - red minus (`VscRemove`) when the folder contains the current tab,
  - plus (`VscAdd`) otherwise.
- **Title**:
  - Normal folder: `fullTitle(node) (childCount)` — the full path joined with
    `" / "` plus the direct-child count, e.g. `Bookmarks bar / Dev (12)`.
  - `NEW` row: `parentPath / <new name>` with the new name underlined/bold.
- **Tooltip** (`title` attribute):
  - `NEW` row: `New <name> under <parent> and bookmark current tab to it`
  - Contains current tab: `Remove bookmark from <folder>`
  - Otherwise: `Bookmark current tab to <folder>`
- **"Save Domain" hint**: while `Alt` is held and the row is focused (and the
  folder does not already contain the tab), a `Save Domain` line appears.

The focused row is scrolled into view (`scrollIntoView`, block/inline
`center`) whenever focus changes.

## Activation (click, `Enter`, or `Delete` on the focused row)

For a normal folder row:

1. Query the active tab; abort silently if it has no URL.
2. If any direct child of the folder has the same URL (fragment stripped):
   remove that bookmark, re-sort the list, close the popup.
3. Otherwise create a bookmark in the folder:
   - Normal mode: `{ title: tab.title, url: tab.url }`.
   - Domain-only mode (`Alt` held): `{ title: hostname, url: protocol//hostname }`.
4. Close the popup.

For a `NEW` row: create the folder (`{ title, parentId }`), then run the
normal add flow targeting the new folder, then close the popup.

## Keyboard Handling (on the search input)

| Key | Effect |
| --- | --- |
| `ArrowDown` | Move cursor to next row; wraps from last to first |
| `ArrowUp` | Move cursor to previous row; wraps from first to last |
| `Enter` / `Delete` | Activate the focused row (same as clicking it) |
| `Alt` (keydown) | Enter domain-only save mode |
| `Alt` (keyup) | Leave domain-only save mode |

Arrow keys are `preventDefault`ed so the text cursor stays in the input.

## List Windowing

At most 50 rows (`maxVisibleItems` prop) are rendered. When the list is
longer, a window of 50 rows centered on the cursor is sliced out, and the
cursor is interpreted as an absolute index (`startIndex + visibleIndex`).

## Post-Render Re-Sort

After the initial mount, the last rendered row triggers a one-time
`resortCategoryNodes()` so that rows rendered before `containsCurrentTab`
flags were applied are re-ordered (current-tab folders bubble to the top).
