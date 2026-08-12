import { test, expect } from './firefox-fixture.mjs';
import { EXTENSION_PATH } from './firefox-fixture.mjs';
import fs from 'node:fs';
import path from 'node:path';

const GECKO_ID = '{754FB1AD-CC3B-4856-B6A0-7786F8CA9D17}';

test.describe('Quick Bookmark in real Firefox', () => {
  test('extension installs with the stable gecko id (no temporary add-on id)', async ({
    addon,
  }) => {
    expect(addon.id).toBe(GECKO_ID);
    expect(addon.isWebExtension).toBe(true);
    expect(addon.temporarilyInstalled).toBe(true);
  });

  test('manifest is accepted by Firefox without warnings', async ({ addon }) => {
    // Firefox validates the manifest for real. The `applications` key is
    // unsupported in Manifest V3 and used to produce a warning here.
    expect(addon.warnings).toEqual([]);
  });

  test('background script runs', async ({ addon }) => {
    expect(addon.backgroundScriptStatus).toBe('RUNNING');
  });

  test('manifest uses browser_specific_settings, not applications', async () => {
    const manifest = JSON.parse(
      fs.readFileSync(path.join(EXTENSION_PATH, 'manifest.json'), 'utf8')
    );
    expect(manifest.browser_specific_settings.gecko.id).toBe(GECKO_ID);
    expect(manifest.applications).toBeUndefined();
  });
});
