import React, { useState, useEffect } from 'react';
import { Cartao, Categoria, CompraCartao, TipoCategoria } from '@/types/types';
import Modal from '@/components/Modal';
import CurrencyInput from '@/components/CurrencyInput';
import { ChevronDown } from 'lucide-react';

interface NovaCompraCartaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (compra: Omit<CompraCartao, 'id' | 'createdAt' | 'updatedAt' | 'parcelas_total'> & { parcelas: number }) => void;
  cartoes: Cartao[];
  categorias: Categoria[];
  defaultCartaoId?: string;
}

const getTodayString = () => new Date().toISOString().split('T')[0];

const NovaCompraCartaoModal: React.FC<NovaCompraCartaoModalProps> = ({
  isOpen, onClose, onSave, cartoes, categorias, defaultCartaoId
}) => {
  const [cartaoId, setCartaoId] = useState('');
  const [dataCompra, setDataCompra] = useState(getTodayString());
  const [descricao, setDescricao] = useState('');
  const [valorTotal, setValorTotal] = useState('');
  const [parcelas, setParcelas] = useState('1');
  const [categoriaId, setCategoriaId] = useState('');
  const [isRecorrente, setIsRecorrente] = useState(false);
  const [frequencia, setFrequencia] = useState<'mensal' | 'anual'>('mensal');

  useEffect(() => {
    if (isOpen) {
        const activeCards = cartoes;
        const initialCardId = defaultCartaoId && activeCards.some(c => c.id === defaultCartaoId)
            ? defaultCartaoId
            : activeCards.length > 0 ? activeCards[0].id : '';
        setCartaoId(initialCardId);

        const saidaCategorias = categorias.filter(c => c.tipo === TipoCategoria.Saida);
        setCategoriaId(saidaCategorias.length > 0 ? saidaCategorias[0].id : '');
        
        setDataCompra(getTodayString());
        setDescricao('');
        setValorTotal('');
        setParcelas('1');
        setIsRecorrente(false);
        setFrequencia('mensal');
    }
  }, [isOpen, cartoes, categorias, defaultCartaoId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const valorNum = parseFloat(valorTotal) / 100;
    const parcelasNum = parseInt(parcelas, 10);

    if (!cartaoId || !descricao.trim() || !valorTotal || !categoriaId || valorNum <= 0 || parcelasNum <= 0) {
      alert("Por favor, preencha todos os campos corretamente.");
      return;
    }

    onSave({
      cartao_id: cartaoId,
      data_compra: dataCompra,
      valor_total: valorNum,
      parcelas: isRecorrente ? 1 : parcelasNum,
      categoria_id: categoriaId,
      descricao: descricao.trim(),
      estorno: false,
      recorrencia: isRecorrente ? frequencia : null,
    });
    onClose();
  };
  
  const categoriasSaida = categorias.filter(c => c.tipo === TipoCategoria.Saida && !c.sistema);
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nova Compra no Cartão"
      footer={
        <>
          <button onClick={onClose} className="bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-white font-bold py-2 px-4 rounded-lg">Cancelar</button>
          <button type="submit" form="nova-compra-form" className="bg-gradient-to-r from-[#19CF67] to-[#00DE5F] hover:from-[#16B359] hover:to-[#00C454] text-white font-bold py-2 px-4 rounded-lg">Salvar Compra</button>
        </>
      }
    >
      <form id="nova-compra-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <label htmlFor="cartao" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cartão</label>
          <select id="cartao" value={cartaoId} onChange={e => setCartaoId(e.target.value)} className="w-full bg-gray-100 dark:bg-gray-700 p-2 pl-3 pr-10 rounded-lg appearance-none text-gray-900 dark:text-white">
            {cartoes.map(c => <option key={c.id} value={c.id}>{c.apelido}</option>)}
          </select>
          <ChevronDown className="absolute right-3 top-9 pointer-events-none text-gray-400" size={18}/>
        </div>
        <div>
          <label htmlFor="data-compra" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data da Compra</label>
          <input type="date" id="data-compra" value={dataCompra} onChange={e => setDataCompra(e.target.value)} className="w-full bg-gray-100 dark:bg-gray-700 p-2 rounded-lg text-gray-900 dark:text-white"/>
        </div>
        <div>
          <label htmlFor="descricao-compra" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descrição</label>
          <input type="text" id="descricao-compra" value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Ex: Assinatura Spotify" className="w-full bg-gray-100 dark:bg-gray-700 p-2 rounded-lg text-gray-900 dark:text-white"/>
        </div>
        <div className="grid grid-cols-2 gap-4">
            <div>
                <label htmlFor="valor-compra" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Valor Total</label>
                <CurrencyInput id="valor-compra" value={valorTotal} onValueChange={setValorTotal} placeholder="R$ 0,00" className="w-full bg-gray-100 dark:bg-gray-700 p-2 rounded-lg text-gray-900 dark:text-white"/>
            </div>
             <div>
                <label htmlFor="parcelas" className={`block text-sm font-medium mb-1 ${isRecorrente ? 'text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300'}`}>Parcelas</label>
                <input type="number" id="parcelas" value={isRecorrente ? '1' : parcelas} onChange={e => setParcelas(e.target.value)} min="1" step="1" className="w-full bg-gray-100 dark:bg-gray-700 p-2 rounded-lg text-gray-900 dark:text-white disabled:bg-gray-200 dark:disabled:bg-gray-600 disabled:text-gray-500" disabled={isRecorrente}/>
            </div>
        </div>
        
        <div className="flex items-center space-x-2 text-sm">
            <input type="checkbox" id="recorrente-compra-check" checked={isRecorrente} onChange={e => setIsRecorrente(e.target.checked)} className="h-4 w-4 rounded bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-[#19CF67] focus:ring-[#19CF67]"/>
            <label htmlFor="recorrente-compra-check" className="font-medium text-gray-700 dark:text-gray-300">Compra Recorrente (Assinatura)</label>
        </div>

        {isRecorrente && (
            <div className="relative pl-6 animate-fade-in">
                <label htmlFor="frequencia-compra" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Frequência</label>
                <select id="frequencia-compra" value={frequencia} onChange={e => setFrequencia(e.target.value as any)} className="w-full bg-gray-100 dark:bg-gray-700 p-2 pl-3 pr-10 rounded-lg appearance-none text-gray-900 dark:text-white">
                    <option value="mensal">Mensal</option>
                    <option value="anual">Anual</option>
                </select>
                <ChevronDown className="absolute right-3 top-9 pointer-events-none text-gray-400" size={18}/>
            </div>
        )}

        <div className="relative">
          <label htmlFor="categoria-compra" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Categoria</label>
          <select id="categoria-compra" value={categoriaId} onChange={e => setCategoriaId(e.target.value)} className="w-full bg-gray-100 dark:bg-gray-700 p-2 pl-3 pr-10 rounded-lg appearance-none text-gray-900 dark:text-white">
            {categoriasSaida.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          <ChevronDown className="absolute right-3 top-9 pointer-events-none text-gray-400" size={18}/>
        </div>
      </form>
    </Modal>
  );
};

export default NovaCompraCartaoModal;