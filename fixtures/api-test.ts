import { expect, test as base } from '@playwright/test';
import { waitForApiReadiness } from '../helpers/api-readiness.js';

type ApiBaseFixtures = {
  _apiReady: void;
};

export const test = base.extend<ApiBaseFixtures>({
  _apiReady: [
    async ({ request }, use) => {
      await waitForApiReadiness(request);
      await use();
    },
    {
      auto: true,
      timeout: 270_000,
    },
  ],
});

export { expect };
