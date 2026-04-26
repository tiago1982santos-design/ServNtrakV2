---
title: Pré-visualização da Nota de Despesa no Canvas
---
# Pré-visualização da Nota de Despesa no Canvas

## What & Why

Criar um componente de mockup que simula o aspeto visual da Nota de Despesa em PDF e colocá-lo no canvas para o utilizador ver como o documento ficará antes de gerar um PDF real.

## Done looks like

- Um componente React no mockup-sandbox (`NotaDespesaPreview.tsx`) que renderiza uma folha A4 estilizada com:
  - Cabeçalho verde: "Peralta Gardens" + subtítulo + morada/contacto + "Nota de Despesa" à direita + data
  - Separador
  - Bloco "Cliente": nome, morada, telefone (dados fictícios de exemplo)
  - Bloco "Serviço Realizado": tipo, badge "Extra", descrição
  - Tabela de Mão-de-Obra (com 1-2 linhas de exemplo)
  - Tabela de Materiais (com 1-2 linhas de exemplo)
  - Total em destaque com linhas verdes
  - Rodapé: "Documento não oficial — apenas para informação do cliente."
- O componente está embebido como iframe no canvas, com tamanho A4 (595×842 px aprox.)

## Relevant files

- `artifacts/mockup-sandbox/src/components/mockups/` — directório onde criar `NotaDespesaPreview.tsx`
- `artifacts/mockup-sandbox/src/App.tsx` — registar a nova rota do preview
- `client/src/lib/generateServiceNote.ts` — referência do layout real do PDF
