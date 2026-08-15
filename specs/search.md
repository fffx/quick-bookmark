# Search Specification

Search has three layers: the Fuse.js index (`searchEngine.ts`), result
construction (`searchQuery.ts`), and annotation of searchable fields
(`loadBookmarks.ts`).

## Index (`FuseIndex`)

- Library: Fuse.js v7.
- Options: `isCaseSensitive: false`, `ignoreLocation: true`,
  `ignoreFieldNorm: true`, `findAllMatches: false`.
- Keys (weighted):
  | Key | Weight | When |
  | --- | --- | --- |
  | `pinyinTitle` | default | only when pinyin is supported |
  | `firstLetter` | default | only when pinyin is supported |
  | `title` | 5 | always |
  | `dirPath` | 6 | always |
- `search(str, limit = 1000)` returns the matched items (not Fuse result
  wrappers), best match first.

`dirPath` (full path, e.g. `Bookmarks bar / Dev / Frontend`) outweighs the
bare title, so queries containing parent names rank highest.

## Pinyin Support

- Enabled iff some entry of `navigator.languages` starts with `zh`
  (case-insensitive) **and** `Pinyin.isSupported()`.
- When enabled, every folder whose title contains a CJK character
  (`/[\u3400-\u9FBF]/`) gets:
  - `pinyinTitle` — `tiny-pinyin` conversion, space-separated, with toneless
    letters (`convertToPinyin(title, " ", true)`);
  - non-CJK titles keep `pinyinTitle = title`.
- When disabled, pinyin keys are omitted from the index entirely (indexing
  them would duplicate `title` and double the work).

## Query Construction (`buildSearchResults`)

Input: raw query text, the root nodes, and the `FuseIndex`.
Output: `{ categoryNodes, cursor }`.

### 1. Plain query (no `/`)

- Fuzzy results for the whole query.
- If the top result's `title` exactly equals the query → return matches only,
  cursor 0 (no "create" rows for an existing folder).
- Otherwise prepend one `NEW` row per **root node** offering to create the
  query as a new top-level folder, and place the cursor on the first fuzzy
  match (index = number of NEW rows), so `Enter` defaults to the existing
  match while the create options stay visible above.

### 2. Path query (`foo / bar`)

- Split on `/`, trim each segment; the last segment is `lastPart`, the rest
  re-joined with `" / "` is `parentPath`.
- Fuzzy results are still computed for the **full** query text.
- Exact-child detection (`hasExactPathMatch`): if the best match for
  `parentPath` has `title === parentPath` **and** one of the filtered results
  already resolves to `parent / lastPart` (by full path equality, or by
  `title === lastPart` under a matching `titlePrefix`), treat it as existing:
  return matches only, cursor 0.
- Otherwise offer to create `lastPart` inside:
  - the top 5 fuzzy matches for `parentPath`, or
  - if none, the top 5 matches for the full query.
- `NEW` rows go first, cursor 0 — `Enter` creates the folder and bookmarks
  the tab into it in one step.

### `NewFolderNode`

```
{ id: "NEW", title: <new folder name>, parentId, parentTitle, children: [] }
```

Rendered as `parentTitle / title`. Clicking creates the folder via
`browser.bookmarks.create({ title, parentId })` and then bookmarks the
current tab into the created folder.

## Windowing (`getVisibleWindow`)

- `nodes.length <= maxVisibleItems` → render all, `startIndex = 0`.
- Otherwise render a slice of size `maxVisibleItems` starting at
  `max(0, cursor - floor(maxVisibleItems / 2))` so the cursor stays centered.

## URL Matching (used by `containsCurrentTab` and add/remove)

- `isSameBookmarkUrl(a, b)` compares URLs after stripping everything from
  the first `#` — `https://x.dev/a#s1` and `https://x.dev/a` are the same
  bookmark.
- Missing/empty URLs never match.
- `buildUrlMap` precomputes a `Map<folderId, true>` of folders containing
  the active tab in a single pass; the common no-`#` case skips string
  splitting.
