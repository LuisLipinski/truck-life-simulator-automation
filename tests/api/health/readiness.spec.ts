import { expect, test } from '@playwright/test';

test.describe('API readiness @api @smoke @p0', () => {
  test('AUTO-002 | E2E-01 | readiness deve responder UP', async ({ request }) => {
    const response = await request.get('/actuator/health/readiness');

    expect(response.status(), 'readiness deve responder HTTP 200').toBe(200);

    const body = (await response.json()) as { status?: string };

    expect(body.status, 'readiness deve informar status UP').toBe('UP');
  });
});
