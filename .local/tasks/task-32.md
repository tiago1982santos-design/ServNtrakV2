---
title: Calendário — agendar com toque duplo
---
# Calendário — agendar com toque duplo

## What & Why
Hoje, agendar uma visita exige duas etapas: tocar na data para a seleccionar e depois tocar no botão "+" da secção abaixo. Esta tarefa adiciona um atalho: **tocar duas vezes na mesma data** abre directamente o diálogo "Novo Agendamento" já com a data preenchida. Reduz o atrito do fluxo mais frequente do dia-a-dia mantendo todas as interacções actuais intactas.

## Done looks like
- Um toque numa data continua a fazer só selecção (a lista de agendamentos desse dia aparece em baixo, exactamente como hoje).
- Dois toques rápidos (dentro de ~500 ms) na mesma data **futura ou de hoje** abrem o diálogo "Novo Agendamento" com essa data pré-preenchida (hora 09:00 por defeito, igual ao botão "+").
- Dois toques numa data **passada** não abrem o diálogo (não se agendam visitas no passado, mantendo a regra `isFutureOrToday` actual).
- Aparece uma frase de ajuda discreta por baixo do calendário em PT-PT (algo como *"Toca duas vezes numa data para agendar rapidamente"*) para garantir a descoberta do gesto.
- O botão "+" na secção da data e o botão "Agendar Serviço" do estado vazio continuam a funcionar como hoje.
- O diálogo "Gerar Mês" e a navegação do calendário (mudar de mês, etc.) não são alterados.
- Sem novas dependências de pacotes.

## Out of scope
- Vista semanal do calendário.
- Drag-and-drop de agendamentos.
- Sinalização de conflitos de horário (pode ser tarefa separada).
- Long-press / pressão prolongada (não é gesto nativo do `react-day-picker` e não compensa a complexidade).
- Alterações ao formulário de "Novo Agendamento" em si.

## Steps
1. **Detecção de toque duplo** — Adicionar uma `ref` que regista a última data tocada e o respectivo timestamp. Usar o handler `onDayClick` do `react-day-picker` para detectar dois toques na mesma data dentro de ~500 ms; se a data for hoje ou no futuro, abrir o diálogo já existente reutilizando a lógica de `handleOpenDialog` (que faz o reset do form com a data + hora 09:00). Manter `onSelect={setDate}` intacto para preservar o comportamento de selecção.
2. **Texto de ajuda** — Adicionar uma linha curta em PT-PT por baixo do calendário, com estilo discreto (`text-muted-foreground text-xs`, centrada), a explicar o gesto.
3. **Verificação manual** — Confirmar: (a) toque simples só selecciona a data, (b) duplo toque numa data futura abre o diálogo com data pré-preenchida, (c) duplo toque numa data passada não abre nada, (d) botão "+" e estado vazio continuam a funcionar, (e) sem regressões noutros fluxos do Calendário (Gerar Mês, navegação entre meses).

## Relevant files
- `client/src/pages/Calendar.tsx:1-170`
- `client/src/pages/Calendar.tsx:436-560`