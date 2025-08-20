# Finnko - Personal Finance Management App

Uma aplicação moderna de gerenciamento financeiro pessoal construída com React + TypeScript e Vite.

## 🚀 Recursos Principais

- **Gestão de Contas Bancárias**: Controle suas contas corrente, poupança e investimentos
- **Transações Financeiras**: Registro completo de entradas, saídas e transferências
- **Cartões de Crédito**: Gerenciamento de faturas e parcelas
- **Investimentos**: Acompanhamento de objetivos e alocação de ativos
- **Categorização**: Sistema inteligente de categorias para organizar gastos
- **Relatórios Visuais**: Gráficos e dashboards interativos
- **Modo Escuro/Claro**: Interface adaptável às suas preferências
- **Importação de Dados**: Suporte a importação via CSV e backup/restore em JSON

## 🏗️ Arquitetura do Projeto

### Estrutura de Pastas

```
src/
├── components/          # Componentes reutilizáveis da UI
├── pages/              # Páginas da aplicação (lazy loaded)
├── context/            # Context Providers por domínio
│   ├── accounts/       # Contexto de contas bancárias
│   ├── transactions/   # Contexto de transações
│   ├── cards/          # Contexto de cartões de crédito
│   ├── investments/    # Contexto de investimentos
│   └── categories/     # Contexto de categorias
├── hooks/              # Custom hooks para cada domínio
│   ├── useAccounts.ts
│   ├── useTransactions.ts
│   ├── useCards.ts
│   ├── useInvestments.ts
│   └── useCategories.ts
├── services/           # Lógica de negócio e persistência
│   ├── accountsService.ts
│   ├── transactionsService.ts
│   ├── cardsService.ts
│   ├── investmentsService.ts
│   ├── categoriesService.ts
│   └── persistenceService.ts
├── utils/              # Funções utilitárias
├── types/              # Definições de tipos TypeScript
├── assets/             # Recursos estáticos
└── styles/             # Arquivos de estilo globais
```

### Tecnologias e Padrões

- **React 19** com TypeScript para type safety
- **React Router DOM** com code splitting via `React.lazy`
- **Context API + Custom Hooks** para gerenciamento de estado
- **Vite** para bundling e development server
- **Tailwind CSS** para estilização
- **LocalStorage** para persistência de dados
- **Arquitetura limpa** com separação por domínios

## 🛠️ Setup e Instalação

### Pré-requisitos
- Node.js (versão 16 ou superior)
- npm ou yarn

### Instalação

1. **Clone o repositório**
   ```bash
   git clone <repository-url>
   cd finnko
   ```

2. **Instale as dependências**
   ```bash
   npm install
   ```

3. **Execute o projeto**
   ```bash
   # Desenvolvimento
   npm run dev
   
   # Build para produção
   npm run build
   
   # Preview do build
   npm run preview
   ```

## 📱 Funcionalidades Principais

### Gestão de Contas
- Criação e edição de contas bancárias
- Controle de saldo inicial e movimentações
- Visualização consolidada do patrimônio

### Transações Financeiras
- Registro de entradas, saídas e transferências
- Suporte a transações recorrentes
- Categorização automática e manual
- Filtros por período, conta e categoria

### Cartões de Crédito
- Gestão completa de cartões e faturas
- Controle de parcelas e compras
- Pagamento de faturas integrado

### Investimentos
- Definição de objetivos de investimento
- Alocação de ativos por objetivo
- Acompanhamento de rendimentos

## 🔧 Configurações de Desenvolvimento

### Aliases de Importação
O projeto usa aliases `@/*` para importações absolutas:

```typescript
// ✅ Correto
import { useAccounts } from '@/hooks/useAccounts';
import { formatCurrency } from '@/utils/format';

// ❌ Evitar
import { useAccounts } from '../hooks/useAccounts';
```

### Estrutura de Context/Service
Cada domínio (contas, transações, cartões, investimentos) segue o padrão:

1. **Service**: Lógica pura e persistência
2. **Context**: Gerenciamento de estado React
3. **Hook**: Interface simplificada para componentes

### Code Splitting
Todas as páginas são carregadas via `React.lazy` para otimização de performance:

```typescript
const ResumoPage = lazy(() => import('@/pages/ResumoPage'));
const ContasExtratoPage = lazy(() => import('@/pages/ContasExtratoPage'));
// ...
```

## 📊 Persistência de Dados

Os dados são armazenados no `localStorage` do navegador, organizados por domínio:

- `contas`: Contas bancárias
- `transacoes`: Transações financeiras
- `cartoes`: Cartões de crédito
- `compras`: Compras no cartão
- `parcelas`: Parcelas das compras
- `objetivos`: Objetivos de investimento
- `ativos`: Ativos financeiros
- `alocacoes`: Alocações de ativos
- `categorias`: Categorias personalizadas
- `settings`: Configurações do usuário
- `theme`: Tema (claro/escuro)
- `profilePicture`: Foto de perfil

## 🚀 Deploy

Para fazer deploy da aplicação:

1. **Build de produção**
   ```bash
   npm run build
   ```

2. **Os arquivos estáticos estarão em `dist/`**
   - Deploy em qualquer servidor web estático
   - Suporte completo para SPA routing

## 🤝 Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

---

**Desenvolvido com ❤️ usando React + TypeScript + Vite**