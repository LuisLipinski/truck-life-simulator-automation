import { expect, test } from '../../../fixtures/api-test.js';
import { ApiClient } from '../../../helpers/api-client.js';
import { expectProblemDetails } from '../../../helpers/problem-details.js';
import {
  uniqueTestEmail,
  validTestPassword,
} from '../../../helpers/test-data-factory.js';

const liveLoginEnabled = process.env.RUN_LOGIN_RATE_LIMITED_TESTS === 'true';

test.describe('Login live negative @api @login @p0 @rate-limited-live', () => {
  test.skip(
    !liveLoginEnabled,
    'Defina RUN_LOGIN_RATE_LIMITED_TESTS=true somente quando uma tentativa de login no ambiente estiver autorizada.',
  );

  test('QA-LOG-003 | e-mail inexistente deve retornar INVALID_CREDENTIALS sem criar sessão', async ({
    request,
  }) => {
    const api = new ApiClient(request);
    const response = await api.postJson('/api/v1/auth/login', {
      email: uniqueTestEmail('qa.login.missing'),
      password: validTestPassword(),
    });

    const problem = await expectProblemDetails(
      api,
      response,
      401,
      'INVALID_CREDENTIALS',
    );

    expect(problem.title).toBe('Authentication failed');
    expect(problem.detail).toBe('Invalid e-mail or password');
    expect(response.headers()['set-cookie']).toBeUndefined();
    expect(response.headers()['www-authenticate']).toBeUndefined();
  });
});
