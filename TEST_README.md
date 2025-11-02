# Testing

This project includes unit tests using Vitest and React Testing Library.

## Running Tests

```bash
# Run all tests
bun test

# Run tests in watch mode
bun test -- --watch

# Run tests with coverage
bun test:coverage

# Run tests with UI
bun test:ui
```

## Test Structure

- `test/helper.test.js` - Tests for utility functions in `source/helper.js`
- `test/CategoryItem.test.jsx` - Tests for CategoryItem component
- `test/Popup.test.jsx` - Tests for Popup component

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
- Browser APIs (bookmarks, tabs) are fully mocked in `test/setup.js`
