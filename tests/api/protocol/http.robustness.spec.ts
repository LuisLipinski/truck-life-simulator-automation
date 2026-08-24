import { expect, test } from '@playwright/test';
import { ApiClient } from '../../../helpers/api-client.js';

async function expectControlledError(
  api: ApiClient,
  responseStatus: number,
  body: string,
  correlationId: string | undefined,
  expectedStatus: number,
): Promise<void> {
  expect(responseStatus).toBe(expectedStatus);
  expect(correlationId).toBeTruthy();
  expect(body).not.toContain('java.');
  expect(body).not.toContain('org.springframework');
  expect(body).not.toContain('Exception');
  expect(body).not.toContain('stackTrace');
  expect(body).not.toContain('/home/');
  expect(api).toBeTruthy();
}

test.describe('HTTP protocol robustness @api @protocol @security @p1', () => {
  test('QA-HTTP-001 | rota API inexistente deve retornar 404 controlado', async ({ request }) => {
    const api = new ApiClient(request);
    const response = await api.get('/api/v1/route-that-does-not-exist');
    const body = await api.bodyText(response);

    await expectControlledError(
      api,
      response.status(),
      body,
      api.correlationId(response),
      404,
    );
  });

  test('QA-HTTP-002 | GET em endpoint somente POST deve retornar 405 controlado', async ({ request }) => {
    const api = new ApiClient(request);
    const response = await api.get('/api/v1/auth/login');
    const body = await api.bodyText(response);

    await expectControlledError(
      api,
      response.status(),
      body,
      api.correlationId(response),
      405,
    );
  });

  for (const method of ['PUT', 'PATCH', 'DELETE']) {
    test(`QA-HTTP-003 | ${method} em login deve retornar 405 controlado`, async ({ request }) => {
      const api = new ApiClient(request);
      const response = await api.fetch('/api/v1/auth/login', { method });
      const body = await api.bodyText(response);

      await expectControlledError(
        api,
        response.status(),
        body,
        api.correlationId(response),
        405,
      );
    });
  }
});
