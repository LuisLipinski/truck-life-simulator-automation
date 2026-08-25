import { expect, test } from '../../../fixtures/api-test.js';
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

  test('QA-HTTP-004 | text/plain no login deve retornar Problem Details 415 sem criar sessão', async ({
    request,
  }) => {
    const api = new ApiClient(request);
    const response = await api.post('/api/v1/auth/login', {
      data: 'email=qa@example.com&password=not-used',
      headers: {
        'Content-Type': 'text/plain',
      },
    });

    await expectProblemDetails(api, response, 415, 'UNSUPPORTED_MEDIA_TYPE');
    expect(response.headers()['set-cookie']).toBeUndefined();
  });
});
