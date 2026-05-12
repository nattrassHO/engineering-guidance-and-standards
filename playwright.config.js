import {defineConfig, devices} from '@playwright/test';

// noinspection JSUnusedGlobalSymbols - Imported by playwright runner
export default defineConfig({
  testDir: './tests/e2e',
  outputDir: './test-results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 2,
  workers: 5,
  webServer: {
    command: 'npm run serve',
    url: 'http://127.0.0.1:8080',
    reuseExistingServer: true,
    timeout: 120000,
  },

  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['playwright-ctrf-json-reporter', {}]
  ],

  use: {
    baseURL: process.env.TEST_URL ?? 'http://127.0.0.1',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    }
  ]
});
