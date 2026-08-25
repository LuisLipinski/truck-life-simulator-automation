import { expect, test } from '../../../fixtures/api-test.js';
import { ApiClient } from '../../../helpers/api-client.js';
import { expectProblemDetails } from '../../../helpers/problem-details.js';
import {
  repeatedCharacter,
  validTestPassword,
} from '../../../helpers/test-data-factory.js';

const isolatedLoginEnabled = process.env.RUN_ISOLATED_LOGIN_TESTS === 'true';

test.describe('Login isolated @api @login @isolated', () => {
  test.skip(
    !isolatedLoginEnabled,
    'Execute somente em ambiente isolado com rate limit de login controlado.',
  );

  const cases = [
    {
      id: 'QA-LOG-009',
      title: 'e-mail vazio',
      payload: { email: '', password: validTestPassword() },
    },
    {
      id: 'QA-LOG-010',
      title: 'senha null',
      payload: { email: 'missing@example.com', password: null },
    },
    {
      id: 'QA-LOG-011',
      title: 'e-mail acima de 320 caracteres',
      payload: {
        email: `${repeatedCharacter(310)}@example.com`,
        password: validTestPassword(),
      },
    },
    {
      id: 'QA-LOG-012',
      title: 'senha acima de 128 caracteres',
      payload: {
        email: 'missing@example.com',
        password: repeatedCharacter(129, 'p'),
      },
    },
  ] as const;

  for (const scenario of cases) {
    test(`${scenario.id} | ${scenario.title} deve retornar 401 seguro`, async ({ request }) => {
      const api = new ApiClient(request);
      const response = await api.postJson('/api/v1/auth/login', scenario.payload);

      await expectProblemDetails(api, response, 401, 'INVALID_CREDENTIALS');
      expect(response.headers()['set-cookie']).toBeUndefined();
    });
  }
});
