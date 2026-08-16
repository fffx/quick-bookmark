# Change Log
## [v1.6.0] - 2026-08-16
### Fixed
- Fix AMO manifest warnings: add required `data_collection_permissions` for Firefox and use correctly sized icons
- Add regression tests for the manifest data-collection permission and icon dimensions
- Rename Firefox listing to "Quick Bookmark Firefox" (the name "Quick Bookmark" is taken on AMO)

## [v1.5.0] - 2026-08-15
### Added
- Convert project to TypeScript
- Add ARIA support for screen reader users
- Suggest folders by URL keywords when current tab is unsaved
- Show filled star when url existed
- Add specs and unit tests (search, background, keyboard nav, bookmark actions, Firefox E2E)
- Add configurable performance test with flag toggles and regression budget in CI
- Support Firefox (MV3 manifest fix, folder hierarchy, containsCurrentTab fixes)
### Changed
- Upgrade to React 19, Fuse 7
- Optimize popup rendering and filtering performance
- Enable pinyin only when available in user's navigator
- Update minimum Chrome version to 88
### Fixed
- Fix sort, recursive filtering, create sub folder, save domain, search focus
- Add path create options
- Scroll immediately

## [v1.4.0] - 2026-08-15
### Added
- Suggest folders by URL keywords when current tab is unsaved

## [v1.3.8] - 2021-01-12
### Added
- Create folder at the top of the list.

## [v1.3.7] - 2021-01-12
### Added
- Hold Shift key to save root url(domain) only
### Fixed
- Fix mouse click not working

## [v1.3.6] - 2021-01-12
### Added
- Update license
- Show current tab bookmark count in icon badge 
- Fix only github release action, only release on `v*` tags
- Ignore hashtag when compare bookmark url
- Update Icon with outline & fill

## [v1.3.5] - 2020-12-26
### Added
- Add github action for release and upload build assets
- Debounce scroll
### Fixd
- Fix Nested folder name when depth > 2

## [v1.3.4] - 2020-12-24
### Added
- Pinyin support by https://github.com/creeperyang/pinyin
- Add Folder icon
- Support Choose root folder when new Folder
- Sort bookmark that contained current tab to first position


## [v1.3.3] - 2020-12-12

- Initial transport [chrome-better-bookmark](https://github.com/ardcore/chrome-better-bookmark) into React version, use [web-extension-starter](https://github.com/abhijithvijayan/web-extension-starter/tree/react-javascript)