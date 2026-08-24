# Truck Life Simulator — Test Automation

Repositório central de automação black-box do Truck Life Simulator.

## Objetivo

Cobrir API, frontend, E2E, regressão, acessibilidade e segurança automatizável sem substituir os testes unitários e de integração mantidos nos repositórios de backend e frontend.

## Stack

- Node.js 24 LTS
- Playwright Test 1.62.1
- TypeScript 7
- Oxlint 1.80.0 para lint estático
- Faker para dados de teste
- AJV para validação de contratos JSON
- axe-core para acessibilidade
- GitHub Actions para CI
- OWASP ZAP como camada DAST futura

## Ambientes padrão

- API: `https://truck-life-simulator-api.onrender.com`
- Frontend: `https://luislipinski.github.io/truck-life-simulator`

Os endereços podem ser sobrescritos por `API_BASE_URL` e `FRONTEND_BASE_URL` sem alteração do código.

## Proteção contra cold start do Render

Todos os testes de API usam a fixture-base `fixtures/api-test.ts`. Antes de cada cenário, ela consulta `GET /actuator/health/readiness` e só libera o teste quando a API responder HTTP 200 com `status: UP`.

A estratégia atual usa até 6 tentativas, com timeout de 20 segundos por chamada e intervalo de 5 segundos entre tentativas. Timeout, falha de conexão e respostas de indisponibilidade são tratados como ambiente ainda não pronto. Se o readiness não ficar saudável dentro do limite, o cenário falha como indisponibilidade do ambiente em vez de começar com a API dormindo.

Depois que o Render está acordado, o custo normal desse `beforeEach` é apenas uma chamada rápida de readiness. A checagem não altera as expectativas funcionais do cenário e não transforma respostas 4xx/5xx do endpoint sob teste em sucesso.

## Estrutura atual

```text
config/
  environment.ts
fixtures/
  api-test.ts
  authenticated-api.ts
helpers/
  api-client.ts
  api-readiness.ts
  problem-details.ts
  session-security.ts
  test-data-factory.ts
tests/
  api/
    account/
    auth/
    docs/
    health/
    observability/
    protocol/
    security/
.github/
  workflows/
```

As áreas de UI, E2E, acessibilidade e segurança serão ampliadas conforme o roadmap de automação evoluir.

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

## Qualidade estática

Lint:

```bash
npm run lint
```

Type check:

```bash
npm run typecheck
```

Gate completo de qualidade:

```bash
npm run quality
```

O lint usa Oxlint `1.80.0` com versão exata e `--deny-warnings`. O TypeScript é validado separadamente por `tsc --noEmit`.

## Execução

Smoke de API:

```bash
npm run test:smoke
```

API segura para o ambiente compartilhado, excluindo cenários que criam múltiplas contas, dependem de login real ou exigem ambiente isolado:

```bash
npm run test:api
```

Regressão segura de autenticação/sessão:

```bash
npm run test:auth:safe
```

Regressão segura de HTTP, CORS e observabilidade:

```bash
npm run test:api:protocol-safe
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

Login negativo real é opt-in:

```bash
RUN_LOGIN_RATE_LIMITED_TESTS=true npm run test:login:live-negative
```

Fluxo autenticado exige conta dedicada em variáveis de ambiente e opt-in explícito:

```bash
RUN_AUTHENTICATED_TESTS=true npm run test:auth:authenticated-live
```

Relatório HTML após uma execução:

```bash
npm run report
```

## Proteção contra rate limit

Os endpoints de identidade possuem rate limits no ambiente publicado. Por isso:

- `npm run test:api` exclui `@rate-limited-live`, `@isolated` e `@authenticated-live`;
- criação de conta real exige opt-in;
- login real exige opt-in;
- testes autenticados exigem opt-in e conta dedicada;
- testes com vários cadastros exigem ambiente isolado;
- nunca executar flood, stress ou tentativas de burlar os rate limits do Render compartilhado.

## Tags

Os testes são classificados por domínio e risco, por exemplo:

- `@smoke`
- `@regression`
- `@api`
- `@ui`
- `@e2e`
- `@security`
- `@registration`
- `@authenticated-live`
- `@rate-limited-live`
- `@isolated`
- `@p0`, `@p1`, `@p2`

## Cobertura atual

- `AUTO-002 | E2E-01`: readiness `200` + `status: UP`.
- `AUTO-017 | E2E-02`: OpenAPI 3.x e rotas da P2 publicadas.
- `AUTO-018 | QA-API-003`: Swagger UI acessível.
- validações negativas de cadastro P1.
- checks seguros de access token, CSRF, Origin e logout.
- `QA-HTTP-001/002/003`: 404/405 controlados; a automação encontrou respostas 500 e a correção foi feita no backend PR #19.
- `QA-HTTP-004`: media type inválido; a automação encontrou HTTP 500 e a correção foi feita no backend PR #18.
- `QA-CORS-001` a `005`: contrato CORS básico.
- `QA-OBS-003` a `006`: correlation ID.
- fixture autenticada preparada para login, `/me`, refresh/rotação e logout, com primeira execução ainda opt-in.

## CI

Os workflows usam Node.js 24.19.0, `npm ci` e TypeScript typecheck. O workflow `Code Quality` roda Oxlint + typecheck sem depender do Render.

As suítes funcionais publicam relatório Playwright/JUnit como artefato quando apropriado. No CI usamos apenas um worker inicialmente para evitar concorrência desnecessária contra o ambiente compartilhado do Render.

## Estratégia de branches

- `master`: linha estável;
- `development`: integração validável;
- `feature/*` / `chore/*`: implementação isolada antes do merge em `development`.

## Segurança

Nunca versionar senhas, JWTs, refresh tokens, tokens de verificação/reset, cookies ou chaves. Use variáveis de ambiente e secrets do GitHub quando forem necessários.

Testes destrutivos, flood, stress e DDoS não fazem parte desta suíte contra o ambiente compartilhado.
