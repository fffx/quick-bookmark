# Build, Release & Testing Specification

## Toolchain

- **Runtime**: Node ≥ 20, Yarn 4 (via Corepack; `packageManager: yarn@4.10.2`).
- **Language**: TypeScript 5.6 + React 19, transpiled by Babel
  (`@babel/preset-env`, `preset-react`, `preset-typescript`), bundled by
  **webpack 5** (`webpack.config.ts`).
- **Styles**: SCSS → `sass-embedded` → postcss/autoprefixer → extracted to
  `css/[name].css` via mini-css-extract-plugin.
- **Manifest**: `wext-manifest-loader` + `wext-manifest-webpack-plugin`
  resolve `__browser__` key prefixes per target; the manifest entry emits no
  JS bundle. `usePackageJSONVersion: false` — the version comes from
  `source/manifest.json` (currently 1.3.9), not `package.json`.
- **Polyfill**: `webextension-polyfill` is aliased and run through Babel
  targeting Chrome 88 (optional chaining / nullish coalescing transforms).

## Build Commands

| Command | Output |
| --- | --- |
| `yarn dev:chrome` / `yarn dev:firefox` | watch-mode development build |
| `yarn build:chrome` | production build → `extension/chrome/` + `extension/chrome.zip` |
| `yarn build:firefox` | production build → `extension/firefox/` + `extension/firefox.xpi` |
| `yarn build` | both of the above |
| `yarn typecheck` | `tsc --noEmit` |
| `yarn lint` / `yarn lint:fix` | ESLint 9 (flat config, prettier integration) |

Production builds minify with Terser (comments stripped) and
css-minimizer, clean the target directory first, generate external
sourcemaps, copy `source/assets` → `assets/`, render `popup.html` /
`options.html` from `views/`, and zip the folder (`zip`/`xpi`/`crx` by
target) via filemanager-webpack-plugin.

## Publishing to the Chrome Web Store

Build and publish from the command line with a Google Cloud
[service account](https://developer.chrome.com/docs/webstore/service-accounts):

1. Enable the Chrome Web Store API in a Google Cloud project and create a
   service account with a JSON key.
2. Add the service account email to your Chrome Web Store Developer Dashboard
   under **Account**.
3. Export the required credentials:

```sh
export GOOGLE_SERVICE_ACCOUNT_KEY=/path/to/service-account-key.json
export WEB_STORE_PUBLISHER_ID=your-publisher-id   # from Developer Dashboard > Publisher > Settings
export WEB_STORE_EXTENSION_ID=bbjekmkfbdemdbfkckbakmmiceppjkdc
```

4. Publish:

```sh
yarn publish:chrome
```

This builds `extension/chrome.zip` then uploads and publishes it. Options:

```sh
yarn publish:chrome -- --no-publish                 # upload only
yarn publish:chrome -- --target TRUSTED_TESTERS     # upload + publish to trusted testers
yarn publish:chrome -- --zip /path/to/chrome.zip    # use an existing zip
```

You must bump the `version` in `source/manifest.json` for uploads to succeed.

## CI / Release (`.github/workflows/main.yml`)

Triggers: push of a `v*` tag, or manual dispatch. Two jobs on
`ubuntu-latest`:

1. **test** — unit tests (`vitest run` excluding performance tests), then
   performance tests (`test/performance.test.tsx`, `--retry 2` for noisy
   shared runners).
2. **build** — `yarn && yarn build`, then `softprops/action-gh-release`
   attaches `extension/*.*` (the zipped extensions) to a GitHub Release,
   only when the ref is a tag.

## Test Strategy

Two layers (see `TEST_README.md`):

### 1. Unit / component tests — Vitest 4 + React Testing Library

- Environment: `happy-dom`; `webextension-polyfill` fully mocked in
  `test/setup.ts`; jest-dom matchers; `user-event`.
- Commands: `yarn test`, `yarn test:coverage`, `yarn test:ui`.

| File | Covers |
| --- | --- |
| `test/helper.test.ts` | `lib/*`: `filterRecursively`, `removeHashtag`, `isSameBookmarkUrl`, `sortNodes`, `debounce`, `getBrowserName` |
| `test/CategoryItem.test.tsx` | row rendering, icons, tooltips, add/remove flows |
| `test/Popup.test.tsx` | popup integration |
| `test/search.test.tsx` | prefix/child matching, new-folder fallback, exact-match suppression |
| `test/Background.test.ts` | badge logic |
| `test/firefox.test.tsx` | browser detection, Firefox folder-id handling, Firefox manifest output |
| `test/performance.test.tsx` | configurable perf budgets (`test/performance.config.ts`): single-pass annotation, URL map, cached browser name, pinyin gating, virtual scrolling |

### 2. Firefox E2E — Playwright

- `e2e/firefox-fixture.mjs` launches **real Firefox** (headed by default,
  `HEADLESS=1` for headless) and installs `extension/firefox` over the
  remote debugging protocol via `playwright-webextext`.
- `e2e/extension.spec.mjs` asserts:
  - install uses the stable gecko id (not a temporary id),
  - Firefox accepts the MV3 manifest with **zero warnings**,
  - the background script reaches `RUNNING`,
  - the built manifest uses `browser_specific_settings`, never the
    MV3-unsupported `applications` key.
- Commands: `yarn test:firefox:e2e`, `yarn test:firefox:e2e:headless`
  (requires `npx playwright install firefox`).
