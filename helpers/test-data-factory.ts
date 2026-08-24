import { faker } from '@faker-js/faker';

export interface RegistrationData {
  email: string;
  displayName: string;
  password: string;
}

const DEFAULT_TEST_EMAIL_DOMAIN = 'example.com';

function testEmailDomain(): string {
  const configured = process.env.TEST_EMAIL_DOMAIN?.trim();
  return configured || DEFAULT_TEST_EMAIL_DOMAIN;
}

export function uniqueTestEmail(prefix = 'qa.trucklife'): string {
  const uniqueId = faker.string.alphanumeric({ length: 12, casing: 'lower' });
  return `${prefix}+${Date.now()}-${uniqueId}@${testEmailDomain()}`;
}

export function validTestPassword(): string {
  return `Tls-${faker.string.alphanumeric({ length: 18 })}-9a`;
}

export function registrationData(
  overrides: Partial<RegistrationData> = {},
): RegistrationData {
  return {
    email: uniqueTestEmail(),
    displayName: `QA Driver ${faker.person.firstName()}`,
    password: validTestPassword(),
    ...overrides,
  };
}

export function repeatedCharacter(length: number, character = 'a'): string {
  return character.repeat(length);
}
