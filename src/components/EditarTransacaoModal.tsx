import React, { useState, useEffect, useMemo } from 'react';
import { ContaBancaria, Categoria, TransacaoBanco, TipoCategoria } from '@/types/types';
import Modal from '@/components/Modal';
import CurrencyInput from '@/components/CurrencyInput';
import { ChevronDown } from 'lucide-react';

interface EditarTransacaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transacao: TransacaoBanco) => void;
  onDelete?: (id: string) => void;
  transacaoToEdit: TransacaoBanco;
  contas: ContaBancaria[];
  categorias: Categoria[];
}

const EditarTransacaoModal: React.FC<EditarTransacaoModalProps> = ({
  isOpen, onClose, onSave, onDelete, transacaoToEdit, contas, categorias
}) => {
  const [tipo, setTipo] = useState<TipoCategoria.Saida | TipoCategoria.Entrada>(TipoCategoria.Saida);
  const [contaId, setContaId] = useState('');
  const [data, setData] = useState('');
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [realizado, setRealizado] = useState(true);

  const categoriasFiltradas = useMemo(() => {
    return categorias.filter(c => c.tipo === tipo && !c.sistema);
  }, [categorias, tipo]);

  useEffect(() => {
    if (isOpen && transacaoToEdit) {
      setTipo(transacaoToEdit.tipo as TipoCategoria.Saida | TipoCategoria.Entrada);
      setContaId(transacaoToEdit.conta_id);
      setData(transacaoToEdit.data);
      setDescricao(transacaoToEdit.descricao);
      setValor(String(transacaoToEdit.valor * 100));
      setCategoriaId(transacaoToEdit.categoria_id);
      setRealizado(transacaoToEdit.realizado);
    }
  }, [isOpen, transacaoToEdit]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const valorNum = parseFloat(valor) / 100;
    if (!contaId || !descricao.trim() || !valor || !categoriaId || valorNum <= 0) {
      alert("Por favor, preencha todos os campos corretamente.");
      return;
    }

    onSave({
      ...transacaoToEdit,
      conta_id: contaId,
      data,
      valor: valorNum,
      categoria_id: categoriaId,
      descricao: descricao.trim(),
      previsto: !realizado,
      realizado,
    });
    onClose();
  };
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Editar Transação"
      footer={
        <div className="flex justify-between w-full">
          <div>
            {onDelete && (
              <button type="button" onClick={() => onDelete(transacaoToEdit.id)} className="sm:hidden bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg">Excluir</button>
            )}
          </div>
          <div className="space-x-2">
            <button onClick={onClose} className="bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-white font-bold py-2 px-4 rounded-lg">Cancelar</button>
            <button type="submit" form="editar-transacao-form" className="bg-gradient-to-r from-[#19CF67] to-[#00DE5F] hover:from-[#16B359] hover:to-[#00C454] text-white font-bold py-2 px-4 rounded-lg">Salvar Alterações</button>
          </div>
        </div>
      }
    >
      <form id="editar-transacao-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="flex space-x-2 bg-gray-100 dark:bg-gray-900/50 p-1 rounded-lg">
          <button type="button" onClick={() => setTipo(TipoCategoria.Saida)} className={`flex-1 text-center p-2 rounded-md cursor-pointer text-sm font-semibold transition-colors ${tipo === TipoCategoria.Saida ? 'bg-red-500 text-white' : 'text-gray-800 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700'}`}>Despesa</button>
          <button type="button" onClick={() => setTipo(TipoCategoria.Entrada)} className={`flex-1 text-center p-2 rounded-md cursor-pointer text-sm font-semibold transition-colors ${tipo === TipoCategoria.Entrada ? 'bg-gradient-to-r from-[#19CF67] to-[#00DE5F] text-white' : 'text-gray-800 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700'}`}>Receita</button>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
            <div className="relative">
                <label htmlFor="conta-edit" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Conta</label>
                <select id="conta-edit" value={contaId} onChange={e => setContaId(e.target.value)} className="w-full bg-gray-100 dark:bg-gray-700 p-2 pl-3 pr-10 rounded-lg appearance-none text-gray-900 dark:text-white">
                    {contas.filter(c => c.ativo).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-9 pointer-events-none text-gray-400" size={18}/>
            </div>
            <div>
                <label htmlFor="data-transacao-edit" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data</label>
                <input type="date" id="data-transacao-edit" value={data} onChange={e => setData(e.target.value)} className="w-full bg-gray-100 dark:bg-gray-700 p-2 rounded-lg text-gray-900 dark:text-white"/>
            </div>
        </div>
        
        <div>
          <label htmlFor="descricao-transacao-edit" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descrição</label>
          <input type="text" id="descricao-transacao-edit" value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Ex: Salário, Aluguel" className="w-full bg-gray-100 dark:bg-gray-700 p-2 rounded-lg text-gray-900 dark:text-white"/>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
            <div>
                <label htmlFor="valor-transacao-edit" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Valor</label>
                <CurrencyInput id="valor-transacao-edit" value={valor} onValueChange={setValor} placeholder="R$ 0,00" className="w-full bg-gray-100 dark:bg-gray-700 p-2 rounded-lg text-gray-900 dark:text-white"/>
            </div>
            <div className="relative">
                <label htmlFor="categoria-transacao-edit" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Categoria</label>
                <select id="categoria-transacao-edit" value={categoriaId} onChange={e => setCategoriaId(e.target.value)} className="w-full bg-gray-100 dark:bg-gray-700 p-2 pl-3 pr-10 rounded-lg appearance-none text-gray-900 dark:text-white">
                    {categoriasFiltradas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-9 pointer-events-none text-gray-400" size={18}/>
            </div>
        </div>
        
        <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
            <div className="flex space-x-2 bg-gray-100 dark:bg-gray-900/50 p-1 rounded-lg">
                <button type="button" onClick={() => setRealizado(true)} className={`flex-1 text-center p-2 rounded-md cursor-pointer text-sm font-semibold transition-colors ${realizado ? 'bg-gradient-to-r from-[#19CF67] to-[#00DE5F] text-white' : 'text-gray-800 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700'}`}>Realizado</button>
                <button type="button" onClick={() => setRealizado(false)} className={`flex-1 text-center p-2 rounded-md cursor-pointer text-sm font-semibold transition-colors ${!realizado ? 'bg-yellow-500 text-white' : 'text-gray-800 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700'}`}>Previsto</button>
            </div>
        </div>
      </form>
    </Modal>
  );
};

export default EditarTransacaoModal;