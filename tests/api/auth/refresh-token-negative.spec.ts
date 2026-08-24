import { expect, test } from '../../../fixtures/api-test.js';
import { ApiClient } from '../../../helpers/api-client.js';
import { expectProblemDetails } from '../../../helpers/problem-details.js';
import {
  csrfHeaders,
  csrfToken,
  frontendOrigin,
} from '../../../helpers/session-security.js';

function refreshHeaders(refreshToken?: string): Record<string, string> {
  const csrf = csrfToken();
  const headers = csrfHeaders(csrf);
  if (!refreshToken) return headers;

  return {
    ...headers,
    Origin: frontendOrigin,
    Cookie: `${headers.Cookie}; TLS_REFRESH_TOKEN=${refreshToken}`,
  };
}

function expectRefreshCookieCleared(response: Awaited<ReturnType<ApiClient['post']>>): void {
  const setCookies = response
    .headersArray()
    .filter((header) => header.name.toLowerCase() === 'set-cookie')
    .map((header) => header.value);

  expect(
    setCookies.some(
      (cookie) => cookie.startsWith('TLS_REFRESH_TOKEN=') && cookie.includes('Max-Age=0'),
    ),
    'refresh inválido/ausente deve limpar o refresh cookie',
  ).toBe(true);
}

test.describe('Refresh token validation @api @session @security @p0', () => {
  test('QA-SES-006 | refresh sem cookie deve retornar REFRESH_TOKEN_REQUIRED', async ({
    request,
  }) => {
    const api = new ApiClient(request);
    const response = await api.post('/api/v1/auth/refresh', {
      headers: refreshHeaders(),
    });

    await expectProblemDetails(api, response, 401, 'REFRESH_TOKEN_REQUIRED');
    expectRefreshCookieCleared(response);
  });

  test('QA-SES-007 | refresh com cookie em formato inválido deve retornar REFRESH_TOKEN_INVALID', async ({
    request,
  }) => {
    const api = new ApiClient(request);
    const response = await api.post('/api/v1/auth/refresh', {
      headers: refreshHeaders('invalid-refresh-token'),
    });

    await expectProblemDetails(api, response, 401, 'REFRESH_TOKEN_INVALID');
    expectRefreshCookieCleared(response);
  });

  test('QA-SES-007 | refresh aleatório com formato válido deve retornar REFRESH_TOKEN_INVALID', async ({
    request,
  }) => {
    const api = new ApiClient(request);
    const response = await api.post('/api/v1/auth/refresh', {
      headers: refreshHeaders(csrfToken()),
    });

    await expectProblemDetails(api, response, 401, 'REFRESH_TOKEN_INVALID');
    expectRefreshCookieCleared(response);
  });
});
