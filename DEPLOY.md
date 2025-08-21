# Deploy no Vercel - Finnko

## Pré-requisitos

1. Conta no [Vercel](https://vercel.com)
2. Repositório Git (GitHub, GitLab, Bitbucket)
3. Projeto Supabase configurado

## Passos para Deploy

### 1. Preparar o Repositório

```bash
# Commitar todas as alterações
git add .
git commit -m "Preparar projeto para deploy no Vercel"
git push origin main
```

### 2. Importar no Vercel

1. Acesse [vercel.com](https://vercel.com) e faça login
2. Clique em **"New Project"**
3. Importe seu repositório do GitHub
4. Vercel detectará automaticamente que é um projeto Vite

### 3. Configurar Variáveis de Ambiente

No painel do Vercel, vá em **Settings** > **Environment Variables** e adicione:

```
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_publica_aqui
GEMINI_API_KEY=sua_chave_gemini_aqui (opcional)
```

### 4. Deploy

1. Clique em **"Deploy"**
2. Aguarde o build completar
3. Seu app estará disponível em `https://seu-projeto.vercel.app`

## Configurações Automáticas

O projeto já está configurado com:

- ✅ `vercel.json` - Configuração do Vercel
- ✅ `.env.example` - Template das variáveis de ambiente
- ✅ SPA routing configurado
- ✅ Build otimizado para produção

## Domínio Personalizado (Opcional)

1. No painel do Vercel, vá em **Settings** > **Domains**
2. Adicione seu domínio personalizado
3. Configure os DNS conforme as instruções

## Solução de Problemas

### Build Error
```bash
# Teste o build localmente
npm run build
npm run preview
```

### Variáveis de Ambiente
- Certifique-se que todas as variáveis VITE_ estão configuradas
- Variáveis devem estar disponíveis no build time

### Routing Issues
- O `vercel.json` já está configurado para SPA
- Todas as rotas são redirecionadas para `index.html`

## Atualizações

Qualquer push para a branch `main` irá automaticamente:
1. Fazer rebuild do projeto
2. Deploy da nova versão
3. Disponibilizar no domínio configurado