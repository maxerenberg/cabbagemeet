#!/usr/bin/env node

// Run this script on the computer where the browser will run
// Adapted from https://github.com/microsoft/playwright/issues/1082#issuecomment-1282609492

const playwright = require('@playwright/test');

const browserName = process.env.BROWSER || 'chromium';
const browser = playwright[browserName];
if (!browser) {
  throw new Error(`Unrecognized browser name '${browserName}'`);
}
// Note that if you use the 'executablePath' option, Firefox and Webkit
// only work with the Playwright specific bundled version.
// If you want to use your system's existing browser, your only option is Chromium.
// See https://github.com/microsoft/playwright/issues/2623#issuecomment-646051077.
const executablePath = process.env.BROWSER_PATH;
const headless = process.env.HEADLESS === 'true' || process.env.HEADLESS === '1';
const port = process.env.PORT ? parseInt(process.env.PORT) : undefined;

(async () => {
  const server = await browser.launchServer({
    headless,
    executablePath,
    port,
  });
  console.log(server.wsEndpoint());
})();
