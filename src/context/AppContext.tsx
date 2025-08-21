import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, ModalState } from '@/types/types';
import { ConfirmationModalData } from '@/components/ConfirmationModal';

interface AppContextType {
  // UI State
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  settings: Settings;
  setSettings: (settings: Settings) => void;
  
  // Navigation
  setCurrentPage: (page: string, state?: any) => void;
  
  // Modals
  openModal: (modal: string, data?: any) => void;
  modalState: ModalState;
  setModalState: (state: ModalState) => void;
  
  // Toast and Confirmation
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  setConfirmation: (data: ConfirmationModalData | null) => void;
  
  // Profile
  profilePicture: string | null;
  setProfilePicture: (picture: string | null) => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

interface AppProviderProps {
  children: ReactNode;
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  onSetConfirmation: (data: ConfirmationModalData | null) => void;
  profilePicture: string | null;
  setProfilePicture: (picture: string | null) => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  modalState: ModalState;
  setModalState: (state: ModalState) => void;
}

export const AppProvider: React.FC<AppProviderProps> = ({ 
  children, 
  onShowToast, 
  onSetConfirmation,
  profilePicture,
  setProfilePicture,
  theme,
  setTheme,
  modalState,
  setModalState
}) => {
  const navigate = useNavigate();
  
  // UI states
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [settings, setSettings] = useState<Settings>({ showPercentageChange: false });

  // Load settings from localStorage
  useEffect(() => {
    try {
      const settingsItem = window.localStorage.getItem('settings');
      if (settingsItem) {
        setSettings(JSON.parse(settingsItem));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }, []);

  // Save settings to localStorage
  useEffect(() => {
    try {
      window.localStorage.setItem('settings', JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }, [settings]);

  const setCurrentPage = (page: string, state?: any) => {
    const routeMap: Record<string, string> = {
      'resumo': '/app/resumo',
      'contas-extrato': '/app/contas',
      'fluxo': '/app/fluxo',
      'cartoes': '/app/cartoes',
      'investimentos': '/app/investimentos',
      'perfil': '/app/perfil',
      'calculadora-juros-compostos': '/app/calculadora-juros-compostos',
      'calculadora-reserva-emergencia': '/app/calculadora-reserva-emergencia'
    };
    navigate(routeMap[page] || '/app/resumo', { state });
  };

  const openModal = (modal: string, data?: any) => {
    setModalState({ modal, data });
  };

  return (
    <AppContext.Provider value={{
      selectedMonth,
      setSelectedMonth,
      settings,
      setSettings,
      setCurrentPage,
      openModal,
      modalState,
      setModalState,
      showToast: onShowToast,
      setConfirmation: onSetConfirmation,
      profilePicture,
      setProfilePicture,
      theme,
      setTheme
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};