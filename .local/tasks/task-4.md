---
title: Geofencing — Registo Automático de Visitas
---
# Geofencing — Registo Automático de Visitas

## What & Why
Quando o utilizador chega ao local de um cliente (detectado por GPS), a visita inicia automaticamente. Quando sai, a visita termina e aparece um card de confirmação com a duração. Sem interação manual obrigatória.

O objetivo é eliminar o registo manual de início/fim de visita — o sistema deteta a chegada (raio 75m) e saída, e guarda a visita confirmada na base de dados ligada ao agendamento do dia.

## Done looks like
- Na Home, existe um botão "📍 Iniciar tracking" / "⏸ Pausar tracking" que ativa o GPS
- Quando o utilizador chega ao local de um cliente com agendamento hoje, aparece um card "Em visita: [nome]" com a hora de início
- Ao sair do raio, aparece um card de confirmação com hora de início, hora de fim e duração em minutos
- O card tem 3 ações: "Confirmar" (guarda a visita), "Ajustar" (editar duração) e "Ignorar"
- Ao confirmar, a visita é guardada em `serviceVisits` com source="geofencing" e o agendamento é marcado como concluído
- Erros de GPS são mostrados num alerta contextual na Home
- Visitas com menos de 5 minutos não geram card de confirmação

## Out of scope
- Push notifications quando chega ao local (requer Service Worker/PWA nativo)
- Tracking em background quando a app está fechada
- Múltiplas visitas simultâneas (apenas 1 visita ativa por vez)
- Edição de visitas geofencing passadas (fora desta tarefa)

## Tasks

1. **Schema — adicionar colunas a `serviceVisits`**
   Adicionar `source` (text, default "manual"), `status` (text, default "concluida") e `endTime` (timestamp, nullable) à tabela `serviceVisits`. Tornar `actualDurationMinutes` nullable (para suportar visitas em curso sem duração ainda). Correr `npm run db:push` para migrar.
   - Nota: não alterar tipos de colunas existentes (preservar `serial` nos IDs).

2. **Backend — novos endpoints de geofencing**
   Criar dois endpoints novos (fora do contrato `shared/routes.ts` existente, diretamente em `server/routes.ts`):
   - `POST /api/geofencing/arrival` — recebe `{ appointmentId, clientId, timestamp }`, cria um registo em `serviceVisits` com `status="em_curso"`, `source="geofencing"`, `actualDurationMinutes=0`, `visitDate=timestamp`. Exige autenticação.
   - `POST /api/geofencing/visit` — recebe `{ appointmentId, clientId, inicio, fim, duracaoMinutos, fonte }`, cria/atualiza registo final em `serviceVisits` com `status="concluida"` e `endTime`. Se `appointmentId` estiver presente, marca `appointments.isCompleted=true`. Exige autenticação.

3. **Hook `useGeofencing.ts`**
   Criar `client/src/hooks/useGeofencing.ts` com o código exato fornecido na especificação. O hook recebe um array de `ClienteComLocalizacao` (com `id`, `nome`, `latitude`, `longitude`, `agendamentoId`) e uma configuração de opções. Gere o ciclo de vida GPS (watchPosition + intervalo de 30s), deteta entrada/saída do raio (default 75m), e expõe: `ativo`, `posicaoAtual`, `visitaAtiva`, `visitasPendentesConfirmacao`, `erro`, `iniciar`, `parar`, `confirmarVisita`.

4. **Home — integrar geofencing na UI**
   Na página Home (`client/src/pages/Home.tsx`), instanciar o hook `useGeofencing` usando `todayAppointments` (já disponível) mapeados para `ClienteComLocalizacao` — filtrar apenas clientes com `latitude` e `longitude` definidos.
   Adicionar ao JSX:
   - **Botão de tracking** integrado nas Quick Actions existentes (substituir ou adicionar à fila), com estado visual amber quando ativo.
   - **Card "Em visita"** abaixo do card "A Seguir" quando `geo.visitaAtiva` não é null — mostrar nome do cliente e hora de início, no mesmo estilo visual da Home (fundo amber/verde, rounded-2xl, etc.).
   - **Cards de confirmação** por cada `geo.visitasPendentesConfirmacao` — mostrar nome, intervalo horário, duração, botões Confirmar/Ajustar/Ignorar no estilo dos cards existentes.
   - **Alerta de erro GPS** se `geo.erro` não é null — toast ou banner amarelo.
   Os callbacks `onEntrada` e `onSaida` do hook chamam os dois novos endpoints via `fetch` (ou `apiRequest`).

## Relevant files
- `shared/schema.ts:166-177`
- `server/routes.ts:97-115,665-695`
- `server/storage.ts:40,171-197,633-680`
- `client/src/pages/Home.tsx`
- `client/src/hooks/use-appointments.ts`