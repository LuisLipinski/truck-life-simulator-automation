import { expect, test } from '@playwright/test';

const identityRoutes = [
  '/api/v1/auth/register',
  '/api/v1/auth/verify-email',
  '/api/v1/auth/resend-verification',
  '/api/v1/auth/forgot-password',
  '/api/v1/auth/reset-password',
  '/api/v1/auth/csrf',
  '/api/v1/auth/login',
  '/api/v1/auth/refresh',
  '/api/v1/auth/logout',
  '/api/v1/me',
] as const;

test.describe('API documentation @api @smoke @p1', () => {
  test('AUTO-017 | E2E-02 | OpenAPI deve estar acessível e documentar a P2', async ({
    request,
  }) => {
    test.setTimeout(120_000);

    const response = await request.get('/v3/api-docs', {
      timeout: 90_000,
    });

    expect(response.status(), 'OpenAPI deve responder HTTP 200').toBe(200);
    expect(
      response.headers()['content-type'],
      'OpenAPI deve responder conteúdo JSON',
    ).toContain('application/json');

    const body = (await response.json()) as {
      openapi?: string;
      paths?: Record<string, unknown>;
    };

    expect(body.openapi, 'documento deve declarar a versão OpenAPI').toMatch(/^3\./);
    expect(body.paths, 'documento deve possuir paths').toBeDefined();

    for (const route of identityRoutes) {
      expect(body.paths, `OpenAPI deve documentar ${route}`).toHaveProperty(route);
    }
  });

  test('AUTO-018 | QA-API-003 | Swagger UI deve estar acessível', async ({ request }) => {
    test.setTimeout(120_000);

    const response = await request.get('/swagger-ui/index.html', {
      timeout: 90_000,
    });

    expect(response.status(), 'Swagger UI deve responder HTTP 200').toBe(200);
    expect(
      response.headers()['content-type'],
      'Swagger UI deve responder HTML',
    ).toContain('text/html');

    const html = await response.text();
    expect(html, 'HTML deve carregar a aplicação Swagger UI').toContain('Swagger UI');
  });
});
