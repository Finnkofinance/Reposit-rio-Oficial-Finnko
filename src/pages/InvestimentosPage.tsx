

import React, { useState, useMemo, useEffect } from 'react';
import { ObjetivoInvestimento, ModalState, Ativo, Alocacao, NavigationState, CategoriaAtivo, TransacaoBanco, ContaBancaria, Categoria, TipoCategoria } from '@/types/types';
import Modal from '@/components/Modal';
import { Plus, Pencil, Trash2, PiggyBank, TrendingUp, MoreVertical, SlidersHorizontal, Package, Flame, Globe, ChevronDown } from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/format';
import CurrencyInput from '@/components/CurrencyInput';
import DoughnutChart from '@/components/DoughnutChart';

const getTodayString = () => new Date().toISOString().split('T')[0];

interface InvestimentosPageProps {
  objetivos: ObjetivoInvestimento[];
  addObjetivo: (objetivo: Omit<ObjetivoInvestimento, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateObjetivo: (objetivo: ObjetivoInvestimento) => void;
  deleteObjetivo: (id: string) => void;
  
  ativos: Ativo[];
  addAtivo: (ativo: Omit<Ativo, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateAtivo: (ativo: Ativo) => void;
  deleteAtivo: (id: string) => void;
  
  alocacoes: Alocacao[];
  setAlocacoesParaAtivo: (ativoId: string, novasAlocacoes: Omit<Alocacao, 'id' | 'ativo_id'>[]) => void;

  modalState: ModalState;
  openModal: (modal: string, data?: any) => void;
  closeModal: () => void;
  navigationState: NavigationState | null;
  clearNavigationState: () => void;

  transacoes: TransacaoBanco[];
  contas: ContaBancaria[];
  categorias: Categoria[];
  addInvestimentoTransaction: (txData: Omit<TransacaoBanco, 'id' | 'createdAt' | 'updatedAt' | 'tipo'>) => void;
}

const InvestimentosPage: React.FC<InvestimentosPageProps> = (props) => {
    const [activeTab, setActiveTab] = useState<'objetivos' | 'visao-geral' | 'meus-ativos'>('objetivos');
    
    // Unified modal state
    const [modal, setModal] = useState<{ type: string, data?: any } | null>(null);

    useEffect(() => {
        if (props.navigationState?.action === 'open-add-modal') {
            setActiveTab('objetivos');
            setModal({ type: 'objetivo' });
            props.clearNavigationState();
        }
    }, [props.navigationState, props.clearNavigationState]);

    const handleOpenModal = (type: string, data: any = null) => setModal({ type, data });
    const handleCloseModal = () => setModal(null);

    const renderTabContent = () => {
        switch(activeTab) {
            case 'objetivos':
                 return <ObjetivosTab 
                            objetivos={props.objetivos} 
                            ativos={props.ativos} 
                            alocacoes={props.alocacoes} 
                            transacoes={props.transacoes}
                            deleteObjetivo={props.deleteObjetivo}
                            openModal={handleOpenModal}
                        />;
            case 'visao-geral':
                return <VisaoGeralTab 
                            objetivos={props.objetivos} 
                            ativos={props.ativos} 
                            alocacoes={props.alocacoes}
                            transacoes={props.transacoes}
                        />;
            case 'meus-ativos':
                return <MeusAtivosTab ativos={props.ativos} deleteAtivo={props.deleteAtivo} objetivos={props.objetivos} alocacoes={props.alocacoes} setAlocacoesParaAtivo={props.setAlocacoesParaAtivo} openModal={handleOpenModal} />;
            default:
                return null;
        }
    };

    const tabButtonClasses = (tabName: typeof activeTab) => `px-4 py-2 text-sm font-semibold rounded-md transition-colors ${activeTab === tabName ? 'bg-gradient-to-r from-[#19CF67] to-[#00DE5F] text-white shadow-md' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700/50'}`;

    return (
        <div className="animate-fade-in space-y-6">
             <div className="text-center mb-6">
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Investimentos</h2>
                <p className="text-gray-500 dark:text-gray-400 mt-1">Acompanhe seus ativos, aloque em objetivos e veja seu patrimônio crescer.</p>
            </div>

            <div className="flex space-x-2 bg-gray-100 dark:bg-gray-900/50 p-1 rounded-lg">
                <button onClick={() => setActiveTab('objetivos')} className={tabButtonClasses('objetivos')}>Objetivos</button>
                <button onClick={() => setActiveTab('visao-geral')} className={tabButtonClasses('visao-geral')}>Visão Geral</button>
                <button onClick={() => setActiveTab('meus-ativos')} className={tabButtonClasses('meus-ativos')}>Meus Ativos</button>
            </div>
            
            <div className="mt-6">
                {renderTabContent()}
            </div>
            
            {/* Modals */}
            {modal?.type === 'objetivo' && (
                <AddOrEditObjetivoModal 
                    objetivoToEdit={modal.data}
                    onClose={handleCloseModal}
                    addObjetivo={props.addObjetivo}
                    updateObjetivo={props.updateObjetivo}
                />
            )}
             {modal?.type === 'ativo-step1' && (
                <ChooseAssetTypeModal
                    onClose={handleCloseModal}
                    onSelect={(categoria) => handleOpenModal('ativo', { categoria })}
                />
            )}
            {modal?.type === 'ativo' && (
                <AddOrEditAtivoModal 
                    ativoToEdit={modal.data?.id ? modal.data : null}
                    categoria={modal.data.categoria}
                    onClose={handleCloseModal}
                    addAtivo={props.addAtivo}
                    updateAtivo={props.updateAtivo}
                />
            )}
             {modal?.type === 'alocacao' && (
                <AlocacaoModal
                    ativo={modal.data}
                    objetivos={props.objetivos}
                    alocacoesAtuais={props.alocacoes.filter(a => a.ativo_id === modal.data.id)}
                    onClose={handleCloseModal}
                    setAlocacoesParaAtivo={props.setAlocacoesParaAtivo}
                />
            )}
            {modal?.type === 'investir-meta' && (
                 <InvestirNaMetaModal
                    objetivo={modal.data}
                    contas={props.contas}
                    categorias={props.categorias}
                    onClose={handleCloseModal}
                    onSave={props.addInvestimentoTransaction}
                />
            )}
        </div>
    );
};

// ====================================================================================
// TABS
// ====================================================================================

const ObjetivosTab: React.FC<Pick<InvestimentosPageProps, 'objetivos' | 'ativos' | 'alocacoes' | 'transacoes' | 'deleteObjetivo'> & { openModal: (type: string, data?: any) => void }> = ({ objetivos, ativos, alocacoes, transacoes, deleteObjetivo, openModal }) => {
    const objetivosComProgresso = useMemo(() => {
        return objetivos.map(objetivo => {
            const valorDeAtivos = alocacoes
                .filter(a => a.objetivo_id === objetivo.id)
                .reduce((sum, aloc) => {
                    const ativo = ativos.find(a => a.id === aloc.ativo_id);
                    if (!ativo) return sum;
                    return sum + (ativo.valor_atual_unitario * ativo.quantidade * (aloc.percentual / 100));
                }, 0);
            
            const valorDeInvestimentosDiretos = transacoes
                .filter(t => t.objetivo_id === objetivo.id && t.tipo === TipoCategoria.Investimento && t.realizado)
                .reduce((sum, t) => sum + t.valor, 0);

            const valorAtual = valorDeAtivos + valorDeInvestimentosDiretos;
            const progresso = objetivo.valor_meta > 0 ? (valorAtual / objetivo.valor_meta) : 0;
            return { ...objetivo, valorAtual, progresso };
        }).sort((a, b) => new Date(a.data_meta).getTime() - new Date(b.data_meta).getTime());
    }, [objetivos, ativos, alocacoes, transacoes]);
    
    return (
        <div className="max-w-3xl mx-auto">
            <div className="space-y-4">
                {objetivosComProgresso.map(obj => (
                    <ObjetivoCard 
                        key={obj.id} 
                        objetivo={obj} 
                        onDelete={() => deleteObjetivo(obj.id)} 
                        onEdit={() => openModal('objetivo', obj)}
                        onInvest={() => openModal('investir-meta', obj)} 
                    />
                ))}
                <button 
                    onClick={() => openModal('objetivo')}
                    className="w-full flex items-center justify-center p-6 bg-transparent rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-[#19CF67] dark:hover:border-[#19CF67] text-gray-500 dark:text-gray-400 hover:text-[#19CF67] dark:hover:text-[#19CF67] transition-colors group"
                >
                    <div className="text-center">
                        <Plus size={24} className="mx-auto mb-2 transition-transform group-hover:scale-110" />
                        <span className="font-semibold text-sm">Novo Objetivo</span>
                    </div>
                </button>
            </div>
        </div>
    );
};


const VisaoGeralTab: React.FC<Pick<InvestimentosPageProps, 'objetivos' | 'ativos' | 'alocacoes' | 'transacoes'>> = ({ objetivos, ativos, alocacoes, transacoes }) => {
    const portfolioData = useMemo(() => {
        const totalInvestido = ativos.reduce((sum, a) => sum + (a.valor_compra_unitario * a.quantidade), 0);
        const patrimonioAtual = ativos.reduce((sum, a) => sum + (a.valor_atual_unitario * a.quantidade), 0);
        const rentabilidade = patrimonioAtual - totalInvestido;

        const alocacaoPorCategoria = Object.values(CategoriaAtivo).map(categoria => ({
            categoria,
            valor: ativos.filter(a => a.categoria === categoria).reduce((sum, a) => sum + (a.valor_atual_unitario * a.quantidade), 0)
        }));

        let totalAlocado = 0;
        const alocacaoPorObjetivo = objetivos.map(obj => {
            const valorDeAtivos = alocacoes
                .filter(a => a.objetivo_id === obj.id)
                .reduce((sum, aloc) => {
                    const ativo = ativos.find(a => a.id === aloc.ativo_id);
                    if (!ativo) return sum;
                    return sum + (ativo.valor_atual_unitario * ativo.quantidade * (aloc.percentual / 100));
                }, 0);
            
            const valorDeInvestimentosDiretos = transacoes
                .filter(t => t.objetivo_id === obj.id && t.tipo === TipoCategoria.Investimento && t.realizado)
                .reduce((sum, t) => sum + t.valor, 0);

            const valor = valorDeAtivos + valorDeInvestimentosDiretos;
            totalAlocado += valor;
            return { categoria: obj.nome, valor };
        });
        
        const naoAlocado = patrimonioAtual - totalAlocado;
        if (naoAlocado > 0.01) {
            alocacaoPorObjetivo.push({ categoria: 'Não Alocado', valor: naoAlocado });
        }
        
        return { totalInvestido, patrimonioAtual, rentabilidade, alocacaoPorCategoria, alocacaoPorObjetivo };
    }, [ativos, objetivos, alocacoes, transacoes]);

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <KPICard title="Total Investido" value={portfolioData.totalInvestido} />
                <KPICard title="Patrimônio Atual" value={portfolioData.patrimonioAtual} />
                <KPICard title="Rentabilidade" value={portfolioData.rentabilidade} isProfit />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl h-full flex flex-col shadow-sm dark:shadow-none">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Alocação por Categoria</h3>
                    <DoughnutChart rows={portfolioData.alocacaoPorCategoria} />
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl h-full flex flex-col shadow-sm dark:shadow-none">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Alocação por Objetivos</h3>
                    <DoughnutChart rows={portfolioData.alocacaoPorObjetivo} />
                </div>
            </div>
        </div>
    );
};

const MeusAtivosTab: React.FC<Pick<InvestimentosPageProps, 'ativos' | 'deleteAtivo' | 'objetivos' | 'alocacoes' | 'setAlocacoesParaAtivo'> & { openModal: (type: string, data?: any) => void }> = ({ ativos, deleteAtivo, openModal, ...rest }) => {
    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <button onClick={() => openModal('ativo-step1')} className="bg-gradient-to-r from-[#19CF67] to-[#00DE5F] hover:from-[#16B359] hover:to-[#00C454] text-white font-bold py-2 px-4 rounded-lg flex items-center space-x-2">
                    <Plus size={20} />
                    <span>Adicionar Ativo</span>
                </button>
            </div>
            {ativos.length === 0 ? (
                <div className="text-center bg-white dark:bg-gray-800 rounded-lg p-12 mt-6 shadow-sm dark:shadow-none">
                    <p className="text-gray-500 dark:text-gray-400">Nenhum ativo cadastrado.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {ativos.map(ativo => <AtivoCard key={ativo.id} ativo={ativo} onDelete={() => deleteAtivo(ativo.id)} onEdit={() => openModal('ativo', ativo)} onAllocate={() => openModal('alocacao', ativo)} />)}
                </div>
            )}
        </div>
    );
};


// ====================================================================================
// CARDS
// ====================================================================================

const KPICard: React.FC<{ title: string; value: number, isProfit?: boolean }> = ({ title, value, isProfit = false }) => {
    const profitColor = value >= 0 ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400';
    return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm dark:shadow-none">
            <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
            <p className={`text-2xl font-bold text-gray-900 dark:text-white ${isProfit ? profitColor : ''}`}>{formatCurrency(value)}</p>
        </div>
    );
};

const AtivoCard: React.FC<{ ativo: Ativo, onDelete: () => void, onEdit: () => void, onAllocate: () => void }> = ({ ativo, onDelete, onEdit, onAllocate }) => {
    const valorCompra = ativo.valor_compra_unitario * ativo.quantidade;
    const valorAtual = ativo.valor_atual_unitario * ativo.quantidade;
    const rentabilidade = valorAtual - valorCompra;
    const rentabilidadePercent = valorCompra > 0 ? (rentabilidade / valorCompra) * 100 : 0;
    const rentColor = rentabilidade >= 0 ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400';

    return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm dark:shadow-none flex flex-col justify-between">
            <div>
                <div className="flex justify-between items-start">
                    <h4 className="font-bold text-gray-900 dark:text-white">{ativo.nome}</h4>
                    <div className="flex space-x-2 text-gray-500 dark:text-gray-400">
                        <button onClick={onEdit} className="hover:text-blue-500"><Pencil size={16} /></button>
                        <button onClick={onDelete} className="hover:text-red-500"><Trash2 size={16} /></button>
                    </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{ativo.classe_ativo} • {ativo.categoria}</p>
            </div>
            <div className="mt-2">
                <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Valor Atual</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(valorAtual)}</span>
                </div>
                <div className={`flex justify-between text-sm ${rentColor}`}>
                    <span className="">Rentabilidade</span>
                    <span className="font-semibold">{formatCurrency(rentabilidade)} ({rentabilidadePercent.toFixed(2)}%)</span>
                </div>
            </div>
            <button onClick={onAllocate} className="mt-3 w-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-bold py-2 px-4 rounded-lg text-sm flex items-center justify-center space-x-2">
                <SlidersHorizontal size={14} /><span>Destinar</span>
            </button>
        </div>
    );
};

const ObjetivoCard: React.FC<{ objetivo: ObjetivoInvestimento & { valorAtual: number; progresso: number }, onDelete: () => void, onEdit: () => void, onInvest: () => void }> = ({ objetivo, onDelete, onEdit, onInvest }) => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm dark:shadow-none border border-transparent hover:border-[#19CF67] transition-colors group">
        <div className="flex justify-between items-start">
            <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{objetivo.nome}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    {formatCurrency(objetivo.valorAtual)} / {formatCurrency(objetivo.valor_meta)}
                </p>
            </div>
            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={onEdit} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-blue-500"><Pencil size={16} /></button>
                <button onClick={onDelete} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-red-500"><Trash2 size={16} /></button>
            </div>
        </div>
        <div className="flex items-end justify-between mt-4">
            <div className="text-3xl font-extrabold text-gray-900 dark:text-white">
                {Math.floor(objetivo.progresso * 100)}<span className="text-xl text-gray-400 dark:text-gray-500">%</span>
            </div>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mt-2">
            <div className="bg-gradient-to-r from-[#19CF67] to-[#00DE5F] h-2.5 rounded-full" style={{ width: `${Math.min(100, objetivo.progresso * 100)}%` }}></div>
        </div>
        <div className="mt-4">
            <button onClick={onInvest} className="w-full bg-gradient-to-r from-[#19CF67] to-[#00DE5F] hover:from-[#16B359] hover:to-[#00C454] text-white font-bold py-2 px-4 rounded-lg text-sm flex items-center justify-center space-x-2">
                <PiggyBank size={16} /><span>Invista na meta</span>
            </button>
        </div>
    </div>
);


// ====================================================================================
// MODALS
// ====================================================================================

interface AddOrEditObjetivoModalProps {
  objetivoToEdit: ObjetivoInvestimento | null;
  onClose: () => void;
  addObjetivo: InvestimentosPageProps['addObjetivo'];
  updateObjetivo: InvestimentosPageProps['updateObjetivo'];
}
const AddOrEditObjetivoModal: React.FC<AddOrEditObjetivoModalProps> = ({ objetivoToEdit, onClose, addObjetivo, updateObjetivo }) => {
    const [formState, setFormState] = useState({ nome: '', valor_meta: '', data_meta: '' });

    useEffect(() => {
        if (objetivoToEdit) {
            setFormState({
                nome: objetivoToEdit.nome,
                valor_meta: String(objetivoToEdit.valor_meta * 100),
                data_meta: objetivoToEdit.data_meta,
            });
        } else {
            setFormState({ nome: '', valor_meta: '', data_meta: getTodayString() });
        }
    }, [objetivoToEdit]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const data = {
            nome: formState.nome,
            valor_meta: parseFloat(formState.valor_meta) / 100 || 0,
            data_meta: formState.data_meta,
        };
        if (objetivoToEdit) {
          updateObjetivo({ ...objetivoToEdit, ...data });
        }
        else {
          addObjetivo(data);
        }
        onClose();
    };

    return (
        <Modal
            isOpen={true} onClose={onClose} title={objetivoToEdit ? 'Editar Objetivo' : 'Novo Objetivo'}
            footer={<> <button type="button" onClick={onClose} className="bg-gray-600 text-white px-4 py-2 rounded-lg">Cancelar</button> <button type="submit" form="objetivo-form" className="bg-gradient-to-r from-[#19CF67] to-[#00DE5F] text-white px-4 py-2 rounded-lg font-semibold">Salvar</button> </>}
        >
            <form id="objetivo-form" onSubmit={handleSubmit} className="space-y-4">
                <div> <label>Nome</label> <input type="text" value={formState.nome} onChange={e => setFormState({...formState, nome: e.target.value})} className="w-full bg-gray-100 dark:bg-gray-700 p-2 rounded" required /> </div>
                <div className="grid grid-cols-2 gap-4">
                    <div> <label>Valor Alvo</label> <CurrencyInput value={formState.valor_meta} onValueChange={v => setFormState({...formState, valor_meta: v})} className="w-full bg-gray-100 dark:bg-gray-700 p-2 rounded" placeholder="R$ 0,00" required /> </div>
                    <div> <label>Data Alvo</label> <input type="date" value={formState.data_meta} onChange={e => setFormState({...formState, data_meta: e.target.value})} className="w-full bg-gray-100 dark:bg-gray-700 p-2 rounded" min={getTodayString()} required /> </div>
                </div>
            </form>
        </Modal>
    );
};

const ChooseAssetTypeModal: React.FC<{ onClose: () => void, onSelect: (cat: CategoriaAtivo) => void }> = ({ onClose, onSelect }) => {
    const types = [
        { id: CategoriaAtivo.RendaVariavel, label: 'Renda Variável', icon: <TrendingUp size={24}/>, desc: "Ações, FIIs, ETFs, etc." },
        { id: CategoriaAtivo.RendaFixa, label: 'Renda Fixa', icon: <Package size={24}/>, desc: "CDB, Tesouro Direto, etc." },
        { id: CategoriaAtivo.Outros, label: 'Outros', icon: <Globe size={24}/>, desc: "Cripto, Fundos, etc." },
    ];
    return (
        <Modal isOpen={true} onClose={onClose} title="Adicionar Novo Ativo">
            <div className="space-y-3">
                <p className="text-center text-gray-500 dark:text-gray-400">Selecione o tipo de ativo que você deseja adicionar.</p>
                {types.map(type => (
                    <button key={type.id} onClick={() => onSelect(type.id)} className="w-full flex items-center space-x-4 p-4 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                        <div className="text-[#19CF67]">{type.icon}</div>
                        <div>
                            <p className="font-semibold text-left text-gray-900 dark:text-white">{type.label}</p>
                            <p className="text-xs text-left text-gray-500 dark:text-gray-400">{type.desc}</p>
                        </div>
                    </button>
                ))}
            </div>
        </Modal>
    );
};

interface AddOrEditAtivoModalProps {
  ativoToEdit: Ativo | null;
  categoria: CategoriaAtivo;
  onClose: () => void;
  addAtivo: InvestimentosPageProps['addAtivo'];
  updateAtivo: InvestimentosPageProps['updateAtivo'];
}
const AddOrEditAtivoModal: React.FC<AddOrEditAtivoModalProps> = ({ ativoToEdit, categoria, onClose, addAtivo, updateAtivo }) => {
    const [form, setForm] = useState({ nome: '', classe_ativo: '', quantidade: '1', data_compra: getTodayString(), valor_compra_unitario: '', valor_atual_unitario: '', observacao: '' });

    useEffect(() => {
        if(ativoToEdit) setForm({
            nome: ativoToEdit.nome,
            classe_ativo: ativoToEdit.classe_ativo,
            quantidade: String(ativoToEdit.quantidade),
            data_compra: ativoToEdit.data_compra,
            valor_compra_unitario: String(ativoToEdit.valor_compra_unitario * 100),
            valor_atual_unitario: String(ativoToEdit.valor_atual_unitario * 100),
            observacao: ativoToEdit.observacao || ''
        });
        else setForm(f => ({...f, valor_compra_unitario: '', valor_atual_unitario: ''}));
    }, [ativoToEdit]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const data: Omit<Ativo, 'id' | 'createdAt' | 'updatedAt'> = {
            categoria,
            nome: form.nome,
            classe_ativo: form.classe_ativo,
            quantidade: parseFloat(form.quantidade) || 0,
            data_compra: form.data_compra,
            valor_compra_unitario: parseFloat(form.valor_compra_unitario) / 100 || 0,
            valor_atual_unitario: parseFloat(form.valor_atual_unitario) / 100 || 0,
            observacao: form.observacao
        };
        if (ativoToEdit) {
            updateAtivo({ ...ativoToEdit, ...data });
        } else {
            addAtivo(data);
        }
        onClose();
    };

    const labelClasses = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";
    const inputClasses = "w-full bg-gray-100 dark:bg-gray-700 p-2 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#19CF67]";

    return (
         <Modal
            isOpen={true} onClose={onClose} title={`${ativoToEdit ? 'Editar' : 'Adicionar'} Ativo de ${categoria}`}
            footer={<> <button type="button" onClick={onClose} className="bg-gray-600 text-white px-4 py-2 rounded-lg">Cancelar</button> <button type="submit" form="ativo-form" className="bg-gradient-to-r from-[#19CF67] to-[#00DE5F] text-white px-4 py-2 rounded-lg font-semibold">Salvar</button> </>}
        >
            <form id="ativo-form" onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div> 
                        <label className={labelClasses}>Nome do Ativo (Ticker)</label> 
                        <input type="text" value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} className={inputClasses} required placeholder="Ex: PETR4" /> 
                    </div>
                    <div> 
                        <label className={labelClasses}>Classe do Ativo</label> 
                        <input type="text" value={form.classe_ativo} onChange={e => setForm({...form, classe_ativo: e.target.value})} className={inputClasses} required placeholder="Ex: Ação, FII" /> 
                    </div>
                    <div> 
                        <label className={labelClasses}>Quantidade</label> 
                        <input type="number" value={form.quantidade} onChange={e => setForm({...form, quantidade: e.target.value})} className={inputClasses} step="any" required /> 
                    </div>
                    <div> 
                        <label className={labelClasses}>Data da Compra</label> 
                        <input type="date" value={form.data_compra} onChange={e => setForm({...form, data_compra: e.target.value})} className={inputClasses} required /> 
                    </div>
                    <div> 
                        <label className={labelClasses}>Valor de Compra (Unitário)</label> 
                        <CurrencyInput value={form.valor_compra_unitario} onValueChange={v => setForm({...form, valor_compra_unitario: v})} className={inputClasses} required /> 
                    </div>
                    <div> 
                        <label className={labelClasses}>Valor Atual (Unitário)</label> 
                        <CurrencyInput value={form.valor_atual_unitario} onValueChange={v => setForm({...form, valor_atual_unitario: v})} className={inputClasses} required /> 
                    </div>
                    <div className="sm:col-span-2"> 
                        <label className={labelClasses}>Observação (Opcional)</label> 
                        <input type="text" value={form.observacao} onChange={e => setForm({...form, observacao: e.target.value})} className={inputClasses} /> 
                    </div>
                </div>
            </form>
        </Modal>
    );
};

interface AlocacaoModalProps {
    ativo: Ativo;
    objetivos: ObjetivoInvestimento[];
    alocacoesAtuais: Alocacao[];
    onClose: () => void;
    setAlocacoesParaAtivo: InvestimentosPageProps['setAlocacoesParaAtivo'];
}
const AlocacaoModal: React.FC<AlocacaoModalProps> = ({ ativo, objetivos, alocacoesAtuais, onClose, setAlocacoesParaAtivo }) => {
    const [alocacoes, setAlocacoes] = useState<Record<string, number>>({});

    useEffect(() => {
        const initialAlocacoes = alocacoesAtuais.reduce((acc, curr) => {
            acc[curr.objetivo_id] = curr.percentual;
            return acc;
        }, {} as Record<string, number>);
        setAlocacoes(initialAlocacoes);
    }, [alocacoesAtuais]);
    
    const totalAlocado = useMemo(() => Object.values(alocacoes).reduce((sum, p) => sum + (p || 0), 0), [alocacoes]);
    const restante = 100 - totalAlocado;

    const handleAlocacaoChange = (objetivoId: string, percentual: string) => {
        const pNum = parseInt(percentual, 10) || 0;
        setAlocacoes(prev => ({...prev, [objetivoId]: Math.min(100, Math.max(0, pNum))}));
    };
    
    const handleSave = () => {
        if (totalAlocado > 100) {
            alert("A alocação total não pode exceder 100%.");
            return;
        }
        const novasAlocacoes = Object.entries(alocacoes)
            .filter(([, percentual]) => percentual > 0)
            .map(([objetivo_id, percentual]) => ({ objetivo_id, percentual }));
        
        setAlocacoesParaAtivo(ativo.id, novasAlocacoes);
        onClose();
    };

    return (
        <Modal
            isOpen={true} onClose={onClose} title={`Destinar Ativo: ${ativo.nome}`}
            footer={<> <button type="button" onClick={onClose} className="bg-gray-600 text-white px-4 py-2 rounded-lg">Cancelar</button> <button type="button" onClick={handleSave} className="bg-gradient-to-r from-[#19CF67] to-[#00DE5F] text-white px-4 py-2 rounded-lg font-semibold">Salvar Alocação</button> </>}
        >
            <div className="space-y-4">
                <div className={`p-3 rounded-lg text-center font-semibold ${totalAlocado > 100 ? 'bg-red-500/20 text-red-400' : 'bg-gray-100 dark:bg-gray-700'}`}>
                    Total Alocado: {totalAlocado}% • Restante: {restante}%
                </div>
                {objetivos.length === 0 ? <p className="text-center text-gray-500">Nenhum objetivo criado.</p> : (
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                        {objetivos.map(obj => (
                             <div key={obj.id} className="grid grid-cols-3 gap-3 items-center">
                                <label htmlFor={`aloc-${obj.id}`} className="col-span-2 truncate">{obj.nome}</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        id={`aloc-${obj.id}`}
                                        value={alocacoes[obj.id] || ''}
                                        onChange={e => handleAlocacaoChange(obj.id, e.target.value)}
                                        className="w-full bg-gray-100 dark:bg-gray-700 p-2 rounded text-right pr-6"
                                        placeholder="0"
                                    />
                                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">%</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Modal>
    );
};

interface InvestirNaMetaModalProps {
  objetivo: ObjetivoInvestimento;
  contas: ContaBancaria[];
  categorias: Categoria[];
  onClose: () => void;
  onSave: (data: Omit<TransacaoBanco, 'id' | 'createdAt' | 'updatedAt' | 'tipo'>) => void;
}
const InvestirNaMetaModal: React.FC<InvestirNaMetaModalProps> = ({ objetivo, contas, categorias, onClose, onSave }) => {
    const [formState, setFormState] = useState({
        conta_id: '',
        valor: '',
        data: getTodayString(),
        categoria_id: ''
    });

    const categoriasInvestimento = useMemo(() => {
        return categorias.filter(c => c.tipo === TipoCategoria.Investimento && !c.sistema);
    }, [categorias]);
    const contasAtivas = useMemo(() => contas.filter(c => c.ativo), [contas]);

    useEffect(() => {
        setFormState(prev => ({
            ...prev,
            conta_id: contasAtivas.length > 0 ? contasAtivas[0].id : '',
            categoria_id: categoriasInvestimento.length > 0 ? categoriasInvestimento[0].id : ''
        }));
    }, [contasAtivas, categoriasInvestimento]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const valorNum = parseFloat(formState.valor) / 100 || 0;
        if (!formState.conta_id || !formState.categoria_id || valorNum <= 0) {
            alert('Preencha todos os campos corretamente.');
            return;
        }
        onSave({
            objetivo_id: objetivo.id,
            conta_id: formState.conta_id,
            valor: valorNum,
            data: formState.data,
            categoria_id: formState.categoria_id,
            descricao: `Investimento para: ${objetivo.nome}`,
            previsto: false,
            realizado: true,
        });
        onClose();
    };

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title={`Investir em: ${objetivo.nome}`}
            footer={
                <>
                    <button type="button" onClick={onClose} className="bg-gray-600 text-white px-4 py-2 rounded-lg">Cancelar</button>
                    <button type="submit" form="investir-form" className="bg-gradient-to-r from-[#19CF67] to-[#00DE5F] text-white px-4 py-2 rounded-lg font-semibold">Confirmar Investimento</button>
                </>
            }
        >
            <form id="investir-form" onSubmit={handleSubmit} className="space-y-4">
                 <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Conta de Origem</label>
                    <select value={formState.conta_id} onChange={e => setFormState(f => ({...f, conta_id: e.target.value}))} className="w-full bg-gray-100 dark:bg-gray-700 p-2 pl-3 pr-10 rounded-lg appearance-none text-gray-900 dark:text-white">
                        {contasAtivas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-9 pointer-events-none text-gray-400" size={18}/>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Valor a Investir</label>
                        <CurrencyInput value={formState.valor} onValueChange={v => setFormState(f => ({...f, valor: v}))} className="w-full bg-gray-100 dark:bg-gray-700 p-2 rounded" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data</label>
                        <input type="date" value={formState.data} onChange={e => setFormState(f => ({...f, data: e.target.value}))} className="w-full bg-gray-100 dark:bg-gray-700 p-2 rounded" required />
                    </div>
                </div>
                 <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Categoria</label>
                    <select value={formState.categoria_id} onChange={e => setFormState(f => ({...f, categoria_id: e.target.value}))} className="w-full bg-gray-100 dark:bg-gray-700 p-2 pl-3 pr-10 rounded-lg appearance-none text-gray-900 dark:text-white">
                         {categoriasInvestimento.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-9 pointer-events-none text-gray-400" size={18}/>
                </div>
            </form>
        </Modal>
    );
};


export default InvestimentosPage;