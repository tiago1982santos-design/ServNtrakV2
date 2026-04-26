---
title: Adicionar logótipo à Nota de Despesa (PDF + pré-visualização)
---
# Adicionar logótipo à Nota de Despesa (PDF + pré-visualização)

## What & Why

O utilizador forneceu o logótipo oficial da Peralta Gardens (PNG com fundo transparente). Queremos incorporá-lo na Nota de Despesa PDF e na pré-visualização do canvas.

## Done looks like

1. **Logo copiado** de `attached_assets/logo1_1773532520882.png` para:
   - `client/src/assets/logo.png` (para uso via `@assets/logo.png` no gerador de PDF)
   - `artifacts/mockup-sandbox/public/logo.png` (para o componente de preview no canvas)

2. **`client/src/lib/generateServiceNote.ts` atualizado:**
   - Importar o logo: `import logoUrl from "@assets/logo.png"`
   - No cabeçalho do PDF, usar `doc.addImage(logoUrl, 'PNG', margin, 12, 28, 28)` para colocar o logo (~28×28 mm) no canto superior esquerdo.
   - Remover a linha de texto "Peralta Gardens" em verde (o logo substitui-a).
   - Manter as linhas de contacto/subtítulo abaixo do espaço do logo.
   - Ajustar o `y` inicial para ter em conta a altura do logo.

3. **`artifacts/mockup-sandbox/src/components/mockups/NotaDespesaPreview.tsx` atualizado:**
   - Substituir o texto "Peralta Gardens" por `<img src="/logo.png" style={{ width: 80, height: 80 }} alt="Peralta Gardens" />`
   - Manter as linhas de subtítulo e contacto abaixo.

## Relevant files

- `attached_assets/logo1_1773532520882.png` → fonte do logótipo
- `client/src/lib/generateServiceNote.ts`
- `artifacts/mockup-sandbox/src/components/mockups/NotaDespesaPreview.tsx`
