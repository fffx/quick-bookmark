import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import transformer from 'wext-manifest-transformer';
import manifestJson from '../source/manifest.json';

// Firefox bookmark node IDs are strings like "menu________" / "root________",
// so the chrome-style `node.id > 0` check would drop every folder. The popup
// must use `node.title` for Firefox instead.
const FIREFOX_BOOKMARK_TREE = [
  {
    id: 'root________',
    title: '',
    children: [
      {
        id: 'menu________',
        title: 'Bookmarks Menu',
        children: [
          {
            id: 'toolbar_____',
            title: 'Bookmarks Toolbar',
            children: [
              { id: 'github', title: 'GitHub', url: 'https://github.com' },
            ],
          },
        ],
      },
      {
        id: 'unfiled_____',
        title: 'Other Bookmarks',
        children: [],
      },
    ],
  },
];

const FIREFOX_UA =
  'Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/115.0';

async function importWithUa(userAgent, modulePath) {
  Object.defineProperty(navigator, 'userAgent', {
    configurable: true,
    value: userAgent,
  });
  vi.resetModules();
  return import(modulePath);
}

describe('Firefox browser detection (getBrowserName)', () => {
  it('returns "firefox" for a Firefox user agent', async () => {
    const { getBrowserName } = await importWithUa(
      FIREFOX_UA,
      '../source/helper'
    );
    expect(getBrowserName()).toBe('firefox');
  });

  it('returns "chrome" for a non-Firefox user agent', async () => {
    const { getBrowserName } = await importWithUa(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      '../source/helper'
    );
    expect(getBrowserName()).toBe('chrome');
  });

  it('returns "edge" for an Edge user agent', async () => {
    const { getBrowserName } = await importWithUa(
      'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
      '../source/helper'
    );
    expect(getBrowserName()).toBe('edge');
  });
});

describe('Popup folder filtering for Firefox', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value: '',
    });
  });

  it('shows folders when bookmark IDs are Firefox-style strings', async () => {
    const { default: Popup } = await importWithUa(
      FIREFOX_UA,
      '../source/Popup/Popup'
    );

    global.browser.bookmarks.getTree.mockResolvedValue(FIREFOX_BOOKMARK_TREE);
    global.browser.tabs.query.mockResolvedValue([
      { url: 'https://github.com', title: 'GitHub' },
    ]);

    render(<Popup />);

    await waitFor(() => {
      expect(screen.getByText(/Bookmarks Toolbar/)).toBeInTheDocument();
    });
    expect(screen.getByText(/Bookmarks Menu \(1\)/)).toBeInTheDocument();
    expect(screen.getByText(/Other Bookmarks \(0\)/)).toBeInTheDocument();
  });

  it('marks a folder as containing the current tab', async () => {
    const { default: Popup } = await importWithUa(
      FIREFOX_UA,
      '../source/Popup/Popup'
    );

    global.browser.bookmarks.getTree.mockResolvedValue(FIREFOX_BOOKMARK_TREE);
    global.browser.tabs.query.mockResolvedValue([
      { url: 'https://github.com', title: 'GitHub' },
    ]);

    const { container } = render(<Popup />);

    await waitFor(() => {
      expect(
        container.querySelector('.contains-current-tab')
      ).toBeInTheDocument();
    });
  });
});

describe('Firefox manifest generation', () => {
  const firefoxManifest = transformer(manifestJson, 'firefox', 'production');

  it('uses background scripts instead of a service worker', () => {
    expect(firefoxManifest.background.scripts).toEqual([
      'js/background.bundle.js',
    ]);
    expect(firefoxManifest.background.service_worker).toBeUndefined();
  });

  it('includes the Firefox gecko application id in browser_specific_settings', () => {
    expect(firefoxManifest.browser_specific_settings.gecko).toEqual({
      id: '{754FB1AD-CC3B-4856-B6A0-7786F8CA9D17}',
    });
    // `applications` is unsupported in Manifest V3 (Firefox 109+) and must not
    // leak into the generated manifest.
    expect(firefoxManifest.applications).toBeUndefined();
  });

  it('sets browser_style on the action', () => {
    expect(firefoxManifest.action.browser_style).toBe(false);
  });

  it('uses the Firefox-specific suggested key (Alt+B on mac)', () => {
    expect(
      firefoxManifest.commands._execute_action.suggested_key.mac
    ).toBe('Alt+B');
  });

  it('does not leak chrome-only keys into the Firefox manifest', () => {
    expect(firefoxManifest.minimum_chrome_version).toBeUndefined();
    expect(firefoxManifest.action.chrome_style).toBeUndefined();
  });
});
