import { expect, test } from '@playwright/test';
import { ApiClient } from '../../../helpers/api-client.js';
import { registrationData } from '../../../helpers/test-data-factory.js';

const liveRegistrationEnabled = process.env.RUN_RATE_LIMITED_TESTS === 'true';

test.describe('Registration live @api @registration @p0 @rate-limited-live', () => {
  test.skip(
    !liveRegistrationEnabled,
    'Defina RUN_RATE_LIMITED_TESTS=true somente quando a criação de conta no ambiente estiver autorizada.',
  );

  test('QA-REG-001 | cadastro válido deve ser aceito sem autenticar o usuário', async ({
    request,
  }) => {
    const api = new ApiClient(request);
    const payload = registrationData();

    const response = await api.postJson('/api/v1/auth/register', payload);

    expect(response.status(), 'cadastro válido deve responder HTTP 202').toBe(202);
    expect(
      api.correlationId(response),
      'resposta deve possuir X-Correlation-ID para rastreabilidade',
    ).toBeTruthy();
    expect(
      await api.bodyText(response),
      'cadastro aceito não deve devolver credenciais ou dados sensíveis',
    ).toBe('');
    expect(
      response.headers()['set-cookie'],
      'cadastro não deve criar sessão automaticamente',
    ).toBeUndefined();
  });
});
