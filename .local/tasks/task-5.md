---
title: Migrar para versão GitHub e importar dados do Railway
---
# Migrar para versão GitHub + dados do Railway

## What & Why
A versão mais recente da app está no repositório GitHub `tiago1982santos-design/ServNtrak` (último commit 20/Abr/2026) e tem várias funcionalidades novas que não existem aqui: scan de faturas com OCR, página de compras com detecção de duplicados por número de fatura, histórico de artigos e preços, autenticação WebAuthn (passkeys), uploads via Uppy/Google Cloud Storage, integração com Anthropic SDK, entre outras. O utilizador desenvolveu essa versão com Claude Code num ambiente Railway (BD própria com dados reais de clientes/agendamentos/pagamentos).

O objectivo é trazer **o código** do GitHub para este Repl e importar **os dados** da BD do Railway para a BD Postgres deste Repl (Neon), substituindo o estado actual em ambos os lados.

## Done looks like
- O código deste Repl é o mesmo que está em `main` do GitHub no commit mais recente.
- A app arranca em `npm run dev` sem erros e a página inicial carrega.
- A BD Neon do Repl contém todos os dados do Railway: clientes, agendamentos, pagamentos, notas de despesa, compras, faturas, etc.
- Login funciona com utilizadores existentes do Railway.
- Funcionalidades novas (scan de faturas, página de compras, histórico de preços) estão acessíveis.
- Secrets/variáveis de ambiente necessárias estão configuradas (RESEND, VAPID já existem; novos a adicionar conforme o código exigir: chaves de IA, Google Cloud Storage, etc.).
- `.replit`, integrações Replit, `replit.md` e a base do ambiente local mantêm-se a funcionar.

## Out of scope
- Continuar a usar o Railway em paralelo (vai ser abandonado).
- Sincronização bidireccional de dados.
- Migrar dados da BD actual do Repl (vai ser substituída).
- Configurar deployment de produção / domínio custom (fica para depois).

## Steps
1. **Pré-migração: backup e captura de configuração** — Fazer backup do código actual deste Repl (já protegido pelo checkpoint do sistema) e exportar a lista de secrets actualmente configurados para referência. Confirmar com o utilizador que o conteúdo da BD actual do Replit pode ser destruído.

2. **Pedir credenciais ao utilizador** — Solicitar o `RAILWAY_DATABASE_URL` (URL completo da Postgres do Railway, com permissões de leitura) como secret. Verificar conectividade à BD do Railway antes de continuar.

3. **Substituir o código pela versão do GitHub** — Apagar/substituir os ficheiros e directorias da app (`client/`, `server/`, `shared/`, `routes/`, `script/`, `artifacts/`, ficheiros de config raiz como `package.json`, `tsconfig.json`, `vite.config.ts`, `tailwind.config.ts`, `postcss.config.js`, `components.json`, `drizzle.config.ts`) pelas versões do GitHub `main`. Preservar: `.replit`, `.upm`, `.config`, `.cache`, `.git`, `.local`, `.agents`, `node_modules` (vai ser reinstalado), `attached_assets` (apenas merge — não apagar os existentes), `replit.md` (merge: actualizar com as novas funcionalidades). Não copiar o `.env` do repositório (contém credenciais antigas) — usar os secrets do Replit.

4. **Reinstalar dependências e verificar workflow** — Correr instalação completa de dependências (`@anthropic-ai/sdk`, `@google-cloud/storage`, `@simplewebauthn/*`, `@uppy/*`, `openai`, `leaflet`, `react-leaflet`, etc.). Verificar/ajustar o workflow `Start application` se o comando mudar. Resolver erros de compilação TypeScript que apareçam.

5. **Configurar secrets em falta** — Identificar variáveis de ambiente novas exigidas pelo código (provavelmente `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` para OCR, credenciais Google Cloud Storage para uploads, possivelmente `GOOGLE_OAUTH_CLIENT_ID/SECRET` se OAuth estiver configurado). Pedir cada secret ao utilizador conforme detectado.

6. **Sincronizar schema da BD Neon** — Correr `npm run db:push --force` para criar todas as tabelas do novo schema na BD actual do Replit (Neon). Validar que não há erros de tipo de coluna.

7. **Importar dados do Railway para Neon** — Usar `pg_dump` (apenas dados, sem schema) contra `RAILWAY_DATABASE_URL` para extrair os dados. Truncar as tabelas da BD Neon. Restaurar os dados via `psql` contra `DATABASE_URL` do Replit. Validar contagens (clientes, agendamentos, pagamentos, notas de despesa, compras) entre origem e destino.

8. **Validação ponta-a-ponta** — Reiniciar o workflow, fazer login com um utilizador existente, navegar pelas páginas principais (Home, Clientes, Agendamentos, Compras, Notas de Despesa), abrir um cliente real e confirmar que aparecem dados, testar a criação de uma entidade nova. Correr testes automatizados sobre fluxos principais.

9. **Actualizar `replit.md`** — Documentar a versão actual, as funcionalidades novas, as novas variáveis de ambiente, o procedimento usado para a migração e marcar o Railway como descontinuado. Limpar `.env` local antigo.

## Notas críticas
- **Nunca expor credenciais no código.** O `RAILWAY_DATABASE_URL` é só para a importação — pode ser removido após sucesso.
- **Não tocar no schema dos IDs existentes** (manter `serial` ou `varchar` conforme o GitHub define) — `db:push --force` é seguro mas só se o schema do GitHub for consistente com ele próprio.
- **Ordem de import importa** por causa de chaves estrangeiras — `pg_dump --data-only` com `--disable-triggers` resolve isto, ou desactivar constraints temporariamente.
- O `server/index.ts` do GitHub corre `CREATE TABLE IF NOT EXISTS` para `expense_note_edits`, `quotes`, `quote_items` e um `ALTER TABLE purchases ADD COLUMN IF NOT EXISTS invoice_number` — isto é compatível com `db:push` posterior.
- Integrações já instaladas (Replit Auth, Object Storage, OpenAI) continuam a funcionar — não reinstalar.

## Relevant files
- `package.json`
- `.replit`
- `replit.md`
- `.env`
- `server/index.ts`
- `server/db.ts`
- `server/storage.ts`
- `server/routes.ts`
- `shared/schema.ts`
- `client/src/App.tsx`
- `drizzle.config.ts`