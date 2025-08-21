import path from 'path';
import { defineConfig } from 'vite';

// Ajusta base somente para deploy em GitHub Pages
const repoBase = '/Reposit-rio-Oficial-Finnko/';
const base = process.env.DEPLOY_TARGET === 'gh-pages' ? repoBase : '/';

export default defineConfig({
  base,
  resolve: {
    // Usa padrão somente para "@/" evitando colisão com pacotes escopados como "@supabase/*"
    alias: [
      { find: /^@\//, replacement: path.resolve(__dirname, './src') + '/' },
    ]
  }
});
