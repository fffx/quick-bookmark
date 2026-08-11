// Configurable settings for the performance (pressure) test.
//
// Every value can be overridden via environment variables, e.g.:
//   PERF_FOLDERS=100 PERF_RENDER_THRESHOLD_MS=1000 vitest run test/performance.test.jsx

const toInt = (name, defaultValue) => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value >= 0 ? value : defaultValue;
};

export const perfConfig = {
  // Number of top-level folders
  folderCount: toInt('PERF_FOLDERS', 300),
  // Each folder gets a random number of subfolders in this range
  subFoldersMin: toInt('PERF_SUBFOLDERS_MIN', 50),
  subFoldersMax: toInt('PERF_SUBFOLDERS_MAX', 100),
  // Each folder also gets a random number of bookmarks in this range
  bookmarksPerFolderMin: toInt('PERF_BOOKMARKS_PER_FOLDER_MIN', 100),
  bookmarksPerFolderMax: toInt('PERF_BOOKMARKS_PER_FOLDER_MAX', 200),
  // Number of bookmarks per subfolder
  bookmarksPerSubFolder: toInt('PERF_BOOKMARKS_PER_SUBFOLDER', 3),
  // How many list items the popup renders at once
  maxVisibleItems: toInt('PERF_MAX_VISIBLE_ITEMS', 50),
  // Assertions: rendering/filtering must finish within these bounds (ms)
  renderThresholdMs: toInt('PERF_RENDER_THRESHOLD_MS', 1000),
  filterThresholdMs: toInt('PERF_FILTER_THRESHOLD_MS', 3000),
};
