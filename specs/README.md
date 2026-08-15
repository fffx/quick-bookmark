# Quick Bookmark — Specifications

This folder contains the technical and functional specifications for the
Quick Bookmark browser extension.

## Documents

| Document | Contents |
| --- | --- |
| [overview.md](./overview.md) | Product overview, goals, features, supported browsers, permissions |
| [architecture.md](./architecture.md) | Technical architecture, modules, data flow, key types |
| [popup.md](./popup.md) | Popup UI functional spec: search box, list rendering, keyboard/mouse interaction, bookmark add/remove, folder creation |
| [search.md](./search.md) | Search spec: fuzzy matching, pinyin support, path search, "new folder" suggestions, result windowing |
| [background.md](./background.md) | Background service worker spec: toolbar badge |
| [build-and-testing.md](./build-and-testing.md) | Build pipeline, packaging, CI/release, test strategy |

## Scope

These specs describe the extension **as implemented** in `source/` (manifest
version 1.3.9, Manifest V3). They are a reverse-engineered reference for
maintainers and contributors, not a forward-looking design doc. The only
known planned feature is listed in the README TODO (folder suggestions via
Chrome built-in AI).
