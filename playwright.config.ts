import { defineConfig, devices } from '@playwright/test';
import { environment } from './config/environment';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  outputDir: 'test-results/artifacts',
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    ignoreHTTPSErrors: false,
  },
  projects: [
    {
      name: 'api',
      testMatch: 'api/**/*.spec.ts',
      use: {
        baseURL: environment.apiBaseUrl,
        extraHTTPHeaders: {
          Accept: 'application/json',
        },
      },
    },
    {
      name: 'chromium-ui',
      testMatch: 'ui/**/*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: environment.frontendBaseUrl,
      },
    },
    {
      name: 'firefox-ui',
      testMatch: 'ui/**/*.spec.ts',
      use: {
        ...devices['Desktop Firefox'],
        baseURL: environment.frontendBaseUrl,
      },
    },
    {
      name: 'webkit-ui',
      testMatch: 'ui/**/*.spec.ts',
      use: {
        ...devices['Desktop Safari'],
        baseURL: environment.frontendBaseUrl,
      },
    },
    {
      name: 'chromium-e2e',
      testMatch: 'e2e/**/*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: environment.frontendBaseUrl,
      },
    },
  ],
});
