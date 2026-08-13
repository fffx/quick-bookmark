import { test as base, expect } from '@playwright/test';
import { firefox } from '@playwright/test';
import { FirefoxOverrides } from 'playwright-webextext/dist/firefox_overrides.js';
import * as remote from 'playwright-webextext/dist/firefox_remote.js';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const EXTENSION_PATH = path.resolve(__dirname, '../extension/firefox');

const findFreeTcpPort = () =>
  new Promise((resolve) => {
    const srv = net.createServer();
    srv.listen(0, '127.0.0.1', () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
  });

// The quick-bookmark add-on has no content scripts, so it does not need the
// MV3 content-script permission override that playwright-webextext performs
// (that path is also buggy for manifests without `optional_permissions`). We
// therefore wire up the pieces directly: launch real Firefox with a remote
// debugging server and install the add-on over the remote debugging protocol
// (RDP). This drives Firefox's *real* Manifest V3 validation and bookmark API.
export const test = base.extend({
  // eslint-disable-next-line no-empty-pattern
  context: async ({}, use) => {
    const port = await findFreeTcpPort();
    const overrides = new FirefoxOverrides(port);
    const { args } = overrides.debuggingServerPortArgs();
    const firefoxUserPrefs = overrides.userPrefs();

    const context = await firefox.launchPersistentContext('', {
      headless: process.env.HEADLESS === '1',
      args,
      firefoxUserPrefs,
    });

    const client = await remote.connectWithMaxRetries({ port });
    await client.installTemporaryAddon(EXTENSION_PATH);

    const { addons } = await client.client.request('listAddons');
    const addon = addons.find((a) => a.name === 'Quick Bookmark');

    await use({ context, client, addon });

    await client.disconnect();
    await context.close();
  },

  addon: async ({ context }, use) => {
    await use(context.addon);
  },

  rdpClient: async ({ context }, use) => {
    await use(context.client);
  },
});

export { expect };
