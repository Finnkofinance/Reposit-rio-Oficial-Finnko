import { Settings } from '@/types/types';

export const persistenceService = {
  // Generic persistence hook
  usePersistentState: <T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] => {
    const [state, setState] = React.useState<T>(() => {
      try {
        const item = window.localStorage.getItem(key);
        return item ? JSON.parse(item) : initialValue;
      } catch (error) {
        console.error(`Error reading localStorage key "${key}":`, error);
        return initialValue;
      }
    });

    React.useEffect(() => {
      try {
        const serializedState = JSON.stringify(state);
        window.localStorage.setItem(key, serializedState);
      } catch (error) {
        console.error(`Error setting localStorage key "${key}":`, error);
      }
    }, [key, state]);

    return [state, setState];
  },

  // Settings
  getSettings: (): Settings => {
    try {
      const item = window.localStorage.getItem('settings');
      return item ? JSON.parse(item) : { showPercentageChange: false };
    } catch (error) {
      console.error('Error reading settings from localStorage:', error);
      return { showPercentageChange: false };
    }
  },

  saveSettings: (settings: Settings): void => {
    try {
      window.localStorage.setItem('settings', JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving settings to localStorage:', error);
    }
  },

  // Profile Picture
  getProfilePicture: (): string | null => {
    try {
      const item = window.localStorage.getItem('profilePicture');
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('Error reading profile picture from localStorage:', error);
      return null;
    }
  },

  saveProfilePicture: (picture: string | null): void => {
    try {
      window.localStorage.setItem('profilePicture', JSON.stringify(picture));
    } catch (error) {
      console.error('Error saving profile picture to localStorage:', error);
    }
  },

  // Theme
  getTheme: (): 'light' | 'dark' => {
    try {
      const item = window.localStorage.getItem('theme');
      return item ? JSON.parse(item) : 'dark';
    } catch (error) {
      console.error('Error reading theme from localStorage:', error);
      return 'dark';
    }
  },

  saveTheme: (theme: 'light' | 'dark'): void => {
    try {
      window.localStorage.setItem('theme', JSON.stringify(theme));
    } catch (error) {
      console.error('Error saving theme to localStorage:', error);
    }
  },

  // Export all data
  exportAllData: (data: any): void => {
    try {
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const date = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `finnko_backup_${date}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export error:", error);
      throw error;
    }
  },

  // Clear all data
  clearAllData: (): void => {
    try {
      const keys = [
        'contas', 'transacoes', 'cartoes', 'categorias', 'compras', 'parcelas',
        'objetivos', 'ativos', 'alocacoes', 'profilePicture', 'settings', 'theme'
      ];
      keys.forEach(key => window.localStorage.removeItem(key));
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  }
};

// Import React here to avoid circular dependencies
import React from 'react';