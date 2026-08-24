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

## Estrutura atual

```text
config/
  environment.ts
helpers/
  api-client.ts
  problem-details.ts
  session-security.ts
  test-data-factory.ts
tests/
  api/
    account/
      me.negative.spec.ts
    auth/
      csrf.public.spec.ts
      login.protocol.spec.ts
      login.live-negative.spec.ts
      login.isolated.spec.ts
      registration.validation.spec.ts
      registration.live.spec.ts
      registration.isolated.spec.ts
      session-security.spec.ts
    docs/
      openapi.spec.ts
    health/
      readiness.spec.ts
.github/
  workflows/
    auth-api.yml
    quality.yml
    registration-api.yml
    smoke.yml
```

As áreas de UI, E2E, fixtures de autenticação, schemas e novas camadas de segurança serão adicionadas conforme o roadmap de automação evoluir.

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

O script usa `oxlint@1.80.0` com versão exata e `--deny-warnings`; qualquer warning ou erro faz o gate falhar.

Type check:

```bash
npm run typecheck
```

Lint + typecheck:

```bash
npm run quality
```

O lint e o typecheck são mantidos como verificações separadas: Oxlint analisa regras estáticas de JavaScript/TypeScript e o TypeScript continua sendo a fonte de verdade para validação de tipos com `tsc --noEmit`.

## Execução

Smoke de API:

```bash
npm run test:smoke
```

API segura para o ambiente compartilhado, excluindo cenários que criam múltiplas contas ou dependem de rate limit controlado:

```bash
npm run test:api
```

Regressão segura de autenticação, Minha Conta, Origin e CSRF:

```bash
npm run test:auth:safe
```

Validações negativas de cadastro:

```bash
npm run test:registration:validation
```

Cadastro real no ambiente selecionado é **opt-in**:

```bash
RUN_RATE_LIMITED_TESTS=true npm run test:registration:live
```

Uma tentativa real de login inválido também é **opt-in** para não consumir o rate limit automaticamente:

```bash
RUN_RATE_LIMITED_TESTS=true npm run test:login:live-negative
```

As suítes de limites/concorrência que exigem ambiente isolado possuem scripts próprios e não entram na regressão segura padrão.

Relatório HTML após uma execução:

```bash
npm run report
```

## Proteção contra rate limit

Os endpoints de identidade possuem proteções de rate limit no ambiente publicado. Por isso:

- `npm run test:api` exclui `@rate-limited-live` e `@isolated`;
- o happy path que cria uma conta exige `RUN_RATE_LIMITED_TESTS=true`;
- a tentativa real de login inválido exige opt-in explícito;
- testes com vários cadastros ou limites extensos exigem ambiente isolado;
- os workflows que podem consumir limites mantêm as operações opt-in separadas da regressão automática;
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
- `@session`
- `@rate-limited-live`
- `@isolated`
- `@p0`, `@p1`, `@p2`

## Cobertura atual

- `AUTO-002 | E2E-01`: readiness `200` + `status: UP`.
- `AUTO-017 | E2E-02`: OpenAPI 3.x e rotas da P2 publicadas.
- `AUTO-018 | QA-API-003`: Swagger UI acessível.
- `QA-REG-001`: cadastro válido, opt-in no ambiente publicado.
- `QA-REG-003`, `006`, `007`, `012`, `014`, `015`, `016`, `019`, `022`: validações negativas de cadastro automatizadas e executadas.
- `QA-REG-004`, `005`, `017`, `018`, `020`, `021`, `025`, `026`: automação preparada para ambiente isolado.
- `QA-ME-002`, `003`, `004`: autenticação negativa de `/me`.
- `QA-SES-001`: emissão e propriedades do CSRF público.
- `QA-SES-008`, `009`, `010`, `011`, `012`: barreiras de CSRF/Origin do refresh.
- `QA-OUT-004`, `005`: idempotência e barreiras de CSRF/Origin do logout.
- `QA-HTTP-004`: media type inválido no login; este teste encontrou um defeito real de HTTP 500 e confirmou a correção para 415 após o deploy.

Os testes de readiness/Swagger aceitam timeout maior porque o Render pode estar em cold start. As demais regressões mantêm expectativas funcionais estritas e retries controlados no CI.

## CI

O workflow `Code Quality` executa em PRs e pushes de `development` e `master`, além de execução manual. Ele não acessa o Render e valida:

1. `npm ci` com o lockfile;
2. Oxlint com warnings tratados como falha;
3. TypeScript com `tsc --noEmit`.

O workflow `Smoke Tests` executa em PRs e pushes de `development` e `master` e também manualmente. Ele:

1. prepara Node.js 24.19.0;
2. instala exatamente as dependências do lockfile com `npm ci`;
3. executa o TypeScript type-check;
4. executa o smoke de API;
5. publica relatórios Playwright/JUnit como artefato.

`Auth API Safe Regression` cobre somente casos seguros por padrão. A tentativa real de login inválido permanece separada e opt-in.

`Registration API Regression` executa automaticamente as validações negativas e mantém a criação real de conta atrás de confirmação explícita.

No CI usamos apenas um worker inicialmente para evitar gerar concorrência desnecessária contra o ambiente compartilhado do Render.

## Estratégia de branches

- `master`: linha estável;
- `development`: integração validável;
- `feature/*` e `chore/*`: implementação isolada antes do merge em `development`.

## Segurança

Nunca versionar senhas, JWTs, refresh tokens, tokens de verificação/reset, cookies ou chaves. Use variáveis de ambiente e secrets do GitHub quando forem necessários.

Testes destrutivos, flood, stress e DDoS não fazem parte desta suíte contra o ambiente compartilhado.
