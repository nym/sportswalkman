// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * Dedicated config for the demo runthrough — records video unconditionally
 * and only runs the runthrough spec.
 */
module.exports = defineConfig({
  testDir: './tests',
  testMatch: /runthrough\.spec\.js/,
  timeout: 90_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  retries: 0,
  reporter: [['list']],
  outputDir: 'demos/runthrough/_artifacts',

  use: {
    baseURL: 'http://localhost:8080',
    viewport: { width: 1280, height: 800 },
    headless: true,
    video: {
      mode: 'on',
      size: { width: 1280, height: 800 },
    },
    screenshot: 'off',
    trace: 'off',
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } }
      : {}),
  },

  webServer: {
    command: 'python3 -m http.server 8080',
    url: 'http://localhost:8080',
    reuseExistingServer: !process.env.CI,
    timeout: 5_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
