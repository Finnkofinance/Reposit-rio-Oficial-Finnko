# Sistema de Redimensionamento de Colunas - Fluxo de Caixa

## Visão Geral

Este sistema permite que os usuários redimensionem manualmente as colunas da grade financeira (Data | Entradas | Saídas | Invest | Saldo) no Fluxo de Caixa, com persistência das configurações por usuário.

## Funcionalidades Implementadas

### 1. **Redimensionamento Manual**
- **Arraste**: Clique e arraste o separador entre os cabeçalhos das colunas
- **Teclado**: Use Tab para focar no separador, então setas ←/→ para ajustar (Shift para passos maiores)
- **Touch**: Suporte completo para dispositivos móveis com toque

### 2. **Auto-fit**
- **Duplo-clique** no separador ajusta automaticamente a largura baseada no conteúdo visível
- Considera tanto o cabeçalho quanto as células renderizadas

### 3. **Persistência**
- **Usuário logado**: Configurações salvas no Supabase na tabela `user_settings`
- **Usuário offline**: Fallback automático para localStorage
- **Identificação**: Por `user_id` + `screen_key` ("extrato-diario")

### 4. **Limites de Largura**
- **Mínimo**: 96px
- **Máximo**: 420px
- Aplicado automaticamente durante o redimensionamento

### 5. **Reset**
- Botão "Redefinir Colunas" volta às larguras padrão:
  - Data: 140px
  - Entradas: 160px  
  - Saídas: 160px
  - Investimentos: 140px
  - Saldo: 180px

## Estrutura Técnica

### Arquivos Criados/Modificados

1. **`src/services/columnWidthService.ts`**
   - Service para persistência (Supabase + localStorage)
   - Gerencia configurações por usuário e tela

2. **`src/context/tableLayout/TableLayoutProvider.tsx`**
   - Context React para gerenciar estado das larguras
   - Debounced save (300ms) para performance
   - Carregamento inicial das configurações salvas

3. **`src/components/table/ColumnResizer.tsx`**
   - Componente para redimensionamento interativo
   - Suporte a mouse, teclado e touch
   - Tooltip mostrando largura atual durante resize

4. **`src/pages/FluxoCaixaPage.tsx`** (modificado)
   - Integração com sistema de redimensionamento
   - Uso de `<colgroup>` para aplicar larguras
   - Resizers nos cabeçalhos das colunas

5. **`src/pages/FluxoCaixaPageWrapper.tsx`** (modificado)
   - Wrapper com TableLayoutProvider
   - Integração com autenticação para userId

## Uso

### Para o Usuário Final

1. **Redimensionar coluna**:
   - Posicione o cursor sobre a linha divisória entre colunas no cabeçalho
   - O cursor mudará para ↔ (col-resize)
   - Clique e arraste para ajustar a largura

2. **Auto-fit**:
   - Dê duplo-clique na linha divisória
   - A coluna será ajustada automaticamente

3. **Navegação por teclado**:
   - Use Tab para navegar até um separador
   - Use setas ←/→ para ajustar (8px por passo)
   - Segure Shift para passos maiores (24px)

4. **Resetar**:
   - Clique no botão "Redefinir Colunas" no topo da página

### Acessibilidade

- **Separadores focáveis** com role="separator"
- **Labels ARIA** descritivos 
- **Valores ARIA** mostrando largura atual e limites
- **Navegação por teclado** completa

## Estrutura do Banco de Dados

O sistema utiliza a tabela `user_settings` com a seguinte estrutura:

```sql
-- user_settings
user_id uuid primary key references auth.users(id) on delete cascade,
settings jsonb not null default '{}'::jsonb,
updated_at timestamptz default now()
```

As larguras são armazenadas em:
```json
{
  "tableLayouts": {
    "extrato-diario": {
      "widths": {
        "date": 140,
        "income": 160, 
        "expense": 160,
        "invest": 140,
        "balance": 180
      }
    }
  }
}
```

## Responsividade

- Quando a soma das larguras > container, aplica `overflow-x: auto`
- Header permanece sticky durante scroll horizontal
- Resizers mantêm-se visíveis e operacionais
- Touch funciona adequadamente em dispositivos móveis

## Performance

- **Debounced save** (300ms) evita excesso de chamadas ao banco
- **Clamp automático** de larguras durante edição
- **requestAnimationFrame** usado quando necessário para suavidade
- **localStorage backup** sempre mantido para acesso rápido

## Segurança

- Validação de limites min/max em todas as operações
- Fallback gracioso quando Supabase indisponível
- Sem exposição de dados sensíveis
- Context isolado por tela/usuário