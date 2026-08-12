# Testing

This project has two test layers:

1. **Unit/component tests** using Vitest + React Testing Library (`happy-dom`, mocked `webextension-polyfill`).
2. **End-to-end tests against real Firefox** using Playwright. The built Firefox add-on is installed into a real Firefox via the remote debugging protocol (RDP), so Firefox performs real Manifest V3 validation and the background script runs against Firefox's actual APIs.

## Running Tests

```bash
# Unit tests (all environments)
yarn test          # or: bunx vitest run

# Watch mode
yarn test --watch

# Coverage
yarn test:coverage

# UI
yarn test:ui

# Firefox E2E (builds extension/firefox, then runs Playwright against real Firefox)
yarn test:firefox:e2e

# Firefox E2E headless
yarn test:firefox:e2e:headless
```

## Test Structure

- `test/helper.test.ts` - Tests for utility functions in `source/lib`
- `test/CategoryItem.test.tsx` - Tests for CategoryItem component
- `test/Popup.test.tsx` - Tests for Popup component
- `test/Background.test.ts` - Tests for the background service worker
- `test/firefox.test.tsx` - Firefox-specific unit tests (browser detection, `node.title` folder filtering for string bookmark IDs, Firefox manifest generation)
- `test/performance.test.tsx` - Configurable performance tests (see `test/performance.config.ts`)
- `e2e/extension.spec.mjs` - Playwright E2E tests that load the real Firefox add-on
- `e2e/firefox-fixture.mjs` - Playwright fixture that launches real Firefox and installs `extension/firefox` over RDP

## Firefox E2E Tests

The Playwright suite (`playwright.config.mjs`, project `firefox`) verifies Firefox-specific behavior that unit tests cannot:

- The add-on installs with the **stable gecko id** (`browser_specific_settings.gecko.id`) instead of a random temporary id
- Firefox accepts the Manifest V3 **without warnings** (a `browser_specific_settings`/`applications` regression would fail here)
- The **background script runs** in real Firefox
- The built manifest uses `browser_specific_settings`, not the MV3-unsupported `applications` key

Note: Firefox E2E launches Firefox (headed by default; set `HEADLESS=1` to run headless) and requires the Playwright Firefox browser to be installed (`npx playwright install firefox`).

## Test Coverage

The test suite currently covers:

### Helper Functions (✓ All Passing)
- `filterRecursively` - Recursive bookmark folder filtering
- `removeHashtag` - URL hashtag removal
- `isSameBookmarkUrl` - URL comparison (ignoring hashtags)
- `sortNodes` - Node sorting by containsCurrentTab and dateGroupModified
- `debounce` - Function debouncing
- `getBrowserName` - Browser detection with caching

### Performance Optimizations Tested
- Single-pass processing of bookmark nodes
- URL map for O(1) lookup performance
- Cached browser name detection
- Optimized pinyin conversion (only for Chinese users)
- Virtual scrolling with limited visible items

## Key Features Tested

1. **Path-based folder creation**: Search "foo / bar" to create "bar" inside "foo"
2. **Smart exact match detection**: No create options shown when folder exists
3. **Language-based pinyin**: Only enabled when Chinese is in user's preferred languages
4. **Performance optimizations**: Tested debouncing, caching, and efficient algorithms

## Notes

- Component tests require proper mocking of `webextension-polyfill` API
- Tests use `happy-dom` for lightweight DOM simulation
- Browser APIs (bookmarks, tabs) are fully mocked in `test/setup.ts`
