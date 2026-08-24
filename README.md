# Truck Life Simulator — Test Automation

Repositório central de automação black-box do Truck Life Simulator.

## Objetivo

Cobrir API, frontend, E2E, regressão, acessibilidade e segurança automatizável sem substituir os testes unitários e de integração mantidos nos repositórios de backend e frontend.

## Stack

- Node.js 24 LTS
- Playwright Test 1.62.1
- TypeScript 7
- Faker para dados de teste
- AJV para validação de contratos JSON
- axe-core para acessibilidade
- GitHub Actions para CI
- OWASP ZAP como camada DAST futura

## Ambientes padrão

- API: `https://truck-life-simulator-api.onrender.com`
- Frontend: `https://luislipinski.github.io/truck-life-simulator`

Os endereços podem ser sobrescritos por `API_BASE_URL` e `FRONTEND_BASE_URL` sem alteração do código.

## Estrutura atual

```text
config/
  environment.ts
helpers/
  api-client.ts
  test-data-factory.ts
tests/
  api/
    auth/
      registration.validation.spec.ts
      registration.live.spec.ts
      registration.isolated.spec.ts
    docs/
      openapi.spec.ts
    health/
      readiness.spec.ts
.github/
  workflows/
    smoke.yml
    registration-api.yml
```

As áreas de UI, E2E, fixtures de autenticação, schemas, acessibilidade e segurança serão adicionadas conforme o roadmap de automação evoluir.

## Instalação local

Requer Node.js 24 LTS.

Para reproduzir exatamente as dependências versionadas:

```bash
npm ci
```

Use `npm install` apenas quando for necessário adicionar ou atualizar dependências e atualizar o `package-lock.json`.

Para testes UI, instale os navegadores quando começarmos essa camada:

```bash
npx playwright install --with-deps
```

## Execução

Smoke de API:

```bash
npm run test:smoke
```

API segura para o ambiente compartilhado, excluindo cenários que criam múltiplas contas ou dependem de rate limit controlado:

```bash
npm run test:api
```

Validações negativas de cadastro:

```bash
npm run test:registration:validation
```

Cadastro real no ambiente selecionado é **opt-in**:

```bash
RUN_RATE_LIMITED_TESTS=true npm run test:registration:live
```

A suíte completa de limites válidos, duplicidade e concorrência só deve ser executada em ambiente isolado:

```bash
RUN_ISOLATED_REGISTRATION_TESTS=true npm run test:registration:isolated
```

Type check:

```bash
npm run typecheck
```

Relatório HTML após uma execução:

```bash
npm run report
```

## Proteção contra rate limit

O endpoint `POST /api/v1/auth/register` possui proteção de rate limit no ambiente publicado. Por isso:

- `npm run test:api` exclui `@rate-limited-live` e `@isolated`;
- o happy path que cria uma conta exige `RUN_RATE_LIMITED_TESTS=true`;
- testes com vários cadastros exigem `RUN_ISOLATED_REGISTRATION_TESTS=true`;
- o workflow `Registration API Regression` exige confirmação explícita antes de criar uma conta real;
- nunca executar flood, stress ou tentativas de burlar o rate limit do Render compartilhado.

## Tags

Os testes são classificados por domínio e risco, por exemplo:

- `@smoke`
- `@regression`
- `@api`
- `@ui`
- `@e2e`
- `@security`
- `@registration`
- `@rate-limited-live`
- `@isolated`
- `@p0`, `@p1`, `@p2`

## Cobertura atual

- `AUTO-002 | E2E-01`: readiness `200` + `status: UP`.
- `AUTO-017 | E2E-02`: OpenAPI 3.x e rotas da P2 publicadas.
- `AUTO-018 | QA-API-003`: Swagger UI acessível.
- `QA-REG-001`: cadastro válido, opt-in no ambiente publicado.
- `QA-REG-003`, `006`, `007`, `012`, `014`, `015`, `016`, `019`, `022`: validações negativas de cadastro automatizadas.
- `QA-REG-004`, `005`, `017`, `018`, `020`, `021`, `025`, `026`: automação preparada para ambiente isolado.

Os testes de readiness/Swagger aceitam até 90 segundos por requisição porque o Render pode estar em cold start, mas as expectativas funcionais continuam estritas.

## CI

O workflow `Smoke Tests` executa em PRs e pushes de `development` e `master` e também manualmente. Ele:

1. prepara Node.js 24.19.0;
2. instala exatamente as dependências do lockfile com `npm ci`;
3. executa o TypeScript type-check;
4. executa o smoke de API;
5. publica relatórios Playwright/JUnit como artefato.

O workflow `Registration API Regression` é manual. Ele sempre pode executar as validações negativas e só cria uma conta real se `confirm_live_account_creation` for marcado explicitamente.

No CI usamos apenas um worker inicialmente para evitar gerar concorrência desnecessária contra o ambiente compartilhado do Render.

## Estratégia de branches

- `master`: linha estável;
- `development`: integração validável;
- `feature/*`: implementação isolada antes do merge em `development`.

## Segurança

Nunca versionar senhas, JWTs, refresh tokens, tokens de verificação/reset, cookies ou chaves. Use variáveis de ambiente e secrets do GitHub quando forem necessários.

Testes destrutivos, flood, stress e DDoS não fazem parte desta suíte contra o ambiente compartilhado.
