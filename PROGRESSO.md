# PROGRESSO — Execução dos Gates (devin-pix-mock × API Pix Bacen)

> Solicitação (Cláudio, 12/11/2026): *"Corrija os bugs encontrados, executando os 6 gates. Vá documentando os gates e seu progresso em PROGRESSO.md"*

Referências: *Discovery — devin-pix-mock* e *Análise de aderência à especificação Pix do Bacen* (IDs de pendência T-xx, C-xx, V-xx, L-xx, R-xx, CR-xx citados abaixo).

## Premissas adotadas

| # | Premissa |
|---|---|
| P1 | Especificação-alvo: **API Pix Bacen 2.11.0-rc1** (commit `3ebbd6a` de https://github.com/bacen/pix-api). |
| P2 | Header legado `mocked-token` continua aceito, ao lado de OAuth2 Bearer (compatibilidade com quem já usa o mock). |
| P3 | Simulações sem equivalente na spec (pagar cobrança, disparar webhook etc.) ficam em endpoints extras sob `/mock/*`. |
| P4 | Persistência continua **em memória** (é um mock); estado zera a cada restart. |

## Status dos gates

| Gate | Tema | Status |
|---|---|---|
| G0 | Estabilização | Concluído |
| G1 | CI e higiene | Concluído |
| G2 | Conformidade Cob/CobV/Loc | Em andamento |
| G3 | Pagamento, Pix, devolução, webhooks, payload location | Pendente |
| G4 | Pix Automático (Rec, SolicRec, LocRec, CobR) e LoteCobV | Pendente |
| G5 | Operação e DX | Pendente |

## Diário

### G0 — Estabilização

Objetivo: fazer o que já existe funcionar no servidor real (`npm start`), sem 500 em fluxos básicos.

| Pendência | Correção |
|---|---|
| T-36 | `src/app.factory.ts` cria **todas** as coleções (`initDatabase`, idempotente via `MemoryDB.ensure`) e centraliza a configuração do app (`configureApp`), usada pelo `main.ts`. |
| T-12, T-19 | `ValidationPipe` do servidor real passa a usar o mesmo `exceptionFactory`/`formatValidationErrors` dos testes; interceptor reescrito (`toProblem`) trata mensagens string/array/objeto sem quebrar. |
| T-13 | 403 e 503 mapeados para `AcessoNegado` e `ServicoIndisponivel`; erros de negócio (`Error`) viram 400; só falhas inesperadas (`TypeError` etc.) viram 500, também no formato Problema. |
| T-10 (parcial) | `type` de erro de Location corrigido para `PayloadLocationOperacaoInvalida`; incluído `CobROperacaoInvalida`. |
| T-05 | `POST /auth`: `grant_type` inválido → 400 `unsupported_grant_type`; credencial inválida → 401 `invalid_client`. |
| T-23, T-24, C-07, T-25, V-02, V-03 | Campos obrigatórios com `@IsDefined` (`chave`, `valor`; em CobV também `calendario` e `devedor`): ausência → 400 em vez de 500. Devedor só com CPF ou só com CNPJ deixa de quebrar. |
| C-14 | `txid` já usado → 400 (antes duplicava o registro). |
| V-08 | Merge de `desconto`/`juros`/`multa` no PATCH de CobV não acessa mais propriedade de objeto nulo. |
| C-20 | Rollback da troca de location grava o vínculo completo (`id` + `txid`). |
| L-02 | `DELETE /loc/{id}/txid` retorna o objeto location desvinculado (antes `true`). |
| G0 (rota) | Removido o segundo `@Get(':txid')` (`remove`) de Cob e CobV. |
| Docker | `dockerfile` reescrito (multi-stage, `npm ci`, estrutura `src/` preservada); imports relativos de `location.controller.ts` corrigidos; `tsconfig.build.json` passa a gerar `dist/main.js`; `start:prod` ajustado. |
| Config | Portas configuráveis por `PORT` e `AUTH_PORT`. |
| Testes | Testes de CobV atualizados para enviar `devedor` (obrigatório na spec); removidos testes da rota `remove` inexistente na spec. |

**Evidências G0:** `npx jest` 15 suítes / 258 testes passando; `nest build` ok; `docker build` ok e container responde; servidor real (`node dist/main.js`) testado com curl: PUT/POST cob → 200/201, txid repetido → 400, sem `chave` → 400, devedor CPF → 200, CobV completa → 200, CobV sem devedor/calendario → 400, listagens cob/loc → 200, auth inválida → 401, grant inválido → 400.

**Fica para G2:** status 201 nos PUT, OAuth2 Bearer, `correlationId`, patterns de `txid`/valores, paginação, coleção separada para CobV.

### G1 — CI e higiene

| Item | Antes | Depois |
|---|---|---|
| NestJS | 10.x (vulnerável em `@nestjs/core`, `multer`, `body-parser`) | **11.x** (`common`, `core`, `platform-express`, `swagger`, `testing`, `cli`, `schematics`) |
| `npm audit` (produção) | 16 (1 crítica, 10 altas) | **0** |
| `npm audit` (total) | 49 (2 críticas, 20 altas) | 17 (1 alta, só em ferramentas de dev) |
| ESLint | 2.960 erros | **0** (`npm run lint:check`, `--max-warnings=0`) |
| Prettier | código fora do padrão | todo `src/` e `test/` formatado (`npm run format:check`) |
| CI | inexistente | `.github/workflows/ci.yml`: `npm ci` → lint → build → testes → `npm audit --omit=dev --audit-level=high` + job de `docker build` |

Outros ajustes:
- O script `lint` deixa de usar `--fix` implicitamente. Foram criados `lint:check`, `lint:fix` e `format:check`, e o `package.json` declara `engines.node >=20`.
- Removido `src/controllers/fakedb.ts`, uma cópia divergente e não usada de `src/libs/fakedb.ts`.
- Removidos imports e variáveis sem uso. Em `.eslintrc.js`, `no-unused-vars` passa a aceitar o prefixo `_` e fica desligado nos testes.
- `CobRController.create` passa a delegar para `PSP.addCobR` (a implementação real vem no G4).

**Evidências G1:** lint sem problemas, format ok, build ok, 258 testes passando com Nest 11; smoke no servidor real (POST /cob 201, listagem 200, /api-docs 200).

