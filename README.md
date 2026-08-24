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

## Estrutura inicial

```text
config/
  environment.ts
tests/
  api/
    health/
      readiness.spec.ts
  ui/
  e2e/
fixtures/
helpers/
pages/
schemas/
.github/
  workflows/
    smoke.yml
```

As pastas ainda sem testes serão adicionadas conforme o roadmap de automação evoluir.

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

Todos os testes de API:

```bash
npm run test:api
```

Type check:

```bash
npm run typecheck
```

Relatório HTML após uma execução:

```bash
npm run report
```

## Tags

Os testes serão classificados por domínio e risco, por exemplo:

- `@smoke`
- `@regression`
- `@api`
- `@ui`
- `@e2e`
- `@security`
- `@p0`, `@p1`, `@p2`

## Primeiro caso automatizado

`AUTO-002 | E2E-01` valida `GET /actuator/health/readiness` e exige:

- HTTP `200`;
- corpo JSON com `status: "UP"`.

O teste aceita até 90 segundos para a requisição de readiness porque o Render pode estar em cold start, mas a expectativa funcional continua estrita.

## CI

O workflow `Smoke Tests` executa em PRs e pushes de `development` e `master` e também manualmente. Ele:

1. prepara Node.js 24.19.0;
2. instala exatamente as dependências do lockfile com `npm ci`;
3. executa o TypeScript type-check;
4. executa o smoke de API;
5. publica relatórios Playwright/JUnit como artefato.

No CI usamos apenas um worker inicialmente para evitar gerar concorrência desnecessária contra o ambiente compartilhado do Render.

## Estratégia de branches

- `master`: linha estável;
- `development`: integração validável;
- `feature/*`: implementação isolada antes do merge em `development`.

## Segurança

Nunca versionar senhas, JWTs, refresh tokens, tokens de verificação/reset, cookies ou chaves. Use variáveis de ambiente e secrets do GitHub quando forem necessários.

Testes destrutivos, flood, stress e DDoS não fazem parte desta suíte contra o ambiente compartilhado.
