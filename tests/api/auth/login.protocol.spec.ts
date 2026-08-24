import { expect, test } from '@playwright/test';
import { ApiClient } from '../../../helpers/api-client.js';
import { expectProblemDetails } from '../../../helpers/problem-details.js';

test.describe('Login protocol validation @api @login @security @p1', () => {
  test('QA-LOG-013 | JSON malformado deve retornar erro controlado antes da autenticação', async ({
    request,
  }) => {
    const api = new ApiClient(request);
    const response = await api.post('/api/v1/auth/login', {
      data: '{"email":',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    await expectProblemDetails(api, response, 400, 'MALFORMED_REQUEST');
    expect(response.headers()['set-cookie']).toBeUndefined();
  });

  test('QA-HTTP-004 | text/plain no login deve ser rejeitado sem criar sessão', async ({
    request,
  }) => {
    const api = new ApiClient(request);
    const response = await api.post('/api/v1/auth/login', {
      data: 'email=qa@example.com&password=not-used',
      headers: {
        'Content-Type': 'text/plain',
      },
    });

    expect(response.status()).toBe(415);
    expect(api.correlationId(response)).toBeTruthy();
    expect(response.headers()['set-cookie']).toBeUndefined();

    const body = await api.bodyText(response);
    expect(body).not.toContain('java.');
    expect(body).not.toContain('org.springframework');
  });
});
