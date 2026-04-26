---
title: Nota de Despesa de Serviço (PDF)
---
# Nota de Despesa de Serviço (PDF)

## What & Why

Permitir gerar, a partir de qualquer registo de serviço, um documento PDF informal ("Nota de Despesa") que o trabalhador pode mostrar ou partilhar com o cliente no final da visita. O documento resume o trabalho feito, materiais utilizados, mão-de-obra e o valor total a cobrar. Não é um documento fiscal oficial — serve apenas para informar o cliente dos custos.

## Done looks like

- Em cada registo de serviço no detalhe do cliente existe um botão "Gerar Nota de Despesa"
- Ao clicar, é gerado e descarregado automaticamente um PDF com:
  - Cabeçalho: "Peralta Gardens" + morada e contacto da empresa
  - Dados do cliente: nome e morada
  - Data e tipo de serviço (Jardim / Piscina / Jacuzzi / Geral)
  - Descrição do trabalho realizado
  - Tabela de mão-de-obra (se existir): trabalhador, horas, taxa, subtotal
  - Tabela de materiais (se existir): material, quantidade, preço unitário, subtotal
  - Total em destaque
  - Rodapé: "Documento não oficial — apenas para informação"
- O nome do ficheiro segue o padrão: `nota_[NomeCliente]_[Data].pdf`
- O botão está visível apenas em registos do tipo "extra" com valor > 0, ou em todos os registos (a definir)

## Out of scope

- Envio automático por email ou WhatsApp (o utilizador partilha o PDF manualmente)
- Validade fiscal / conformidade AT
- Assinatura digital ou número de documento sequencial
- Logótipo da empresa (apenas texto no cabeçalho)

## Tasks

1. **Utilitário de geração de PDF** — Criar `client/src/lib/generateServiceNote.ts` que recebe um `ServiceLog` com as suas entradas de mão-de-obra e materiais e gera o PDF formatado usando jsPDF e jsPDF-autotable.

2. **Botão "Gerar Nota" no registo de serviço** — Adicionar o botão ao `ServiceLogCard` em `ClientDetail.tsx`, que chama o utilitário com os dados do registo seleccionado e desencadeia o download do PDF.

## Relevant files

- `client/src/pages/ClientDetail.tsx:2364-2420`
- `client/src/pages/Exports.tsx:82-135`
- `shared/schema.ts:443-484`