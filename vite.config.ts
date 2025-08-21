import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  resolve: {
    // Usa padrão somente para "@/" evitando colisão com pacotes escopados como "@supabase/*"
    alias: [
      { find: /^@\//, replacement: path.resolve(__dirname, './src') + '/' },
    ]
  }
});
