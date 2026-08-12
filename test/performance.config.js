// Configurable settings for the performance (pressure) test.
//
// Every value can be overridden via environment variables, e.g.:
//   PERF_FOLDERS=100 PERF_BASELINE_RENDER_MS=100 vitest run test/performance.test.jsx
//
// Two gates are enforced and the stricter one wins:
//   1. Baseline-ratio: measured time must stay below
//      baseline * budgetMultiplier. This catches gradual regressions.
//   2. Absolute ceiling: measured time must stay below the PERF_*_THRESHOLD_MS
//      values. This catches catastrophes even if a baseline was re-recorded
//      on a much faster machine.

/* global process */

const toInt = (name, defaultValue) => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value >= 0 ? value : defaultValue;
};

const toNumber = (name, defaultValue) => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : defaultValue;
};

// Recorded timings (median of 3 runs, dev machine). Re-run the perf test and
// update these if your hardware differs significantly, or override per-run
// via the PERF_BASELINE_*_MS env vars.
const baseline = {
  renderMs: toNumber("PERF_BASELINE_RENDER_MS", 100),
  filterMs: toNumber("PERF_BASELINE_FILTER_MS", 350),
};

// Fail when a run exceeds baseline * this multiplier. 2.0 catches ~2x
// regressions while leaving headroom for noisy CI runners.
const budgetMultiplier = toNumber("PERF_BUDGET_MULTIPLIER", 2.0);

// Absolute ceilings: never allow runs to exceed these, no matter how fast the
// recorded baseline was.
const absoluteThresholds = {
  renderMs: toInt("PERF_RENDER_THRESHOLD_MS", 1000),
  filterMs: toInt("PERF_FILTER_THRESHOLD_MS", 3000),
};

// The effective budget is the stricter of the two gates.
const effectiveThresholds = {
  renderMs: Math.min(
    absoluteThresholds.renderMs,
    baseline.renderMs * budgetMultiplier,
  ),
  filterMs: Math.min(
    absoluteThresholds.filterMs,
    baseline.filterMs * budgetMultiplier,
  ),
};

export const perfConfig = {
  // Number of top-level folders
  folderCount: toInt("PERF_FOLDERS", 300),
  // Each folder gets a random number of subfolders in this range
  subFoldersMin: toInt("PERF_SUBFOLDERS_MIN", 50),
  subFoldersMax: toInt("PERF_SUBFOLDERS_MAX", 100),
  // Each folder also gets a random number of bookmarks in this range
  bookmarksPerFolderMin: toInt("PERF_BOOKMARKS_PER_FOLDER_MIN", 100),
  bookmarksPerFolderMax: toInt("PERF_BOOKMARKS_PER_FOLDER_MAX", 200),
  // Number of bookmarks per subfolder
  bookmarksPerSubFolder: toInt("PERF_BOOKMARKS_PER_SUBFOLDER", 3),
  // How many list items the popup renders at once
  maxVisibleItems: toInt("PERF_MAX_VISIBLE_ITEMS", 50),
  // How many samples each measurement takes; the median is asserted against
  // the budget to dampen runner noise.
  sampleCount: toInt("PERF_SAMPLE_COUNT", 3),
  // Assertions
  baseline,
  budgetMultiplier,
  renderThresholdMs: effectiveThresholds.renderMs,
  filterThresholdMs: effectiveThresholds.filterMs,
};
