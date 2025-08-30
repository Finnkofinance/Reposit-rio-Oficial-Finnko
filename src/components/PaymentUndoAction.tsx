import React, { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { formatCurrency } from '@/utils/format';

interface PaymentUndoActionProps {
  fatura: {
    competencia: string;
    total: number;
    total_pago: number;
    restante: number;
    status: 'Aberta' | 'Paga' | 'Parcial';
    dataPagamento?: string;
    valorPagamento?: number;
    cartaoNome?: string;
  };
  onUndo: (undoData: {
    faturaData: any;
    motivo: string;
  }) => Promise<void>;
}

const PaymentUndoAction: React.FC<PaymentUndoActionProps> = ({ fatura, onUndo }) => {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [selectedReason, setSelectedReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const undoReasons = [
    { value: 'data_incorreta', label: 'Data incorreta' },
    { value: 'valor_incorreto', label: 'Valor incorreto' },
    { value: 'duplicacao', label: 'Pagamento duplicado' },
    { value: 'conta_errada', label: 'Conta errada' },
    { value: 'outros', label: 'Outros' }
  ];

  const canUndo = () => {
    if (!fatura.dataPagamento || fatura.status !== 'Paga') return false;
    
    const daysSincePay = Math.floor(
      (Date.now() - new Date(fatura.dataPagamento).getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysSincePay <= 30;
  };

  const handleUndo = async () => {
    if (!selectedReason) return;
    
    setIsProcessing(true);
    try {
      await onUndo({
        faturaData: fatura,
        motivo: selectedReason
      });
      setShowConfirmation(false);
      setSelectedReason('');
    } catch (error) {
      console.error('Erro ao desfazer pagamento:', error);
      alert('Erro ao desfazer pagamento. Tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (!isProcessing) {
      setShowConfirmation(false);
      setSelectedReason('');
    }
  };

  if (!canUndo()) return null;

  return (
    <>
      <button 
        onClick={() => setShowConfirmation(true)}
        className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-red-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
        title="Desfazer pagamento"
      >
        <RotateCcw size={14} />
        <span>Desfazer</span>
      </button>

      {showConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
            {/* Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Desfazer Pagamento
              </h3>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6">
              {/* Payment Info */}
              <div className="text-center py-4 border-b border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  {fatura.cartaoNome}
                </p>
                <p className="text-2xl font-semibold text-red-600 dark:text-red-400">
                  {formatCurrency(fatura.valorPagamento || fatura.total_pago)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Competência: {new Date(fatura.competencia + '-01').toLocaleDateString('pt-BR', { 
                    month: 'long', 
                    year: 'numeric' 
                  })}
                </p>
              </div>

              {/* Reason Selection */}
              <div>
                <label htmlFor="undo-reason" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Por que desfazer? *
                </label>
                <select
                  id="undo-reason"
                  value={selectedReason}
                  onChange={(e) => setSelectedReason(e.target.value)}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  disabled={isProcessing}
                >
                  <option value="">Selecione o motivo</option>
                  {undoReasons.map(reason => (
                    <option key={reason.value} value={reason.value}>
                      {reason.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Warning */}
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <span className="font-medium">Atenção:</span> Esta ação criará uma transação de estorno e a fatura voltará ao status pendente.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleClose}
                disabled={isProcessing}
                className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                onClick={handleUndo}
                disabled={isProcessing || !selectedReason}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Processando...
                  </>
                ) : (
                  'Desfazer Pagamento'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PaymentUndoAction;