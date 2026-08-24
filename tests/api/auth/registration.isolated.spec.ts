import { expect, test } from '../../../fixtures/api-test.js';
import { ApiClient } from '../../../helpers/api-client.js';
import {
  registrationData,
  repeatedCharacter,
} from '../../../helpers/test-data-factory.js';

const isolatedRegistrationEnabled =
  process.env.RUN_ISOLATED_REGISTRATION_TESTS === 'true';

test.describe('Registration isolated @api @registration @isolated', () => {
  test.skip(
    !isolatedRegistrationEnabled,
    'Execute somente em ambiente isolado com capacidade para múltiplos cadastros e rate limit controlado.',
  );

  const acceptedBoundaryCases = [
    {
      id: 'QA-REG-004',
      title: 'nome com exatamente 2 caracteres deve ser aceito',
      payload: registrationData({ displayName: 'QA' }),
    },
    {
      id: 'QA-REG-005',
      title: 'nome com exatamente 120 caracteres deve ser aceito',
      payload: registrationData({ displayName: repeatedCharacter(120) }),
    },
    {
      id: 'QA-REG-017',
      title: 'senha com exatamente 12 caracteres deve ser aceita',
      payload: registrationData({ password: '123456789012' }),
    },
    {
      id: 'QA-REG-018',
      title: 'senha com exatamente 128 caracteres deve ser aceita',
      payload: registrationData({ password: repeatedCharacter(128, 'p') }),
    },
    {
      id: 'QA-REG-020',
      title: 'senha Unicode com 12 code points deve ser aceita',
      payload: registrationData({ password: '🚚'.repeat(12) }),
    },
    {
      id: 'QA-REG-021',
      title: 'senha com espaços internos deve ser aceita sem alteração silenciosa',
      payload: registrationData({ password: 'senha com espaco interno 123' }),
    },
  ] as const;

  for (const boundaryCase of acceptedBoundaryCases) {
    test(`${boundaryCase.id} | ${boundaryCase.title}`, async ({ request }) => {
      const api = new ApiClient(request);
      const response = await api.postJson(
        '/api/v1/auth/register',
        boundaryCase.payload,
      );

      expect(response.status()).toBe(202);
    });
  }

  test('QA-REG-026 | cadastro repetido deve manter resposta neutra', async ({ request }) => {
    const api = new ApiClient(request);
    const payload = registrationData();

    const firstResponse = await api.postJson('/api/v1/auth/register', payload);
    const secondResponse = await api.postJson('/api/v1/auth/register', payload);

    expect(firstResponse.status()).toBe(202);
    expect(secondResponse.status()).toBe(202);
    expect(await firstResponse.body()).toHaveLength(0);
    expect(await secondResponse.body()).toHaveLength(0);
  });

  test('QA-REG-025 | cadastros concorrentes do mesmo e-mail não devem gerar 500', async ({
    request,
  }) => {
    const api = new ApiClient(request);
    const payload = registrationData();

    const [firstResponse, secondResponse] = await Promise.all([
      api.postJson('/api/v1/auth/register', payload),
      api.postJson('/api/v1/auth/register', payload),
    ]);

    expect(firstResponse.status()).toBe(202);
    expect(secondResponse.status()).toBe(202);
  });
});
