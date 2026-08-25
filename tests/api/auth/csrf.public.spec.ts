import { expect, test } from '../../../fixtures/api-test.js';
import { ApiClient } from '../../../helpers/api-client.js';

type CsrfResponse = {
  token?: string;
  headerName?: string;
};

const csrfTokenPattern = /^[A-Za-z0-9_-]{43}$/;

test.describe('CSRF bootstrap @api @session @security @p0', () => {
  test('QA-SES-001 | CSRF deve retornar token, header e cookie seguros', async ({ request }) => {
    const api = new ApiClient(request);
    const response = await api.get('/api/v1/auth/csrf');

    expect(response.status()).toBe(200);
    expect(api.contentType(response)).toContain('application/json');
    expect(api.correlationId(response)).toBeTruthy();
    expect(response.headers()['cache-control']).toContain('no-store');
    expect(response.headers()['pragma']).toContain('no-cache');

    const body = await api.json<CsrfResponse>(response);
    expect(body.token).toMatch(csrfTokenPattern);
    expect(body.headerName).toBe('X-CSRF-TOKEN');

    const setCookie = response.headers()['set-cookie'] ?? '';
    expect(setCookie).toContain('TLS_CSRF_TOKEN=');
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('Secure');
    expect(setCookie).toContain('SameSite=None');
    expect(setCookie).toContain('Path=/api/v1/auth');
    expect(setCookie).toContain(body.token ?? '__missing-token__');
  });
});
