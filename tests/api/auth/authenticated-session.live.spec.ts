import { randomUUID } from 'node:crypto';
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

  test('QA-PWD-001/002/003 | alteração autenticada deve manter access atual e revogar refresh', async ({
    authenticatedSession,
  }) => {
    const temporaryPassword = `Tls-Temporary-${randomUUID()}`;
    let passwordChanged = false;

    try {
      await test.step('senha atual incorreta deve ser rejeitada sem alterar a conta', async () => {
        const response = await authenticatedSession.restoreConfiguredPassword(
          'wrong current password 2026',
        );
        expect(response.status()).toBe(400);
        const problem = await authenticatedSession.api.json<ProblemResponse>(response);
        expect(problem.code).toBe('CURRENT_PASSWORD_INVALID');
      });

      await test.step('nova senha fora da política deve ser rejeitada', async () => {
        const response = await authenticatedSession.changePasswordFromConfiguredPassword('short');
        expect(response.status()).toBe(400);
        const problem = await authenticatedSession.api.json<ProblemResponse>(response);
        expect(problem.code).toBe('VALIDATION_FAILED');
      });

      await test.step('troca válida deve manter o access token atual utilizável', async () => {
        const response = await authenticatedSession.changePasswordFromConfiguredPassword(
          temporaryPassword,
        );
        passwordChanged = response.status() === 204;
        expect(response.status()).toBe(204);
        expect(response.headers()['cache-control']).toContain('no-store');

        const meResponse = await authenticatedSession.me();
        expect(meResponse.status()).toBe(200);
      });

      await test.step('refresh da sessão deve falhar após a troca de senha', async () => {
        const refresh = await authenticatedSession.refresh();
        expect(refresh.response.status()).toBe(401);
        const problem = await authenticatedSession.api.json<ProblemResponse>(refresh.response);
        expect(problem.code).toBe('REFRESH_TOKEN_INVALID');
      });

      await test.step('senha configurada antiga deve falhar e a temporária deve autenticar', async () => {
        const oldPasswordLogin = await authenticatedSession.loginWithConfiguredPassword();
        expect(oldPasswordLogin.status()).toBe(401);
        const oldPasswordProblem = await authenticatedSession.api.json<ProblemResponse>(oldPasswordLogin);
        expect(oldPasswordProblem.code).toBe('INVALID_CREDENTIALS');

        const newPasswordLogin = await authenticatedSession.loginWithPassword(temporaryPassword);
        expect(newPasswordLogin.status()).toBe(200);
      });
    } finally {
      if (passwordChanged) {
        const restore = await authenticatedSession.restoreConfiguredPassword(temporaryPassword);
        expect(restore.status()).toBe(204);

        const restoredLogin = await authenticatedSession.loginWithConfiguredPassword();
        expect(restoredLogin.status()).toBe(200);
      }
    }
  });
});
