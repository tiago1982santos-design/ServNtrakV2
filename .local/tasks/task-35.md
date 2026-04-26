---
title: Permitir definir o horário de trabalho usado nas sugestões da agenda
---
# Permitir definir o horário de trabalho usado nas sugestões da agenda

  ## What & Why
  As sugestões de horas livres no diálogo "Novo Agendamento" assumem um horário fixo das 8h às 18h. Diferentes utilizadores têm rotinas diferentes (por ex. começar às 7h, fazer pausa de almoço entre as 12h e as 14h, terminar às 19h). Permitir configurar o horário de trabalho próprio tornaria as sugestões muito mais úteis e relevantes.

  ## Done looks like
  - Existe uma definição (na página de Definições / Perfil) onde o utilizador pode escolher hora de início, hora de fim e, idealmente, intervalos a excluir (ex. almoço).
  - As sugestões de horas livres na criação de agendamentos passam a usar essa configuração em vez do intervalo fixo 8h–18h.
  - A configuração é guardada por utilizador e persistida.

  ## Out of scope
  - Aplicar o horário noutros sítios da app (ex. relatórios).

  ## Relevant files
  - `client/src/pages/Calendar.tsx` (constante WORKING_HOURS dentro do FormField "date")
  - `client/src/pages/Settings.tsx` (ou página equivalente para preferências do utilizador)
  - `shared/schema.ts` (adicionar colunas de preferências em users ou tabela nova)
  - `server/routes.ts` (endpoints para ler/atualizar preferências)