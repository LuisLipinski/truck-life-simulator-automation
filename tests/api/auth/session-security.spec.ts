import { expect, test } from '../../../fixtures/api-test.js';
import { ApiClient } from '../../../helpers/api-client.js';
import { expectProblemDetails } from '../../../helpers/problem-details.js';
import {
  csrfHeaders,
  csrfToken,
  frontendOrigin,
} from '../../../helpers/session-security.js';

const attackerOrigin = 'https://attacker.invalid';

test.describe('Refresh Origin and CSRF protection @api @session @security @p0', () => {
  test('QA-SES-011 | refresh sem Origin deve ser bloqueado', async ({ request }) => {
    const api = new ApiClient(request);
    const response = await api.post('/api/v1/auth/refresh');

    await expectProblemDetails(api, response, 403, 'ORIGIN_NOT_ALLOWED');
    expect(response.headers()['set-cookie']).toBeUndefined();
  });

  test('QA-SES-012 | refresh com Origin não autorizado deve ser bloqueado', async ({
    request,
  }) => {
    const api = new ApiClient(request);
    const response = await api.post('/api/v1/auth/refresh', {
      headers: { Origin: attackerOrigin },
    });

    await expectProblemDetails(api, response, 403, 'ORIGIN_NOT_ALLOWED');
    expect(response.headers()['access-control-allow-origin']).toBeUndefined();
  });

  test('QA-SES-008 | refresh com Origin permitido e sem header CSRF deve falhar', async ({
    request,
  }) => {
    const api = new ApiClient(request);
    const response = await api.post('/api/v1/auth/refresh', {
      headers: { Origin: frontendOrigin },
    });

    await expectProblemDetails(api, response, 403, 'CSRF_TOKEN_INVALID');
    expect(response.headers()['access-control-allow-origin']).toBe(frontendOrigin);
    expect(response.headers()['access-control-allow-credentials']).toBe('true');
  });

  test('QA-SES-009 | refresh com header CSRF válido mas sem cookie deve falhar', async ({
    request,
  }) => {
    const api = new ApiClient(request);
    const response = await api.post('/api/v1/auth/refresh', {
      headers: {
        Origin: frontendOrigin,
        'X-CSRF-TOKEN': csrfToken(),
      },
    });

    await expectProblemDetails(api, response, 403, 'CSRF_TOKEN_INVALID');
  });

  test('QA-SES-010 | refresh com cookie e header CSRF diferentes deve falhar', async ({
    request,
  }) => {
    const api = new ApiClient(request);
    const response = await api.post('/api/v1/auth/refresh', {
      headers: csrfHeaders(csrfToken(), csrfToken()),
    });

    await expectProblemDetails(api, response, 403, 'CSRF_TOKEN_INVALID');
  });
});

test.describe('Logout Origin and CSRF protection @api @session @security @p0', () => {
  test('QA-OUT-005 | logout sem Origin deve ser bloqueado', async ({ request }) => {
    const api = new ApiClient(request);
    const response = await api.post('/api/v1/auth/logout');

    await expectProblemDetails(api, response, 403, 'ORIGIN_NOT_ALLOWED');
  });

  test('QA-OUT-005 | logout com Origin não autorizado deve ser bloqueado', async ({
    request,
  }) => {
    const api = new ApiClient(request);
    const response = await api.post('/api/v1/auth/logout', {
      headers: { Origin: attackerOrigin },
    });

    await expectProblemDetails(api, response, 403, 'ORIGIN_NOT_ALLOWED');
  });

  test('QA-OUT-005 | logout com Origin permitido mas sem CSRF deve ser bloqueado', async ({
    request,
  }) => {
    const api = new ApiClient(request);
    const response = await api.post('/api/v1/auth/logout', {
      headers: { Origin: frontendOrigin },
    });

    await expectProblemDetails(api, response, 403, 'CSRF_TOKEN_INVALID');
  });

  test('QA-OUT-005 | logout com CSRF divergente deve ser bloqueado', async ({ request }) => {
    const api = new ApiClient(request);
    const response = await api.post('/api/v1/auth/logout', {
      headers: csrfHeaders(csrfToken(), csrfToken()),
    });

    await expectProblemDetails(api, response, 403, 'CSRF_TOKEN_INVALID');
  });

  test('QA-OUT-004 | logout sem refresh mas com Origin/CSRF válidos deve ser idempotente', async ({
    request,
  }) => {
    const api = new ApiClient(request);
    const token = csrfToken();
    const response = await api.post('/api/v1/auth/logout', {
      headers: csrfHeaders(token),
    });

    expect(response.status()).toBe(204);
    expect(api.correlationId(response)).toBeTruthy();

    const setCookies = response
      .headersArray()
      .filter((header) => header.name.toLowerCase() === 'set-cookie')
      .map((header) => header.value);

    expect(setCookies.some((cookie) => cookie.startsWith('TLS_REFRESH_TOKEN='))).toBe(true);
    expect(setCookies.some((cookie) => cookie.startsWith('TLS_CSRF_TOKEN='))).toBe(true);
    expect(setCookies.every((cookie) => cookie.includes('Max-Age=0'))).toBe(true);
  });
});
