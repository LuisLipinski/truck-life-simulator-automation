import { expect, test } from '../../../fixtures/authenticated-api.js';

test.use({ trace: 'off' });
test.describe.configure({ retries: 0 });

type ProblemResponse = {
  code?: string;
};

test.describe('Authenticated session lifecycle @api @session @authenticated-live @rate-limited-live @p0', () => {
  test.skip(
    process.env.RUN_AUTHENTICATED_TESTS !== 'true',
    'Authenticated session tests require explicit opt-in',
  );

  test('QA-LOG-001 | QA-ME-001 | QA-SES-002/003 | QA-OUT-001 | ciclo autenticado deve funcionar', async ({
    authenticatedSession,
  }) => {
    await test.step('QA-LOG-001 + QA-ME-001 | login deve permitir consultar a própria conta', async () => {
      const response = await authenticatedSession.me();
      expect(response.status()).toBe(200);
      expect(response.headers()['cache-control']).toContain('no-store');

      const account = await authenticatedSession.api.json<Record<string, unknown>>(response);
      expect(account).toHaveProperty('id');
      expect(account).toHaveProperty('email');
      expect(account).toHaveProperty('displayName');
      expect(account).toHaveProperty('role');
      expect(account).toHaveProperty('status');
      expect(account).toHaveProperty('emailVerified', true);
      expect(account).toHaveProperty('createdAt');
      expect(account).toHaveProperty('lastLoginAt');
      expect(account).not.toHaveProperty('passwordHash');
      expect(account).not.toHaveProperty('refreshToken');
    });

    await test.step('QA-SES-002/003 | refresh deve emitir access token e rotacionar refresh cookie', async () => {
      const result = await authenticatedSession.refresh();
      expect(result.response.status()).toBe(200);
      expect(result.response.headers()['cache-control']).toContain('no-store');
      expect(result.rotated).toBe(true);

      const responseAfterRefresh = await authenticatedSession.me();
      expect(responseAfterRefresh.status()).toBe(200);
    });

    await test.step('QA-OUT-001 | logout deve encerrar a sessão e remover refresh cookie', async () => {
      const response = await authenticatedSession.logout();
      expect(response.status()).toBe(204);
      expect(await authenticatedSession.hasRefreshCookie()).toBe(false);
    });
  });

  test('QA-SES-004/005 | reuso deve revogar toda a família de refresh', async ({
    authenticatedSession,
  }) => {
    await test.step('preparar rotação mantendo os tokens somente em memória', async () => {
      const rotation = await authenticatedSession.refresh();
      expect(rotation.response.status()).toBe(200);
      expect(rotation.rotated).toBe(true);
    });

    await test.step('QA-SES-004 | reutilizar refresh substituído deve detectar reuso', async () => {
      const response = await authenticatedSession.reusePreviousRefresh();
      expect(response.status()).toBe(401);

      const problem = await authenticatedSession.api.json<ProblemResponse>(response);
      expect(problem.code).toBe('REFRESH_TOKEN_REUSED');
    });

    await test.step('QA-SES-005 | refresh mais novo também deve falhar após revogação da família', async () => {
      const response = await authenticatedSession.refreshCurrentAfterReuse();
      expect(response.status()).toBe(401);

      const problem = await authenticatedSession.api.json<ProblemResponse>(response);
      expect(problem.code).toBe('REFRESH_TOKEN_INVALID');
    });
  });
});
