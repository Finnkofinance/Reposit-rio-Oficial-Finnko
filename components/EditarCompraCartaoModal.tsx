import React, { useState, useEffect } from 'react';
import { Cartao, Categoria, CompraCartao, TipoCategoria } from '../types';
import Modal from './Modal';
import CurrencyInput from './CurrencyInput';
import { ChevronDown } from 'lucide-react';

interface EditarCompraCartaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (compra: CompraCartao & { parcelas: number }) => void;
  compraToEdit: CompraCartao;
  cartoes: Cartao[];
  categorias: Categoria[];
}

const EditarCompraCartaoModal: React.FC<EditarCompraCartaoModalProps> = ({
  isOpen, onClose, onSave, compraToEdit, cartoes, categorias
}) => {
  const [cartaoId, setCartaoId] = useState('');
  const [dataCompra, setDataCompra] = useState('');
  const [descricao, setDescricao] = useState('');
  const [valorTotal, setValorTotal] = useState('');
  const [parcelas, setParcelas] = useState('1');
  const [categoriaId, setCategoriaId] = useState('');
  
  const isRecorrente = !!compraToEdit?.recorrencia;

  useEffect(() => {
    if (isOpen && compraToEdit) {
        setCartaoId(compraToEdit.cartao_id);
        setDataCompra(compraToEdit.data_compra);
        setDescricao(compraToEdit.descricao);
        setValorTotal(String(compraToEdit.valor_total * 100));
        setParcelas(String(compraToEdit.parcelas_total));
        setCategoriaId(compraToEdit.categoria_id);
    }
  }, [isOpen, compraToEdit]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const valorNum = parseFloat(valorTotal) / 100;
    const parcelasNum = parseInt(parcelas, 10);

    if (!cartaoId || !descricao.trim() || !valorTotal || !categoriaId || valorNum <= 0 || parcelasNum <= 0) {
      alert("Por favor, preencha todos os campos corretamente.");
      return;
    }

    onSave({
      ...compraToEdit,
      cartao_id: cartaoId,
      data_compra: dataCompra,
      valor_total: valorNum,
      parcelas: parcelasNum,
      categoria_id: categoriaId,
      descricao: descricao.trim(),
    });
    onClose();
  };
  
  const categoriasSaida = categorias.filter(c => c.tipo === TipoCategoria.Saida && !c.sistema);
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Editar Compra no Cartão"
      footer={
        <>
          <button onClick={onClose} className="bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-white font-bold py-2 px-4 rounded-lg">Cancelar</button>
          <button type="submit" form="editar-compra-form" className="bg-gradient-to-r from-[#19CF67] to-[#00DE5F] hover:from-[#16B359] hover:to-[#00C454] text-white font-bold py-2 px-4 rounded-lg">Salvar Alterações</button>
        </>
      }
    >
      <form id="editar-compra-form" onSubmit={handleSubmit} className="space-y-4">
        {isRecorrente && (
          <div className="bg-yellow-100 dark:bg-yellow-900/40 p-3 rounded-lg text-sm text-yellow-800 dark:text-yellow-300">
            A edição de compras recorrentes ainda não é suportada. As alterações afetarão apenas esta ocorrência.
          </div>
        )}
        <div className="relative">
          <label htmlFor="cartao-edit" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cartão</label>
          <select id="cartao-edit" value={cartaoId} onChange={e => setCartaoId(e.target.value)} className="w-full bg-gray-100 dark:bg-gray-700 p-2 pl-3 pr-10 rounded-lg appearance-none text-gray-900 dark:text-white">
            {cartoes.map(c => <option key={c.id} value={c.id}>{c.apelido}</option>)}
          </select>
          <ChevronDown className="absolute right-3 top-9 pointer-events-none text-gray-400" size={18}/>
        </div>
        <div>
          <label htmlFor="data-compra-edit" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data da Compra</label>
          <input type="date" id="data-compra-edit" value={dataCompra} onChange={e => setDataCompra(e.target.value)} className="w-full bg-gray-100 dark:bg-gray-700 p-2 rounded-lg text-gray-900 dark:text-white"/>
        </div>
        <div>
          <label htmlFor="descricao-compra-edit" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descrição</label>
          <input type="text" id="descricao-compra-edit" value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Ex: Assinatura Spotify" className="w-full bg-gray-100 dark:bg-gray-700 p-2 rounded-lg text-gray-900 dark:text-white"/>
        </div>
        <div className="grid grid-cols-2 gap-4">
            <div>
                <label htmlFor="valor-compra-edit" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Valor Total</label>
                <CurrencyInput id="valor-compra-edit" value={valorTotal} onValueChange={setValorTotal} placeholder="R$ 0,00" className="w-full bg-gray-100 dark:bg-gray-700 p-2 rounded-lg text-gray-900 dark:text-white"/>
            </div>
             <div>
                <label htmlFor="parcelas-edit" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Parcelas</label>
                <input type="number" id="parcelas-edit" value={parcelas} onChange={e => setParcelas(e.target.value)} min="1" step="1" className="w-full bg-gray-100 dark:bg-gray-700 p-2 rounded-lg text-gray-900 dark:text-white" disabled={isRecorrente}/>
            </div>
        </div>
        <div className="relative">
          <label htmlFor="categoria-compra-edit" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Categoria</label>
          <select id="categoria-compra-edit" value={categoriaId} onChange={e => setCategoriaId(e.target.value)} className="w-full bg-gray-100 dark:bg-gray-700 p-2 pl-3 pr-10 rounded-lg appearance-none text-gray-900 dark:text-white">
            {categoriasSaida.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          <ChevronDown className="absolute right-3 top-9 pointer-events-none text-gray-400" size={18}/>
        </div>
      </form>
    </Modal>
  );
};

export default EditarCompraCartaoModal;