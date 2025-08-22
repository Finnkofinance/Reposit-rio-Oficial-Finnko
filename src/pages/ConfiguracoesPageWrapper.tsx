import React from 'react';
import ConfiguracoesPage from './ConfiguracoesPage';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabaseClient';

export default function ConfiguracoesPageWrapper() {
  const { setConfirmation, showToast } = useAppContext() as any;

  const handleDeleteAllData = async () => {
    try {
      const { data: auth } = await supabase.auth.getSession();
      const isLogged = !!auth.session?.user;
      // 1) Conta prévia (se logado)
      let counts: any = null;
      if (isLogged) {
        const { data: cData, error: cErr } = await supabase.rpc('count_user_data');
        if (!cErr) counts = cData || null;
      }

      const makeSummary = () => {
        if (!counts) return 'Esta ação é irreversível. Confirme para apagar permanentemente seus dados.';
        const parts = [
          `Contas: ${counts.contas || 0}`,
          `Cartões: ${counts.cartoes || 0}`,
          `Transações: ${counts.transacoes || 0}`,
          `Compras: ${counts.compras || 0}`,
          `Parcelas: ${counts.parcelas || 0}`,
          `Ativos: ${counts.ativos || 0}`,
          `Objetivos: ${counts.objetivos || 0}`,
          `Categorias: ${counts.categorias || 0}`,
        ].join(' • ');
        return `Esta ação é irreversível. Confirme para apagar permanentemente seus dados.\n\nResumo: ${parts}`;
      };

      setConfirmation({
        title: 'Apagar Todos os Dados',
        message: makeSummary(),
        buttons: [
          { label: 'Cancelar', style: 'secondary', onClick: () => setConfirmation(null) },
          {
            label: 'Apagar',
            style: 'danger',
            onClick: async () => {
              try {
                if (isLogged) {
                  const { data, error } = await supabase.rpc('purge_user_data');
                  if (error) throw error;
                  showToast && showToast('Seus dados foram apagados.', 'success');
                } else {
                  // modo demo/local: limpar localStorage
                  const keys = ['contas','transacoes','cartoes','categorias','compras','parcelas','objetivos','ativos','alocacoes','profilePicture','settings','theme'];
                  keys.forEach(k => { try { window.localStorage.removeItem(k); } catch {} });
                  showToast && showToast('Dados locais apagados.', 'success');
                }
              } catch (e) {
                console.error('Erro purge:', e);
                showToast && showToast('Falha ao apagar dados.', 'error');
              } finally {
                setConfirmation(null);
                setTimeout(() => window.location.reload(), 300);
              }
            }
          }
        ]
      });
    } catch (e) {
      console.error(e);
      showToast && showToast('Não foi possível iniciar a exclusão.', 'error');
    }
  };

  const handleExportData = () => {
    try {
      // Placeholder simples – mantenha seu export real aqui se necessário
      const data = { version: '1.0.0' };
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'backup.json'; a.click(); URL.revokeObjectURL(url);
    } catch {}
  };

  const handleImportData = (_file: File) => {};

  return (
    <ConfiguracoesPage
      handleDeleteAllData={handleDeleteAllData}
      handleExportData={handleExportData}
      handleImportData={handleImportData}
    />
  );
}


