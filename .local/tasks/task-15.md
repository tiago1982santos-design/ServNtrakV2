---
title: Unificar paleta verde (sem laranja/amber)
---
# Paleta Verde Consistente (Sem Laranja/Amber)

## What & Why
A app mistura `--primary` verde (#2D6A4F) com 138 usos de `orange-*`/`amber-*` e 33 cores hex hardcoded espalhadas por 27 ficheiros do `client/src/`. Isso cria um aspecto inconsistente entre a navegação inferior, cabeçalhos, badges de tipo de serviço, alertas e botões. Esta tarefa unifica todo o front-end na paleta verde existente, com cinzento neutro para tipos de serviço e `destructive` (vermelho) para avisos/erros — eliminando totalmente referências literais a `orange-`, `amber-` e cores hex em código TS/TSX/CSS.

## Done looks like
- A barra de navegação inferior (BottomNav) usa apenas verde (`primary`/`primary/10`) para estado activo e cinzento (`muted-foreground`) para inactivo. Sem `orange-100/60`, `amber-500`, `#9B7B5E` nem sombra `rgba(200,120,50,…)`.
- A página Home não tem nenhum `#206F4C` hardcoded — passa a usar `bg-primary`, `text-primary`, `border-primary/20`, etc. — e os cartões "Pagamentos Pendentes", "Mapa" e "Funcionários" deixam de usar amber/laranja.
- ClientDetail.tsx (a maior fonte de inconsistências, 31 ocorrências) tem todos os badges de tipo de serviço (Jacuzzi, Construção, Reparação) em cinzento neutro com ícones consistentes; alertas/avisos passam para `destructive`; selecções de "seasonal/once_monthly/on_demand" usam `primary` em vez de `orange-500`.
- Avisos visuais (caixas de alerta, GPS error, badges de "Pendente"/"Atraso") usam `bg-destructive/10`, `text-destructive`, `border-destructive/20`. Erros graves continuam a destacar-se.
- WeatherWidget perde os tons quentes — sol e alertas climáticos passam a usar `primary` (sol) e `destructive` (alertas), conforme escolha do utilizador (chrome verde + neutro).
- `index.css` mantém-se exactamente como está: variáveis `--primary 152 55% 28%`, `--secondary 152 35% 92%`, `--accent 200 75% 50%` confirmadas correctas. Não se adicionam novos tokens.
- Modo escuro continua a funcionar — todas as substituições usam variáveis CSS, que já têm contraparte em `.dark`.
- `data-testid` existentes preservados.
- Validação no fim da execução: `rg "orange-|amber-" client/src/ -g '*.{ts,tsx,css}'` retorna **0 resultados** (excepto em comentários explicativos); `rg "#[0-9a-fA-F]{6}" client/src/ -g '*.{ts,tsx}'` retorna **0 resultados**; `npm run check` passa com 0 erros.

## Out of scope
- Não se altera a paleta de fundo (`--primary`, `--secondary`, `--accent` mantêm valores actuais — já são verdes correctos).
- Não se adicionam novas variáveis CSS (sem `--warning`, sem `--sun`).
- Não se mexe em ícones SVG nem assets PNG/JPG (ex.: weather icons binários, logo PNG).
- Não se refactoriza estrutura de componentes nem layout — apenas cores.
- Backend (`server/`) e schema (`shared/`) não são tocados.
- Não se mexe em `tailwind.config.ts` — as variáveis já estão mapeadas.

## Steps

1. **BottomNav e ícones de navegação** — Aplicar as substituições literais já listadas pelo utilizador (orange-50 → primary/10, amber-500 → primary, #9B7B5E → muted-foreground, sombra rgba → hsl(var(--primary)/0.08), border-orange-100/60 → border-border).

2. **Home.tsx (29 hex + 20 orange/amber)** — Substituir todos os `#206F4C` por classes/variantes `primary`. Substituir caixa "Pagamentos Pendentes" amber por `destructive`. Substituir cards "Mapa" e "Funcionários" laranja por neutros (`bg-muted`, `text-muted-foreground`, `border-border`). Confirmar que badge "A decorrer"/"em N min" continua a destacar-se com `primary`.

3. **ClientDetail.tsx (31 ocorrências)** — Maior bloco. Badges de tipo de serviço (Jardim/Piscina/Jacuzzi) e categorias (Construção/Reparação) passam para cinzento (`bg-muted text-muted-foreground border-border`) com ícone para diferenciar. Avisos e estados de erro usam `destructive`. Cartões de selecção "seasonal/once_monthly/on_demand" usam `primary`. Switches de Jacuzzi e Termómetro passam para `primary`.

4. **WeatherWidget e use-weather** — Gradientes amarelo/laranja do sol passam para `primary`. Badges de alerta climático (`bg-amber-500/20 text-amber-100`) passam para `destructive`. Manter ícone de alerta visualmente proeminente.

5. **Páginas restantes (Calendar, Profile, Gallery, Clients, Exports, ClientProfitability, ExpenseNoteNew, ExpenseNoteDetail, Login, ClientsMap, Quotes, QuoteNew, QuoteDetail, Billing, Payments, PendingTasks, Reminders, Weather)** — Aplicar a mesma regra: chrome → primary, alertas → destructive, neutros → muted. Total ~50 ocorrências distribuídas; cada ficheiro tem entre 1 e 9 matches.

6. **Componentes restantes (DocumentScanDialog, CreateSuggestedWorkDialog, CreateClientDialog, CreatePendingTaskDialog)** — Mesma regra. Maioritariamente badges e ícones de status.

7. **Validação automática** — Correr os três grep finais e `npm run check`; reiniciar a workflow `Start application` e tirar screenshot da Home, BottomNav e de uma página de cliente para confirmar visualmente que não há tons quentes residuais. Anexar contagens antes/depois ao commit.

## Notas de design para o executor
- **Diferenciação Jacuzzi vs Piscina vs Jardim**: ao perder o laranja, os tipos de serviço deixam de se distinguir por cor. Compensar com **ícones diferentes** (`ThermometerSun` para Jacuzzi, `Droplets` para Piscina, `Trees`/`Shovel` para Jardim) e manter a cor neutra (`muted`) em todos. Não inventar novas cores.
- **Avisos**: usar `bg-destructive/10 text-destructive border-destructive/20` (variantes suaves) em vez de `bg-destructive` puro, para não dar aspecto de erro grave em meros avisos informativos.
- **Hex verdes hardcoded**: `#206F4C` é praticamente igual a `--primary` (#2D6A4F) — a diferença visual é mínima e a substituição é segura. `#1a5a3d` (hover) → `primary/90` ou `hover:bg-primary/90`.
- Comentários `// orange / amber` usados para documentar a substituição são tolerados pela validação (a regex deve ignorar linhas com `//` ou `/*`).

## Relevant files
- `client/src/index.css:7-46`
- `client/src/components/BottomNav.tsx`
- `client/src/pages/Home.tsx`
- `client/src/pages/ClientDetail.tsx`
- `client/src/pages/Calendar.tsx`
- `client/src/pages/Profile.tsx`
- `client/src/pages/Gallery.tsx`
- `client/src/pages/Clients.tsx`
- `client/src/pages/Exports.tsx`
- `client/src/pages/ClientProfitability.tsx`
- `client/src/pages/ExpenseNoteNew.tsx`
- `client/src/pages/ExpenseNoteDetail.tsx`
- `client/src/pages/Login.tsx`
- `client/src/pages/ClientsMap.tsx`
- `client/src/pages/Quotes.tsx`
- `client/src/pages/QuoteNew.tsx`
- `client/src/pages/QuoteDetail.tsx`
- `client/src/pages/Billing.tsx`
- `client/src/pages/Payments.tsx`
- `client/src/pages/PendingTasks.tsx`
- `client/src/pages/Reminders.tsx`
- `client/src/pages/Weather.tsx`
- `client/src/components/WeatherWidget.tsx`
- `client/src/hooks/use-weather.ts`
- `client/src/components/DocumentScanDialog.tsx`
- `client/src/components/CreateSuggestedWorkDialog.tsx`
- `client/src/components/CreateClientDialog.tsx`
- `client/src/components/CreatePendingTaskDialog.tsx`