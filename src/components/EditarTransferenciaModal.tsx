import React, { useState, useEffect } from 'react';
import { TransacaoBanco } from '@/types/types';
import Modal from '@/components/Modal';
import CurrencyInput from '@/components/CurrencyInput';

interface EditarTransferenciaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { originalTxId: string; valor: number; data: string; descricao: string; }) => void;
  onDelete?: (id: string) => void;
  transferenciaToEdit: TransacaoBanco;
}

const EditarTransferenciaModal: React.FC<EditarTransferenciaModalProps> = ({
  isOpen, onClose, onSave, onDelete, transferenciaToEdit
}) => {
  const [data, setData] = useState('');
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');

  useEffect(() => {
    if (isOpen && transferenciaToEdit) {
      setData(transferenciaToEdit.data);
      setValor(String(transferenciaToEdit.valor * 100));
      // Extract common description part
      const descMatch = transferenciaToEdit.descricao.match(/(?:Transf\. (?:p\/|de) .*: )?(.*)/);
      setDescricao(descMatch ? descMatch[1] : transferenciaToEdit.descricao);
    }
  }, [isOpen, transferenciaToEdit]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const valorNum = parseFloat(valor) / 100;
    if (!data || valorNum <= 0) {
      alert("Por favor, preencha todos os campos corretamente.");
      return;
    }

    onSave({
        originalTxId: transferenciaToEdit.id,
        valor: valorNum,
        data,
        descricao: descricao.trim(),
    });
    onClose();
  };
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Editar Transferência"
      footer={
        <div className="flex justify-between w-full">
          <div>
            {onDelete && (
              <button type="button" onClick={() => onDelete(transferenciaToEdit.id)} className="sm:hidden bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg">Excluir</button>
            )}
          </div>
          <div className="space-x-2">
            <button onClick={onClose} className="bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-white font-bold py-2 px-4 rounded-lg">Cancelar</button>
            <button type="submit" form="editar-transferencia-form" className="bg-gradient-to-r from-[#19CF67] to-[#00DE5F] hover:from-[#16B359] hover:to-[#00C454] text-white font-bold py-2 px-4 rounded-lg">Salvar Alterações</button>
          </div>
        </div>
      }
    >
      <form id="editar-transferencia-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
            <div>
                <label htmlFor="valor-transferencia-edit" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Valor</label>
                <CurrencyInput id="valor-transferencia-edit" value={valor} onValueChange={setValor} className="w-full bg-gray-100 dark:bg-gray-700 p-2 rounded-lg text-gray-900 dark:text-white"/>
            </div>
            <div>
                <label htmlFor="data-transferencia-edit" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data</label>
                <input type="date" id="data-transferencia-edit" value={data} onChange={e => setData(e.target.value)} className="w-full bg-gray-100 dark:bg-gray-700 p-2 rounded-lg text-gray-900 dark:text-white"/>
            </div>
        </div>
        <div>
          <label htmlFor="descricao-transferencia-edit" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descrição</label>
          <input type="text" id="descricao-transferencia-edit" value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Ex: Pagamento, Reserva" className="w-full bg-gray-100 dark:bg-gray-700 p-2 rounded-lg text-gray-900 dark:text-white"/>
        </div>
      </form>
    </Modal>
  );
};

export default EditarTransferenciaModal;