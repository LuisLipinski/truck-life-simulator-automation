import { expect, test } from '@playwright/test';
import { ApiClient } from '../../../helpers/api-client.js';
import { expectProblemDetails } from '../../../helpers/problem-details.js';

test.describe('My Account authentication @api @account @security @p0', () => {
  test('QA-ME-002 | sem Authorization deve exigir autenticação Bearer', async ({ request }) => {
    const api = new ApiClient(request);
    const response = await api.get('/api/v1/me');

    await expectProblemDetails(
      api,
      response,
      401,
      'AUTHENTICATION_REQUIRED',
    );
    expect(response.headers()['www-authenticate']).toBe('Bearer');
  });

  for (const scheme of ['Basic', 'Token']) {
    test(`QA-ME-003 | esquema ${scheme} deve ser rejeitado`, async ({ request }) => {
      const api = new ApiClient(request);
      const response = await api.get('/api/v1/me', {
        headers: {
          Authorization: `${scheme} abc123`,
        },
      });

      await expectProblemDetails(api, response, 401, 'ACCESS_TOKEN_INVALID');
      expect(response.headers()['www-authenticate']).toBe('Bearer');
    });
  }

  for (const token of ['not-a-jwt', 'abc.def', 'abc.def.ghi']) {
    test(`QA-ME-004 | Bearer inválido (${token.length} chars) deve retornar 401 controlado`, async ({
      request,
    }) => {
      const api = new ApiClient(request);
      const response = await api.get('/api/v1/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      await expectProblemDetails(api, response, 401, 'ACCESS_TOKEN_INVALID');
      expect(response.headers()['www-authenticate']).toBe('Bearer');
    });
  }
});
