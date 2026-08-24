import { expect, test } from '@playwright/test';
import { ApiClient } from '../../../helpers/api-client.js';
import {
  registrationData,
  repeatedCharacter,
} from '../../../helpers/test-data-factory.js';

type InvalidRegistrationCase = {
  id: string;
  title: string;
  payload: Record<string, unknown>;
  sensitiveValue?: string;
};

const invalidCases: InvalidRegistrationCase[] = [
  {
    id: 'QA-REG-003',
    title: 'nome com 1 caractere deve ser rejeitado',
    payload: registrationData({ displayName: 'A' }),
  },
  {
    id: 'QA-REG-006',
    title: 'nome com 121 caracteres deve ser rejeitado',
    payload: registrationData({ displayName: repeatedCharacter(121) }),
  },
  {
    id: 'QA-REG-007',
    title: 'nome somente com espaços deve ser rejeitado',
    payload: registrationData({ displayName: '   ' }),
  },
  {
    id: 'QA-REG-012',
    title: 'e-mail sem arroba deve ser rejeitado',
    payload: registrationData({ email: 'motorista.exemplo.com' }),
  },
  {
    id: 'QA-REG-014',
    title: 'e-mail acima de 320 caracteres deve ser rejeitado',
    payload: registrationData({
      email: `${repeatedCharacter(309)}@example.com`,
    }),
  },
  {
    id: 'QA-REG-015',
    title: 'e-mail somente com espaços deve ser rejeitado',
    payload: registrationData({ email: '   ' }),
  },
  {
    id: 'QA-REG-016',
    title: 'senha com 11 caracteres deve ser rejeitada',
    payload: registrationData({ password: 'a'.repeat(11) }),
    sensitiveValue: 'a'.repeat(11),
  },
  {
    id: 'QA-REG-019',
    title: 'senha com 129 caracteres deve ser rejeitada',
    payload: registrationData({ password: 'a'.repeat(129) }),
    sensitiveValue: 'a'.repeat(129),
  },
  {
    id: 'QA-REG-022',
    title: 'senha null deve ser rejeitada',
    payload: {
      ...registrationData(),
      password: null,
    },
  },
];

test.describe('Registration validation @api @registration @p1', () => {
  for (const invalidCase of invalidCases) {
    test(`${invalidCase.id} | ${invalidCase.title}`, async ({ request }) => {
      const api = new ApiClient(request);
      const response = await api.postJson(
        '/api/v1/auth/register',
        invalidCase.payload,
      );

      expect(response.status(), 'cadastro inválido deve responder HTTP 400').toBe(400);
      expect(
        api.contentType(response),
        'erro de validação deve usar Problem Details JSON',
      ).toContain('application/problem+json');
      expect(
        api.correlationId(response),
        'resposta deve possuir X-Correlation-ID',
      ).toBeTruthy();

      const body = await api.bodyText(response);
      expect(body, 'erro não deve vazar stack trace Java').not.toContain('java.');
      expect(body, 'erro não deve vazar stack trace Spring').not.toContain('org.springframework');

      if (invalidCase.sensitiveValue) {
        expect(body, 'erro não deve ecoar a senha enviada').not.toContain(
          invalidCase.sensitiveValue,
        );
      }
    });
  }
});
