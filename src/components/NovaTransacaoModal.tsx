import React, { useState, useEffect, useMemo } from 'react';
import { ContaBancaria, Categoria, TransacaoBanco, TipoCategoria } from '@/types/types';
import Modal from '@/components/Modal';
import CurrencyInput from '@/components/CurrencyInput';
import { ChevronDown } from 'lucide-react';

type FormType = TipoCategoria.Saida | TipoCategoria.Entrada | TipoCategoria.Transferencia;

interface NovaTransacaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transacao: Omit<TransacaoBanco, 'id' | 'createdAt' | 'updatedAt' | 'tipo'>) => void;
  onSaveTransferencia: (data: { origem_id: string; destino_id: string; valor: number; data: string; descricao: string; }) => void;
  contas: ContaBancaria[];
  categorias: Categoria[];
}

const getTodayString = () => new Date().toISOString().split('T')[0];

const NovaTransacaoModal: React.FC<NovaTransacaoModalProps> = ({
  isOpen, onClose, onSave, onSaveTransferencia, contas, categorias
}) => {
  const [formType, setFormType] = useState<FormType>(TipoCategoria.Saida);
  
  // State for all form types
  const [contaId, setContaId] = useState('');
  const [contaDestinoId, setContaDestinoId] = useState('');
  const [data, setData] = useState(getTodayString());
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [realizado, setRealizado] = useState(true);
  const [isRecorrente, setIsRecorrente] = useState(false);
  const [frequencia, setFrequencia] = useState<'mensal' | 'anual'>('mensal');

  const categoriasFiltradas = useMemo(() => {
    return categorias.filter(c => c.tipo === formType && !c.sistema);
  }, [categorias, formType]);

  const contasAtivas = useMemo(() => contas.filter(c => c.ativo), [contas]);
  const contasDestino = useMemo(() => contasAtivas.filter(c => c.id !== contaId), [contasAtivas, contaId]);

  // Reset form state when modal opens or form type changes
  useEffect(() => {
    if (isOpen) {
      setContaId(contasAtivas.length > 0 ? contasAtivas[0].id : '');
      setData(getTodayString());
      setDescricao('');
      setValor('');
      setRealizado(true);
      setIsRecorrente(false);
      setFrequencia('mensal');

      if (formType === TipoCategoria.Transferencia) {
        setContaDestinoId(contasDestino.length > 0 ? contasDestino[0].id : '');
      } else {
        setCategoriaId(categoriasFiltradas.length > 0 ? categoriasFiltradas[0].id : '');
      }
    }
  }, [isOpen]);
  
  // Auto-select first available option when dependencies change
  useEffect(() => {
    if (formType !== TipoCategoria.Transferencia) {
      setCategoriaId(categoriasFiltradas.length > 0 ? categoriasFiltradas[0].id : '');
    }
  }, [formType, categoriasFiltradas]);

  useEffect(() => {
    setContaDestinoId(contasDestino.length > 0 ? contasDestino[0].id : '');
  }, [contaId, contasDestino]);
  
  const handleSetFormType = (type: FormType) => {
    setFormType(type);
    // Reset fields that are not shared
    setDescricao('');
    setValor('');
    setIsRecorrente(false);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const valorNum = parseFloat(valor) / 100;

    if (formType === TipoCategoria.Transferencia) {
      if (!contaId || !contaDestinoId || !valor || valorNum <= 0 || contaId === contaDestinoId) {
        alert("Por favor, preencha todos os campos da transferência corretamente. A conta de origem e destino devem ser diferentes.");
        return;
      }
      onSaveTransferencia({
        origem_id: contaId,
        destino_id: contaDestinoId,
        valor: valorNum,
        data,
        descricao: descricao.trim(),
      });
    } else {
      if (!contaId || !descricao.trim() || !valor || !categoriaId || valorNum <= 0) {
        alert("Por favor, preencha todos os campos corretamente.");
        return;
      }
      onSave({
        conta_id: contaId,
        data,
        valor: valorNum,
        categoria_id: categoriaId,
        descricao: descricao.trim(),
        previsto: !realizado,
        realizado,
        recorrencia: isRecorrente ? frequencia : null,
      });
    }
    onClose();
  };
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nova Transação"
      footer={
        <>
          <button onClick={onClose} className="bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-white font-bold py-2 px-4 rounded-lg">Cancelar</button>
          <button type="submit" form="nova-transacao-form" className="bg-gradient-to-r from-[#19CF67] to-[#00DE5F] hover:from-[#16B359] hover:to-[#00C454] text-white font-bold py-2 px-4 rounded-lg">Salvar</button>
        </>
      }
    >
      <form id="nova-transacao-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="flex space-x-2 bg-gray-100 dark:bg-gray-900/50 p-1 rounded-lg">
          <button type="button" onClick={() => handleSetFormType(TipoCategoria.Saida)} className={`flex-1 text-center p-2 rounded-md cursor-pointer text-sm font-semibold transition-colors ${formType === TipoCategoria.Saida ? 'bg-red-500 text-white' : 'text-gray-800 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700'}`}>Despesa</button>
          <button type="button" onClick={() => handleSetFormType(TipoCategoria.Entrada)} className={`flex-1 text-center p-2 rounded-md cursor-pointer text-sm font-semibold transition-colors ${formType === TipoCategoria.Entrada ? 'bg-gradient-to-r from-[#19CF67] to-[#00DE5F] text-white' : 'text-gray-800 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700'}`}>Receita</button>
          <button type="button" onClick={() => handleSetFormType(TipoCategoria.Transferencia)} disabled={contasAtivas.length < 2} title={contasAtivas.length < 2 ? "É necessário ter pelo menos duas contas ativas para transferir." : ""} className={`flex-1 text-center p-2 rounded-md cursor-pointer text-sm font-semibold transition-colors ${formType === TipoCategoria.Transferencia ? 'bg-yellow-500 text-white' : 'text-gray-800 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700'} disabled:opacity-50 disabled:cursor-not-allowed`}>Transferência</button>
        </div>
        
        {formType === TipoCategoria.Transferencia ? (
            // --- TRANSFER FORM ---
            <div className="space-y-4 animate-fade-in">
                <div className="grid grid-cols-2 gap-4">
                    <div className="relative">
                        <label htmlFor="conta-origem" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Origem</label>
                        <select id="conta-origem" value={contaId} onChange={e => setContaId(e.target.value)} className="w-full bg-gray-100 dark:bg-gray-700 p-2 pl-3 pr-10 rounded-lg appearance-none text-gray-900 dark:text-white">
                            {contasAtivas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-9 pointer-events-none text-gray-400" size={18}/>
                    </div>
                    <div className="relative">
                        <label htmlFor="conta-destino" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Destino</label>
                        <select id="conta-destino" value={contaDestinoId} onChange={e => setContaDestinoId(e.target.value)} className="w-full bg-gray-100 dark:bg-gray-700 p-2 pl-3 pr-10 rounded-lg appearance-none text-gray-900 dark:text-white">
                            {contasDestino.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-9 pointer-events-none text-gray-400" size={18}/>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label htmlFor="valor-transferencia" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Valor</label>
                        <CurrencyInput id="valor-transferencia" value={valor} onValueChange={setValor} placeholder="R$ 0,00" className="w-full bg-gray-100 dark:bg-gray-700 p-2 rounded-lg text-gray-900 dark:text-white"/>
                    </div>
                    <div>
                        <label htmlFor="data-transferencia" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data</label>
                        <input type="date" id="data-transferencia" value={data} onChange={e => setData(e.target.value)} className="w-full bg-gray-100 dark:bg-gray-700 p-2 rounded-lg text-gray-900 dark:text-white"/>
                    </div>
                </div>
                 <div>
                    <label htmlFor="descricao-transferencia" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descrição (Opcional)</label>
                    <input type="text" id="descricao-transferencia" value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Ex: Pagamento, Reserva" className="w-full bg-gray-100 dark:bg-gray-700 p-2 rounded-lg text-gray-900 dark:text-white"/>
                </div>
            </div>
        ) : (
            // --- EXPENSE / INCOME FORM ---
            <div className="space-y-4 animate-fade-in">
                <div className="grid grid-cols-2 gap-4">
                    <div className="relative">
                        <label htmlFor="conta" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Conta</label>
                        <select id="conta" value={contaId} onChange={e => setContaId(e.target.value)} className="w-full bg-gray-100 dark:bg-gray-700 p-2 pl-3 pr-10 rounded-lg appearance-none text-gray-900 dark:text-white">
                            {contasAtivas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-9 pointer-events-none text-gray-400" size={18}/>
                    </div>
                    <div>
                        <label htmlFor="data-transacao" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data</label>
                        <input type="date" id="data-transacao" value={data} onChange={e => setData(e.target.value)} className="w-full bg-gray-100 dark:bg-gray-700 p-2 rounded-lg text-gray-900 dark:text-white"/>
                    </div>
                </div>
                <div>
                  <label htmlFor="descricao-transacao" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descrição</label>
                  <input type="text" id="descricao-transacao" value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Ex: Salário, Aluguel" className="w-full bg-gray-100 dark:bg-gray-700 p-2 rounded-lg text-gray-900 dark:text-white"/>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="valor-transacao" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Valor</label>
                        <CurrencyInput id="valor-transacao" value={valor} onValueChange={setValor} placeholder="R$ 0,00" className="w-full bg-gray-100 dark:bg-gray-700 p-2 rounded-lg text-gray-900 dark:text-white"/>
                    </div>
                    <div className="relative">
                        <label htmlFor="categoria-transacao" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Categoria</label>
                        <select id="categoria-transacao" value={categoriaId} onChange={e => setCategoriaId(e.target.value)} className="w-full bg-gray-100 dark:bg-gray-700 p-2 pl-3 pr-10 rounded-lg appearance-none text-gray-900 dark:text-white">
                            {categoriasFiltradas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-9 pointer-events-none text-gray-400" size={18}/>
                    </div>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                    <input type="checkbox" id="recorrente-check" checked={isRecorrente} onChange={e => setIsRecorrente(e.target.checked)} className="h-4 w-4 rounded bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-[#19CF67] focus:ring-[#19CF67]" />
                    <label htmlFor="recorrente-check" className="font-medium text-gray-700 dark:text-gray-300">Transação Recorrente</label>
                </div>
                {isRecorrente && (
                    <div className="relative pl-6 animate-fade-in">
                        <label htmlFor="frequencia" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Frequência</label>
                        <select id="frequencia" value={frequencia} onChange={e => setFrequencia(e.target.value as any)} className="w-full bg-gray-100 dark:bg-gray-700 p-2 pl-3 pr-10 rounded-lg appearance-none text-gray-900 dark:text-white">
                            <option value="mensal">Mensal</option>
                            <option value="anual">Anual</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-9 pointer-events-none text-gray-400" size={18}/>
                    </div>
                )}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                    <div className="flex space-x-2 bg-gray-100 dark:bg-gray-900/50 p-1 rounded-lg">
                        <button type="button" onClick={() => setRealizado(true)} className={`flex-1 text-center p-2 rounded-md cursor-pointer text-sm font-semibold transition-colors ${realizado ? 'bg-gradient-to-r from-[#19CF67] to-[#00DE5F] text-white' : 'text-gray-800 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700'}`}>Realizado</button>
                        <button type="button" onClick={() => setRealizado(false)} className={`flex-1 text-center p-2 rounded-md cursor-pointer text-sm font-semibold transition-colors ${!realizado ? 'bg-yellow-500 text-white' : 'text-gray-800 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700'}`}>Previsto</button>
                    </div>
                </div>
            </div>
        )}
      </form>
    </Modal>
  );
};

export default NovaTransacaoModal;