import { supabase } from '@/lib/supabaseClient';

export type ColumnKey = 'date' | 'income' | 'expense' | 'invest' | 'balance';

export interface ColumnWidths {
  [key: string]: number; // Record<ColumnKey, number>
}

// Larguras padrão das colunas (em pixels)
export const DEFAULT_COLUMN_WIDTHS: Record<ColumnKey, number> = {
  date: 140,
  income: 160,
  expense: 160,
  invest: 140,
  balance: 180,
};

// Limites mínimo e máximo para larguras das colunas
export const MIN_COLUMN_WIDTH = 96;
export const MAX_COLUMN_WIDTH = 420;

// Chave de tela para fluxo de caixa
export const SCREEN_KEY_FLUXO_CAIXA = 'extrato-diario';

export const columnWidthService = {
  /**
   * Busca as larguras das colunas para um usuário e tela específica
   */
  async getWidths(userId: string, screenKey: string): Promise<Record<ColumnKey, number> | null> {
    try {
      const { data: auth } = await supabase.auth.getSession();
      const user = auth.session?.user || null;
      
      // Se não estiver logado, usar localStorage
      if (!user || !userId) {
        const localKey = `column_widths_${screenKey}`;
        const stored = window.localStorage.getItem(localKey);
        if (stored) {
          try {
            return JSON.parse(stored) as Record<ColumnKey, number>;
          } catch {
            return null;
          }
        }
        return null;
      }
      
      // Buscar do Supabase
      const { data, error } = await supabase
        .from('user_settings')
        .select('settings')
        .eq('user_id', userId)
        .single();
      
      if (error && (error as any).code !== 'PGRST116') {
        console.warn('Erro ao buscar user_settings:', error);
        return this.getWidthsFromLocalStorage(screenKey);
      }
      
      if (data?.settings?.tableLayouts?.[screenKey]?.widths) {
        return data.settings.tableLayouts[screenKey].widths;
      }
      
      return null;
    } catch (error) {
      console.warn('Erro ao buscar larguras das colunas:', error);
      return this.getWidthsFromLocalStorage(screenKey);
    }
  },

  /**
   * Salva as larguras das colunas para um usuário e tela específica
   */
  async saveWidths(userId: string, screenKey: string, widths: Record<ColumnKey, number>): Promise<void> {
    try {
      const { data: auth } = await supabase.auth.getSession();
      const user = auth.session?.user || null;
      
      // Se não estiver logado, usar localStorage
      if (!user || !userId) {
        this.saveWidthsToLocalStorage(screenKey, widths);
        return;
      }
      
      // Buscar configurações existentes ou criar nova estrutura
      const { data: existing } = await supabase
        .from('user_settings')
        .select('settings')
        .eq('user_id', userId)
        .single();
      
      const currentSettings = existing?.settings || {};
      const tableLayouts = currentSettings.tableLayouts || {};
      
      // Atualizar apenas as larguras da tela específica
      const updatedSettings = {
        ...currentSettings,
        tableLayouts: {
          ...tableLayouts,
          [screenKey]: {
            ...tableLayouts[screenKey],
            widths,
          },
        },
      };
      
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: userId,
          settings: updatedSettings,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        });
      
      if (error) {
        console.warn('Erro ao salvar no Supabase, usando localStorage:', error);
        this.saveWidthsToLocalStorage(screenKey, widths);
        return;
      }
      
      // Também salvar no localStorage como backup
      this.saveWidthsToLocalStorage(screenKey, widths);
    } catch (error) {
      console.warn('Erro ao salvar larguras das colunas:', error);
      this.saveWidthsToLocalStorage(screenKey, widths);
    }
  },

  /**
   * Busca larguras do localStorage
   */
  getWidthsFromLocalStorage(screenKey: string): Record<ColumnKey, number> | null {
    try {
      const localKey = `column_widths_${screenKey}`;
      const stored = window.localStorage.getItem(localKey);
      if (stored) {
        return JSON.parse(stored) as Record<ColumnKey, number>;
      }
    } catch (error) {
      console.warn('Erro ao ler localStorage:', error);
    }
    return null;
  },

  /**
   * Salva larguras no localStorage
   */
  saveWidthsToLocalStorage(screenKey: string, widths: Record<ColumnKey, number>): void {
    try {
      const localKey = `column_widths_${screenKey}`;
      window.localStorage.setItem(localKey, JSON.stringify(widths));
    } catch (error) {
      console.warn('Erro ao salvar no localStorage:', error);
    }
  },

  /**
   * Remove configurações salvas (reset)
   */
  async clearWidths(userId: string, screenKey: string): Promise<void> {
    try {
      // Limpar localStorage
      const localKey = `column_widths_${screenKey}`;
      window.localStorage.removeItem(localKey);
      
      const { data: auth } = await supabase.auth.getSession();
      const user = auth.session?.user || null;
      
      if (!user || !userId) {
        return;
      }
      
      // Buscar configurações existentes
      const { data: existing } = await supabase
        .from('user_settings')
        .select('settings')
        .eq('user_id', userId)
        .single();
      
      if (!existing?.settings?.tableLayouts?.[screenKey]) {
        return; // Não há nada para remover
      }
      
      const currentSettings = existing.settings;
      const tableLayouts = { ...currentSettings.tableLayouts };
      
      // Remover configurações da tela específica
      delete tableLayouts[screenKey];
      
      const updatedSettings = {
        ...currentSettings,
        tableLayouts,
      };
      
      await supabase
        .from('user_settings')
        .upsert({
          user_id: userId,
          settings: updatedSettings,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        });
    } catch (error) {
      console.warn('Erro ao limpar larguras das colunas:', error);
    }
  },
};