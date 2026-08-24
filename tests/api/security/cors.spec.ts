import { expect, test } from '../../../fixtures/api-test.js';
import { ApiClient } from '../../../helpers/api-client.js';
import { frontendOrigin } from '../../../helpers/session-security.js';

const PREFLIGHT_PATH = '/api/v1/auth/refresh';

function preflightHeaders(
  origin: string,
  method = 'POST',
  requestedHeaders = 'X-CSRF-TOKEN',
): Record<string, string> {
  return {
    Origin: origin,
    'Access-Control-Request-Method': method,
    'Access-Control-Request-Headers': requestedHeaders,
  };
}

test.describe('CORS contract @api @cors @security @p0', () => {
  test('QA-CORS-001 | origem oficial deve receber preflight utilizável', async ({ request }) => {
    const api = new ApiClient(request);
    const response = await api.fetch(PREFLIGHT_PATH, {
      method: 'OPTIONS',
      headers: preflightHeaders(frontendOrigin),
    });

    expect(response.status()).toBe(200);
    expect(response.headers()['access-control-allow-origin']).toBe(frontendOrigin);
    expect(response.headers()['access-control-allow-credentials']).toBe('true');
    expect(response.headers()['access-control-allow-methods']).toContain('POST');
    expect(response.headers()['access-control-allow-headers']?.toLowerCase()).toContain(
      'x-csrf-token',
    );
  });

  test('QA-CORS-002 | origem não cadastrada deve ser bloqueada', async ({ request }) => {
    const api = new ApiClient(request);
    const response = await api.fetch(PREFLIGHT_PATH, {
      method: 'OPTIONS',
      headers: preflightHeaders('https://evil.example'),
    });

    expect(response.status()).toBe(403);
    expect(response.headers()['access-control-allow-origin']).toBeUndefined();
  });

  test('QA-CORS-003 | respostas com credenciais nunca devem liberar origem wildcard', async ({
    request,
  }) => {
    const api = new ApiClient(request);
    const response = await api.fetch(PREFLIGHT_PATH, {
      method: 'OPTIONS',
      headers: preflightHeaders(frontendOrigin),
    });

    expect(response.headers()['access-control-allow-origin']).not.toBe('*');
    expect(response.headers()['access-control-allow-origin']).toBe(frontendOrigin);
  });

  test('QA-CORS-004 | preflight de DELETE deve ser recusado', async ({ request }) => {
    const api = new ApiClient(request);
    const response = await api.fetch(PREFLIGHT_PATH, {
      method: 'OPTIONS',
      headers: preflightHeaders(frontendOrigin, 'DELETE'),
    });

    expect(response.status()).toBe(403);
    expect(response.headers()['access-control-allow-methods'] ?? '').not.toContain('DELETE');
  });

  test('QA-CORS-005 | header arbitrário não permitido deve ser recusado', async ({ request }) => {
    const api = new ApiClient(request);
    const response = await api.fetch(PREFLIGHT_PATH, {
      method: 'OPTIONS',
      headers: preflightHeaders(frontendOrigin, 'POST', 'X-Not-Allowed'),
    });

    expect(response.status()).toBe(403);
    expect(response.headers()['access-control-allow-headers'] ?? '').not.toContain(
      'X-Not-Allowed',
    );
  });
});
