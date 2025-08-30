import React, { useState, useEffect } from 'react';
import CartoesPage from './CartoesPage';
import { useAccounts } from '@/hooks/useAccounts';
import { useTransactions } from '@/hooks/useTransactions';
import { useCards } from '@/hooks/useCards';
import { useCategories } from '@/hooks/useCategories';
import { useAppContext } from '@/context/AppContext';
import { transactionsService } from '@/services/transactionsService';

export default function CartoesPageWrapper() {
  const { contas } = useAccounts();
  const { transacoes, addPayment } = useTransactions();
  const { cartoes, compras, parcelas, addCartao, updateCartao, deleteCartao, deleteCompraCartao, markParcelasAsPaid, unmarkParcelasAsPaid, fixParcelasPagasStatus } = useCards();
  const { categorias } = useCategories();
  const { selectedMonth, setSelectedMonth, openModal, setCurrentPage, setConfirmation, modalState, setModalState } = useAppContext();
  
  // Local state for page-specific functionality
  const [selectedView, setSelectedView] = useState<'all' | string>('all');
  
  // Corrigir status das parcelas automaticamente quando dados mudarem
  useEffect(() => {
    if (cartoes.length > 0 && transacoes.length > 0 && parcelas.length > 0) {
      console.log('🔍 Verificando e corrigindo status das parcelas automaticamente...');
      
      const [year, month] = selectedMonth.split('-').map(Number);
      const competencia = `${year}-${String(month).padStart(2, '0')}`;
      
      // Para cada cartão, verificar se o status das parcelas está correto
      cartoes.forEach(cartao => {
        // Calcular valor pago baseado nas transações
        const pagamentosTransacoes = transacoes.filter(t => 
          t.meta_pagamento && 
          t.cartao_id === cartao.id && 
          t.competencia_fatura === competencia
        );
        const valorPago = pagamentosTransacoes.reduce((sum, t) => sum + t.valor, 0);
        
        // Buscar parcelas desta competência
        const parcelasDaCompetencia = parcelas.filter(p => {
          const compra = compras.find(c => c.id === p.compra_id);
          return compra?.cartao_id === cartao.id && p.competencia_fatura === competencia;
        });
        
        if (parcelasDaCompetencia.length > 0) {
          const totalFatura = parcelasDaCompetencia.reduce((sum, p) => sum + p.valor_parcela, 0);
          const isCompleto = Math.abs(valorPago - totalFatura) <= 0.01 || valorPago > totalFatura;
          
          // Verificar se alguma parcela está com status incorreto
          const parcelasComStatusIncorreto = parcelasDaCompetencia.filter(p => {
            const deveSer = isCompleto;
            const atual = p.paga === true;
            return atual !== deveSer;
          });
          
          if (parcelasComStatusIncorreto.length > 0) {
            console.log(`🔧 Auto-corrigindo ${cartao.apelido}: ${parcelasComStatusIncorreto.length} parcelas com status incorreto`);
            console.log(`💰 Valor pago: R$ ${valorPago.toFixed(2)} | Total fatura: R$ ${totalFatura.toFixed(2)} | Completo: ${isCompleto}`);
            fixParcelasPagasStatus(cartao.id, competencia, valorPago);
          }
        }
      });
    }
  }, [cartoes, transacoes, parcelas, compras, selectedMonth, fixParcelasPagasStatus]);

  const pagarFatura = (cartaoId: string, contaId: string, valor: number, data: string, competencia: string) => {
    const cartao = cartoes.find(c => c.id === cartaoId);
    if (cartao) {
      // Cria a transação de pagamento
      addPayment(cartaoId, contaId, valor, data, competencia, cartao.apelido, categorias, parcelas, compras);
      
      // Calcular total da fatura
      const parcelasDaCompetencia = parcelas.filter(p => {
        const compra = compras.find(c => c.id === p.compra_id);
        return compra && compra.cartao_id === cartaoId && p.competencia_fatura === competencia;
      });
      const totalFatura = parcelasDaCompetencia.reduce((sum, p) => sum + p.valor_parcela, 0);
      
      // Usar a nova função que corrige o status baseado no valor pago
      console.log('🔧 Corrigindo status das parcelas baseado no valor pago');
      fixParcelasPagasStatus(cartaoId, competencia, valor);
    }
  };

  const desfazerPagamento = async (undoData: any) => {
    console.log('🔄 Iniciando desfazer pagamento:', undoData);
    
    const { faturaData, motivo } = undoData;
    console.log('📋 Dados da fatura:', faturaData);
    console.log('🎯 Cartões disponíveis:', cartoes.map(c => ({ id: c.id, apelido: c.apelido })));
    
    const cartao = cartoes.find(c => c.apelido === faturaData.cartaoNome);
    const conta = contas.find(c => c.id === cartao?.conta_id_padrao) || contas.find(c => c.ativo);
    
    console.log('💳 Cartão encontrado:', cartao);
    console.log('🏦 Conta encontrada:', conta);
    
    if (!cartao || !conta) {
      throw new Error('Cartão ou conta não encontrados');
    }

    // Buscar a transação de pagamento
    console.log('🔍 Buscando transação de pagamento...');
    console.log('🔍 Filtros: meta_pagamento=true, cartao_id=' + cartao.id + ', competencia=' + faturaData.competencia);
    console.log('🔍 Transações disponíveis:', transacoes.filter(t => t.meta_pagamento).map(t => ({
      id: t.id,
      cartao_id: t.cartao_id,
      competencia_fatura: t.competencia_fatura,
      valor: t.valor,
      descricao: t.descricao
    })));
    
    const transacaoPagamento = transacoes.find(t => 
      t.meta_pagamento && 
      t.cartao_id === cartao.id && 
      t.competencia_fatura === faturaData.competencia
    );

    console.log('💰 Transação de pagamento encontrada:', transacaoPagamento);

    if (!transacaoPagamento) {
      throw new Error('Transação de pagamento não encontrada');
    }

    // Buscar categoria de estorno específica
    let estornoCategoria = categorias.find(c => 
      c.sistema && c.nome === 'Estorno' && c.tipo === 'Entrada'
    );
    
    // TEMPORARIAMENTE: usar qualquer categoria de entrada como "Estorno"
    if (!estornoCategoria) {
      console.warn('⚠️ Categoria "Estorno" não encontrada, criando descrição manual');
      const categoriaEntrada = categorias.find(c => c.tipo === 'Entrada');
      estornoCategoria = categoriaEntrada;
    }
    
    const categoriaId = estornoCategoria?.id;
    
    console.log('🏷️ Categoria de estorno final:', estornoCategoria);
    console.log('🏷️ ID final da categoria:', categoriaId);
    
    if (!categoriaId) {
      throw new Error('Nenhuma categoria de entrada encontrada para o estorno');
    }

    // Mapear motivos
    const motivoLabels: Record<string, string> = {
      'data_incorreta': 'Pagamento em data incorreta',
      'valor_incorreto': 'Valor incorreto', 
      'duplicacao': 'Pagamento duplicado',
      'conta_errada': 'Conta incorreta',
      'outros': 'Outros motivos'
    };

    const motivoDescricao = motivoLabels[motivo] || 'Motivo não especificado';
    console.log('📝 Motivo:', motivoDescricao);

    const dadosEstorno = {
      transacaoPagamentoId: transacaoPagamento.id,
      cartaoId: cartao.id,
      contaId: conta.id,
      valor: faturaData.valorPagamento || faturaData.total_pago,
      motivo: motivoDescricao,
      competencia: faturaData.competencia,
      cartaoNome: cartao.apelido,
      categoriaId
    };
    
    console.log('📤 Enviando dados para processarEstorno:', dadosEstorno);

    try {
      const resultado = await transactionsService.processarEstorno(dadosEstorno);
      console.log('✅ Estorno processado com sucesso:', resultado);
      
      // Agora preciso desmarcar as parcelas como não pagas
      console.log('🔄 Desmarcando parcelas como pagas...');
      unmarkParcelasAsPaid(cartao.id, faturaData.competencia);
      
      console.log('🎉 Processo concluído! Fatura deve estar pendente agora.');
      
      // Forçar atualização dos dados via hooks existentes
      // Os hooks devem detectar as mudanças automaticamente
      console.log('🔄 Aguarde alguns segundos para ver as mudanças na interface...');
    } catch (error) {
      console.error('❌ Erro ao processar estorno:', error);
      throw error;
    }
  };

  return (
    <CartoesPage
      cartoes={cartoes}
      contas={contas}
      categorias={categorias}
      compras={compras}
      parcelas={parcelas}
      transacoes={transacoes}
      addCartao={addCartao}
      updateCartao={updateCartao}
      deleteCartao={deleteCartao}
      deleteCompraCartao={deleteCompraCartao}
      pagarFatura={pagarFatura}
      desfazerPagamento={desfazerPagamento}
      fixParcelasPagasStatus={fixParcelasPagasStatus}
      navigationState={null}
      clearNavigationState={() => {}}
      setConfirmation={setConfirmation}
      setCurrentPage={setCurrentPage}
      modalState={modalState}
      openModal={openModal}
      closeModal={() => setModalState({ modal: null, data: null })}
      selectedView={selectedView}
      setSelectedView={setSelectedView}
      selectedMonth={selectedMonth}
      onMonthChange={setSelectedMonth}
    />
  );
}