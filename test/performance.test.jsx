import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Popup from '../source/Popup/Popup';
import { perfConfig } from './performance.config';

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

// Builds a large bookmark tree. Returns the tree plus the number of folders
// (roots + subfolders) so assertions don't depend on random generation.
function generateBookmarkTree(config) {
  let id = 0;
  const nextId = () => String(id++);
  const root = { id: nextId(), title: '', children: [] };
  let folderCount = 0;

  for (let f = 0; f < config.folderCount; f++) {
    const folder = { id: nextId(), title: `Folder ${f}`, children: [] };

    // Each folder has 50-100 subfolders
    const subCount = randInt(config.subFoldersMin, config.subFoldersMax);
    for (let s = 0; s < subCount; s++) {
      const sub = { id: nextId(), title: `Sub ${f}-${s}`, children: [] };
      for (let b = 0; b < config.bookmarksPerSubFolder; b++) {
        sub.children.push({
          id: nextId(),
          title: `Bookmark ${f}-${s}-${b}`,
          url: `https://example${f}.com/${s}/${b}`,
        });
      }
      folder.children.push(sub);
      folderCount += 1;
    }

    // Each folder also has 100-200 bookmarks directly inside it
    const bookmarkCount = randInt(
      config.bookmarksPerFolderMin,
      config.bookmarksPerFolderMax
    );
    for (let b = 0; b < bookmarkCount; b++) {
      folder.children.push({
        id: nextId(),
        title: `Direct ${f}-${b}`,
        url: `https://example${f}.com/direct/${b}`,
      });
    }

    root.children.push(folder);
    folderCount += 1;
  }
  return { tree: [root], folderCount };
}

// Pick a folder title that is guaranteed to exist in the generated tree.
function pickQuery(tree) {
  const lastFolder = tree[0].children[tree[0].children.length - 1];
  const node =
    lastFolder.children.find((child) => !child.url) || lastFolder.children[0];
  return node ? node.title : 'Folder 0';
}

// Mounts the popup and waits until items are rendered. Returns the elapsed
// time and how many items ended up on screen.
async function sampleRender(config) {
  const start = performance.now();
  const { container } = render(
    <Popup maxVisibleItems={config.maxVisibleItems} />
  );

  const renderedCount = () =>
    container.querySelectorAll('#wrapper > div').length;
  if (config.maxVisibleItems > 0) {
    await waitFor(
      () => {
        expect(renderedCount()).toBeGreaterThan(0);
      },
      { timeout: config.renderThresholdMs + 2000 }
    );
  }
  return { ms: performance.now() - start, renderedCount: renderedCount() };
}

// Mounts the popup, types a query, and waits until the matching folder shows.
// Returns the elapsed time from first keystroke to the result appearing.
async function sampleFilter(config, tree) {
  const query = pickQuery(tree);
  const user = userEvent.setup();
  const { container } = render(
    <Popup maxVisibleItems={config.maxVisibleItems} />
  );

  if (config.maxVisibleItems > 0) {
    await waitFor(
      () => {
        expect(container.querySelectorAll('#wrapper > div').length).toBeGreaterThan(0);
      },
      { timeout: config.renderThresholdMs + 2000 }
    );
  }

  const input = screen.getByPlaceholderText('Filter ...');
  const start = performance.now();
  await user.type(input, query);
  await waitFor(
    () => {
      expect(screen.getByText(new RegExp(query))).toBeInTheDocument();
    },
    { timeout: config.filterThresholdMs + 2000 }
  );
  return { ms: performance.now() - start };
}

// Runs a measurement config.sampleCount times and returns the median, which
// is robust to a single slow sample on a noisy runner.
async function medianOf(config, run) {
  const samples = [];
  for (let i = 0; i < config.sampleCount; i++) {
    samples.push(await run());
    cleanup();
  }
  return {
    ms: median(samples.map((s) => s.ms)),
    lastResult: samples[samples.length - 1],
  };
}

describe('Popup performance', () => {
  const config = perfConfig;

  it('should render a large bookmark tree within the render budget', async () => {
    const { tree, folderCount } = generateBookmarkTree(config);
    global.browser.bookmarks.getTree.mockResolvedValue(tree);
    global.browser.tabs.query.mockResolvedValue([
      { url: 'https://example.com', title: 'Example' },
    ]);

    const { ms: renderMs, lastResult } = await medianOf(config, () =>
      sampleRender(config)
    );

    // Only maxVisibleItems are rendered at once (or all of them if fewer)
    expect(lastResult.renderedCount).toBe(
      Math.min(config.maxVisibleItems, folderCount)
    );

    console.log(
      `[perf] rendered ${folderCount.toLocaleString()} folders ` +
        `(${config.folderCount} roots x ~${(config.subFoldersMin + config.subFoldersMax) / 2} subfolders, ` +
        `${config.bookmarksPerFolderMin}-${config.bookmarksPerFolderMax} bookmarks each) ` +
        `in ${renderMs.toFixed(0)}ms (median of ${config.sampleCount}, budget ${config.renderThresholdMs}ms)`
    );
    expect(renderMs).toBeLessThan(config.renderThresholdMs);
  });

  it('should filter a large bookmark tree within the filter budget', async () => {
    const { tree } = generateBookmarkTree(config);
    global.browser.bookmarks.getTree.mockResolvedValue(tree);
    global.browser.tabs.query.mockResolvedValue([
      { url: 'https://example.com', title: 'Example' },
    ]);

    const { ms: filterMs } = await medianOf(config, () =>
      sampleFilter(config, tree)
    );

    console.log(
      `[perf] filtered ${tree[0].children.length} roots ` +
        `in ${filterMs.toFixed(0)}ms (median of ${config.sampleCount}, budget ${config.filterThresholdMs}ms)`
    );
    expect(filterMs).toBeLessThan(config.filterThresholdMs);
  });
});
