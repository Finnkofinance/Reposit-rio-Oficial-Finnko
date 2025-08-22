import React, { useEffect, useState } from 'react';
import PerfilPage from './PerfilPage';
import { useCategories } from '@/hooks/useCategories';
import { useTransactions } from '@/hooks/useTransactions';
import { useCards } from '@/hooks/useCards';
import { useAppContext } from '@/context/AppContext';
import { Settings } from '@/types/types';
import { CATEGORIAS_PADRAO } from '@/constants.tsx';
import { supabase } from '@/lib/supabaseClient';

export default function PerfilPageWrapper() {
  const { categorias, addCategoria, updateCategoria, deleteCategoria } = useCategories();
  const { transacoes } = useTransactions();
  const { compras, parcelas } = useCards();
  const { settings, setSettings, openModal, modalState, setModalState, selectedMonth, setSelectedMonth, setConfirmation, showToast } = useAppContext() as any;

  const handleDeleteAllData = () => {
    setConfirmation({
      title: 'Apagar Todos os Dados',
      message: (
        <>
          <p className="text-red-400 font-semibold mb-2">Esta é uma ação irreversível.</p>
          <p>Você tem certeza absoluta que deseja apagar todos os seus dados? Todas as contas, transações, cartões e configurações serão perdidos permanentemente.</p>
        </>
      ),
      buttons: [
        {
          label: 'Cancelar',
          style: 'secondary',
          onClick: () => setConfirmation(null)
        },
        {
          label: 'Sim, Apagar Tudo',
          style: 'danger',
          onClick: async () => {
            try {
              const { data: auth } = await supabase.auth.getSession();
              if (auth.session?.user) {
                // Purge seguro no Supabase
                const { error } = await supabase.rpc('purge_user_data');
                if (error) throw error;
                showToast && showToast('Seus dados foram apagados com sucesso.', 'success');
              } else {
                // Modo demo/local
                const keys = ['contas','transacoes','cartoes','categorias','compras','parcelas','objetivos','ativos','alocacoes','profilePicture','settings','theme'];
                keys.forEach((k) => { try { window.localStorage.removeItem(k); } catch {} });
              }
            } catch (e) {
              console.error('Erro ao apagar dados:', e);
              showToast && showToast('Falha ao apagar dados.', 'error');
            } finally {
              setConfirmation(null);
              // Recarrega UI
              setTimeout(() => window.location.reload(), 300);
            }
          }
        }
      ]
    });
  };

  const handleExportData = () => {
    try {
      const data = {
        version: '1.0.0',
        contas: JSON.parse(window.localStorage.getItem('contas') || '[]'),
        transacoes: JSON.parse(window.localStorage.getItem('transacoes') || '[]'),
        cartoes: JSON.parse(window.localStorage.getItem('cartoes') || '[]'),
        categorias: JSON.parse(window.localStorage.getItem('categorias') || '[]'),
        compras: JSON.parse(window.localStorage.getItem('compras') || '[]'),
        parcelas: JSON.parse(window.localStorage.getItem('parcelas') || '[]'),
        objetivos: JSON.parse(window.localStorage.getItem('objetivos') || '[]'),
        ativos: JSON.parse(window.localStorage.getItem('ativos') || '[]'),
        alocacoes: JSON.parse(window.localStorage.getItem('alocacoes') || '[]'),
        profilePicture: JSON.parse(window.localStorage.getItem('profilePicture') || 'null'),
        settings: JSON.parse(window.localStorage.getItem('settings') || '{}'),
        theme: JSON.parse(window.localStorage.getItem('theme') || '"dark"')
      };
      
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
      console.error('Export error:', error);
    }
  };

  const handleImportData = (file: File) => {
    if (file.name.endsWith('.json')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const importedData = JSON.parse(event.target?.result as string);
          if (importedData.contas && importedData.transacoes && importedData.categorias) {
            // Save all data to localStorage
            Object.keys(importedData).forEach(key => {
              if (key !== 'version') {
                window.localStorage.setItem(key, JSON.stringify(importedData[key]));
              }
            });
            window.location.reload();
          }
        } catch (e) {
          console.error('Import error:', e);
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <PerfilPage
      categorias={categorias}
      transacoes={transacoes}
      compras={compras}
      parcelas={parcelas}
      addCategoria={addCategoria}
      updateCategoria={updateCategoria}
      deleteCategoria={deleteCategoria}
      handleDeleteAllData={handleDeleteAllData}
      handleExportData={handleExportData}
      handleImportData={handleImportData}
      settings={settings}
      setSettings={setSettings}
      navigationState={null}
      clearNavigationState={() => {}}
      modalState={modalState}
      openModal={openModal}
      closeModal={() => setModalState({ modal: null, data: null })}
      selectedView="all"
      setSelectedView={() => {}}
      selectedMonth={selectedMonth}
      onMonthChange={setSelectedMonth}
    />
  );
}