
import React, { useState, useMemo, useEffect } from 'react';
import { Categoria, TransacaoBanco, TipoCategoria, CompraCartao, ModalState, ParcelaCartao, Settings, NavigationState, ObjetivoInvestimento } from '@/types/types';
import Modal from '@/components/Modal';
import { getCategoryIcon } from '@/constants.tsx';
import { Plus, Pencil, Trash2, Lock, ChevronDown, GripVertical } from 'lucide-react';
import DatePeriodSelector from '@/components/DatePeriodSelector';
import CurrencyInput from '@/components/CurrencyInput';
import { formatCurrency } from '@/utils/format';
import MobileSelector from '@/components/MobileSelector';
import { categoryBudgetsService } from '@/services/categoryBudgetsService';
import { useAppContext } from '@/context/AppContext';
import ConfiguracoesPage from './ConfiguracoesPage';

type PerfilTab = 'categorias' | 'visualizacao' | 'configuracoes';

interface PerfilPageProps {
  categorias: Categoria[];
  transacoes: TransacaoBanco[];
  compras: CompraCartao[];
  parcelas: ParcelaCartao[];
  objetivos?: ObjetivoInvestimento[];
  addCategoria: (categoria: Omit<Categoria, 'id' | 'createdAt' | 'updatedAt' | 'sistema'>) => void;
  updateCategoria: (categoria: Categoria) => void;
  deleteCategoria: (id: string) => void;
  modalState: ModalState;
  openModal: (modal: string, data?: any) => void;
  closeModal: () => void;
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  handleDeleteAllData: () => void;
  handleExportData: () => void;
  handleImportData: (file: File) => void;
  settings: Settings;
  setSettings: React.Dispatch<React.SetStateAction<Settings>>;
  navigationState: NavigationState | null;
  clearNavigationState: () => void;
}

const CATEGORY_FILTERS = [
    { id: 'all', label: 'Todas as Categorias' },
    { id: TipoCategoria.Entrada, label: 'Entradas' },
    { id: TipoCategoria.Saida, label: 'Saídas' },
    { id: TipoCategoria.Investimento, label: 'Investimentos' },
];

const PerfilPage: React.FC<PerfilPageProps> = (props) => {
  const { setConfirmation, showToast } = useAppContext() as any;
  const [activeTab, setActiveTab] = useState<PerfilTab>('categorias');

  const [editingCategoria, setEditingCategoria] = useState<Categoria | null>(null);
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<TipoCategoria>(TipoCategoria.Saida);
  const [orcamento, setOrcamento] = useState<string>('');
  const [selectedFilter, setSelectedFilter] = useState<TipoCategoria | 'all'>('all');
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dragOverPos, setDragOverPos] = useState<'before' | 'after' | null>(null);
  const [isDesktop, setIsDesktop] = useState<boolean>(() => typeof window !== 'undefined' ? window.matchMedia('(min-width: 768px)').matches : false);
  // Larguras das colunas (percentuais) para a tabela Categoria | Orçado | Realizado
  const [colPerc, setColPerc] = useState<{ cat: number; orcado: number; realizado: number }>(() => {
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem('catTableColPerc') : null;
      if (raw) return JSON.parse(raw);
    } catch {}
    return { cat: 58.33, orcado: 16.67, realizado: 25 };
  });
  const headerRef = React.useRef<HTMLDivElement | null>(null);
  const resizingRef = React.useRef<{ boundary: 1 | 2; startX: number; startPerc: { cat: number; orcado: number; realizado: number }; containerW: number } | null>(null);
  const [movedRowId, setMovedRowId] = useState<string | null>(null);

  // Orçamentos por mês (competência atual)
  const [budgets, setBudgets] = useState<Record<string, number>>({});
  useEffect(() => {
    (async () => {
      try {
        const rows = await categoryBudgetsService.getForMonth(props.selectedMonth);
        const map: Record<string, number> = {};
        rows.forEach(r => { map[r.categoria_id] = r.valor; });
        setBudgets(map);
      } catch {
        setBudgets({});
      }
    })();
  }, [props.selectedMonth]);

  // Orçamento automático para categorias de Investimento com objetivo associado
  const autoBudgets = useMemo(() => {
    const base: Record<string, number> = { ...budgets };
    const objetivos = props.objetivos || [];
    if (!objetivos.length) return base;
    // Função: diferença em meses entre selectedMonth (YYYY-MM) e data_meta (YYYY-MM-DD), inclusiva
    const [y, m] = props.selectedMonth.split('-').map(x => parseInt(x, 10));
    const fromIdx = y * 12 + (m - 1);
    objetivos.forEach(obj => {
      const goalDate = new Date(obj.data_meta);
      const gy = goalDate.getUTCFullYear();
      const gm = goalDate.getUTCMonth(); // 0-based
      const toIdx = gy * 12 + gm;
      const diff = toIdx - fromIdx + 1; // inclusivo
      if (diff <= 0) return; // objetivo já venceu para o mês selecionado
      const monthly = (obj.valor_meta || 0) / diff;
      // Encontrar categoria de investimento com mesmo nome
      const cat = props.categorias.find(c => c.tipo === TipoCategoria.Investimento && c.nome.toLowerCase() === obj.nome.toLowerCase());
      if (cat) base[cat.id] = monthly;
    });
    return base;
  }, [budgets, props.objetivos, props.selectedMonth, props.categorias]);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    if (mq.addEventListener) mq.addEventListener('change', handler);
    else mq.addListener(handler as any);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', handler);
      else mq.removeListener(handler as any);
    };
  }, []);

  // Persist column widths
  useEffect(() => {
    try {
      window.localStorage.setItem('catTableColPerc', JSON.stringify(colPerc));
    } catch {}
  }, [colPerc]);

  // Resizable columns handlers
  const startResize = (boundary: 1 | 2, e: React.MouseEvent) => {
    const container = headerRef.current;
    if (!container) return;
    resizingRef.current = {
      boundary,
      startX: e.clientX,
      startPerc: { ...colPerc },
      containerW: container.getBoundingClientRect().width,
    };
    window.addEventListener('mousemove', onResizing as any);
    window.addEventListener('mouseup', stopResize as any, { once: true });
  };

  const onResizing = (e: MouseEvent) => {
    const ctx = resizingRef.current;
    if (!ctx) return;
    const deltaPx = e.clientX - ctx.startX;
    const deltaPerc = (deltaPx / ctx.containerW) * 100;
    const minCat = 30; // % mínimos para UX
    const minSmall = 10;
    if (ctx.boundary === 1) {
      let cat = ctx.startPerc.cat + deltaPerc;
      let orcado = ctx.startPerc.orcado - deltaPerc;
      cat = Math.max(minCat, cat);
      orcado = Math.max(minSmall, orcado);
      const realizado = 100 - cat - orcado;
      if (realizado < minSmall) return; // respeita mínimo
      setColPerc({ cat, orcado, realizado });
    } else {
      let orcado = ctx.startPerc.orcado + deltaPerc;
      let realizado = ctx.startPerc.realizado - deltaPerc;
      orcado = Math.max(minSmall, orcado);
      realizado = Math.max(minSmall, realizado);
      const cat = 100 - orcado - realizado;
      if (cat < minCat) return;
      setColPerc({ cat, orcado, realizado });
    }
  };

  const stopResize = () => {
    window.removeEventListener('mousemove', onResizing as any);
    resizingRef.current = null;
  };

  const { 
    categorias, transacoes, compras, parcelas, addCategoria, updateCategoria, deleteCategoria, 
    modalState, openModal, closeModal, selectedMonth, onMonthChange 
  } = props;
  
  const isModalOpen = modalState.modal === 'nova-categoria' || modalState.modal === 'editar-categoria';

  useEffect(() => {
    if (props.navigationState) {
        if (props.navigationState.viewId && ['categorias', 'visualizacao', 'configuracoes'].includes(props.navigationState.viewId)) {
            setActiveTab(props.navigationState.viewId as PerfilTab);
            if(props.navigationState.viewId === 'categorias' && props.navigationState.action === 'open-add-modal') {
                openModal('nova-categoria');
            }
        }
        props.clearNavigationState();
    }
  }, [props.navigationState, props.clearNavigationState, openModal]);

  const realizadoPorCategoria = useMemo(() => {
    const valores: Record<string, number> = {};
    // Transações bancárias do mês (Entrada, Saída, Investimento)
    transacoes
      .filter(t => t.realizado && t.data.startsWith(selectedMonth))
        .forEach(t => {
        if ([TipoCategoria.Entrada, TipoCategoria.Saida, TipoCategoria.Investimento].includes(t.tipo)) {
          valores[t.categoria_id] = (valores[t.categoria_id] || 0) + t.valor;
        }
        });
    // Compras no cartão (parcelas) do mês – contam em Saídas na categoria da compra
    parcelas
      .filter(p => p.competencia_fatura === selectedMonth)
      .forEach(p => {
          const compra = compras.find(c => c.id === p.compra_id && !c.estorno);
          if (compra) {
          valores[compra.categoria_id] = (valores[compra.categoria_id] || 0) + p.valor_parcela;
          }
      });
    return valores;
  }, [transacoes, compras, parcelas, selectedMonth]);

  const groupedCategorias = useMemo(() => {
    const groups: { [key in TipoCategoria]?: Categoria[] } = {};
    const filtered = categorias.filter(cat => selectedFilter === 'all' || cat.tipo === selectedFilter);

    filtered.forEach(cat => {
      if (!groups[cat.tipo]) groups[cat.tipo] = [];
      groups[cat.tipo]!.push(cat);
    });
    
    (Object.keys(groups) as Array<keyof typeof groups>).forEach((key) => {
      const arr = groups[key];
      if (arr && Array.isArray(arr)) {
        arr.sort((a, b) => {
          const ao = (a.ordem ?? 999999);
          const bo = (b.ordem ?? 999999);
          if (ao !== bo) return ao - bo;
          return a.nome.localeCompare(b.nome);
        });
      }
    });
    return groups;
  }, [categorias, selectedFilter]);

  useEffect(() => {
    if (isModalOpen) {
      const categoriaToEdit = modalState.data?.categoria as Categoria | null;
      setEditingCategoria(categoriaToEdit || null);
      if (categoriaToEdit) {
        setNome(categoriaToEdit.nome);
        setTipo(categoriaToEdit.tipo);
        const currentBudget = budgets[categoriaToEdit.id] || 0;
        setOrcamento(currentBudget ? String(currentBudget * 100) : '');
      } else {
        setNome('');
        setTipo(TipoCategoria.Saida);
        setOrcamento('');
      }
    }
  }, [isModalOpen, modalState.data, budgets]);

  const isEditingInUse = React.useMemo(() => {
    if (!editingCategoria) return false;
    const usedInTx = props.transacoes.some(t => t.categoria_id === editingCategoria.id);
    const usedInCompras = props.compras.some(c => c.categoria_id === editingCategoria.id);
    return usedInTx || usedInCompras;
  }, [editingCategoria, props.transacoes, props.compras]);

  const handleDeleteEditingCategoria = () => {
    if (!editingCategoria) return;
    if (isEditingInUse) return; // segurança extra
    setConfirmation({
      title: 'Excluir categoria?',
      message: `Tem certeza que deseja excluir a categoria "${editingCategoria.nome}"? Esta ação é permanente.`,
      buttons: [
        { label: 'Cancelar', style: 'secondary', onClick: () => setConfirmation(null) },
        { label: 'Excluir', style: 'danger', onClick: async () => { try { await deleteCategoria(editingCategoria.id); } finally { setConfirmation(null); closeModal(); } } }
      ]
    });
  };

  const handleOpenEditModal = (categoria: Categoria) => {
    openModal('editar-categoria', { categoria });
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nome.trim() === '') return;

    const categoriaData = { 
        nome: nome.trim(), 
        tipo,
        orcamento_mensal: orcamento ? parseFloat(orcamento) / 100 : null
    };
    
    if (editingCategoria) {
      await updateCategoria({ ...editingCategoria, ...categoriaData });
      // Grava o orçamento somente para o mês atual (não bloquear fluxo se falhar)
      const valor = categoriaData.orcamento_mensal ?? 0;
      try {
        await categoryBudgetsService.upsertMany(props.selectedMonth, [{ categoria_id: editingCategoria.id, valor }]);
      } catch (e) { console.error('budget upsert (edit) failed', e); }
      // Oferta para propagar 12 meses
      if (valor > 0) {
        setConfirmation({
          title: 'Atualizar próximos 12 meses?',
          message: 'Deseja aplicar este mesmo orçamento para os próximos 12 meses também? Caso contrário, alteraremos apenas o mês atual.',
          buttons: [
            { label: 'Somente este mês', style: 'secondary', onClick: () => setConfirmation(null) },
            { label: 'Aplicar 12 meses', style: 'primary', onClick: async () => { try {
                  await categoryBudgetsService.repeatForNextMonths(props.selectedMonth, 12, [{ categoria_id: editingCategoria.id, valor }]);
                } catch (e) { console.error('budget repeat (edit) failed', e);} finally { setConfirmation(null); } } }
          ]
        });
      }
    } else {
      const created = await addCategoria({ ...categoriaData });
      if (created) {
        const catId = (created as any).id as string;
        const valor = categoriaData.orcamento_mensal ?? 0;
        // Sempre grava o mês atual
        try {
          await categoryBudgetsService.upsertMany(props.selectedMonth, [{ categoria_id: catId, valor }]);
        } catch (e) { console.error('budget upsert (create) failed', e); }
        // Pergunta se repete 12 meses (apenas meses seguintes)
        if (valor > 0) {
          setConfirmation({
            title: 'Repetir orçamento para 12 meses?',
            message: 'Deseja aplicar o mesmo valor desta categoria para os próximos 12 meses? Você poderá alterar mês a mês depois.',
            buttons: [
              { label: 'Não repetir', style: 'secondary', onClick: () => { setConfirmation(null); } },
              { label: 'Repetir 12 meses', style: 'primary', onClick: async () => { try {
                    await categoryBudgetsService.repeatForNextMonths(props.selectedMonth, 12, [{ categoria_id: catId, valor }]);
                  } catch (e) { console.error('budget repeat (create) failed', e);} finally { setConfirmation(null); } } }
            ]
          });
        }
      }
    }
    
    closeModal();
    // Recarrega budgets do mês
    try {
      const rows = await categoryBudgetsService.getForMonth(props.selectedMonth);
      const map: Record<string, number> = {};
      rows.forEach(r => { map[r.categoria_id] = r.valor; });
      setBudgets(map);
    } catch {}
  };

  const renderCategoryItem = (categoria: Categoria, onDragStart?: (e: React.DragEvent, c: Categoria) => void, onDragOverItem?: (e: React.DragEvent, c: Categoria) => void, onDropItem?: (e: React.DragEvent, c: Categoria) => void, onDragEnd?: () => void) => {
    const isProtected = categoria.sistema;
    const gasto = realizadoPorCategoria[categoria.id] || 0;
    const budgetValue = autoBudgets[categoria.id] || 0;
    const orcamentoDefinido = budgetValue > 0;
    const progresso = orcamentoDefinido ? Math.min((gasto / (budgetValue || 1)) * 100, 100) : 0;
    const progressoCor = progresso > 90 ? 'bg-red-500' : progresso > 75 ? 'bg-yellow-500' : 'bg-green-500';

    return (
        <div
            key={categoria.id}
            className={`relative p-3 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors shadow-sm dark:shadow-none ${draggingId === categoria.id ? 'opacity-50' : ''}`}
            draggable
            onDragStart={(e) => {
                onDragStart && onDragStart(e, categoria);
                setDraggingId(categoria.id);
                setDragOverId(null);
                setDragOverPos(null);
            }}
            onDragOver={(e) => onDragOverItem && onDragOverItem(e, categoria)}
            onDrop={(e) => onDropItem && onDropItem(e, categoria)}
            onDragEnd={() => { setDraggingId(null); setDragOverId(null); setDragOverPos(null); onDragEnd && onDragEnd(); }}
        >
            {dragOverId === categoria.id && dragOverPos === 'before' && (
                <div className="absolute left-0 right-0 -top-1 h-1 bg-green-500 rounded-full"></div>
            )}
            {dragOverId === categoria.id && dragOverPos === 'after' && (
                <div className="absolute left-0 right-0 -bottom-1 h-1 bg-green-500 rounded-full"></div>
            )}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <span className="cursor-grab active:cursor-grabbing text-gray-400" draggable onDragStart={(e) => onDragStart && onDragStart(e, categoria)} title="Arrastar para reordenar">
                        <GripVertical size={16} />
                    </span>
                    {getCategoryIcon(categoria.tipo)}
                    <span className="text-gray-900 dark:text-white">{categoria.nome}</span>
                    {categoria.sistema && <span title="Categoria de sistema"><Lock size={14} className="text-yellow-500 dark:text-yellow-400" /></span>}
                </div>
                <div className="flex items-center space-x-4">
                    <button onClick={() => handleOpenEditModal(categoria)} className="text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors" aria-label={`Editar categoria ${categoria.nome}`}><Pencil size={18} /></button>
                    <button onClick={() => deleteCategoria(categoria.id)} disabled={isProtected} className={`transition-colors ${isProtected ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed' : 'text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400'}`} title={isProtected ? "Categorias de sistema não podem ser excluídas." : "Excluir"} aria-label={`Excluir categoria ${categoria.nome}`}><Trash2 size={18} /></button>
                </div>
            </div>
            {/* Mantemos a barra só no desktop, no mobile teremos colunas dedicadas */}
            <div className="hidden md:block mt-2">
            {categoria.tipo === TipoCategoria.Saida && (
                orcamentoDefinido ? (
                        <div>
                            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-300 mb-1">
                                <span>{formatCurrency(gasto)}</span>
                                <span>{formatCurrency(budgetValue)}</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                <div className={`h-1.5 rounded-full ${progressoCor}`} style={{ width: `${progresso}%` }}></div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-xs text-gray-400 dark:text-gray-500">Sem orçamento definido</div>
                )
                    )}
                </div>
        </div>
    );
  };

  const renderCategorias = () => (
    <div className="animate-fade-in flex flex-col h-full md:flex-row md:space-x-6">
        <div className="hidden md:flex flex-col w-64 flex-shrink-0">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 h-full flex flex-col shadow-sm dark:shadow-none border dark:border-transparent">
                <div className="space-y-2">
                    {CATEGORY_FILTERS.map(filter => (
                        <button key={filter.id} onClick={() => setSelectedFilter(filter.id as any)} className={`w-full text-left p-3 rounded-lg flex items-center space-x-3 transition-colors ${selectedFilter === filter.id ? 'bg-green-500 text-white font-semibold' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'}`}>
                           <span>{filter.label}</span>
                        </button>
                    ))}
                    <div className="pt-3 border-t border-gray-200 dark:border-gray-700/50">
                        <button onClick={() => openModal('nova-categoria')} className="w-full text-center p-2 rounded-lg flex items-center justify-center space-x-2 transition-colors bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-white opacity-80 dark:opacity-70 hover:opacity-100">
                            <Plus size={16} /><span>Nova Categoria</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
        <div className="flex-1 flex flex-col overflow-hidden">
            <DatePeriodSelector title="Orçamentos e Categorias" selectedMonth={selectedMonth} onMonthChange={onMonthChange} />
            {/* Ação rápida: adicionar categoria (sem filtro de categorias no mobile) */}
            <div className="md:hidden mt-3">
              <button onClick={() => openModal('nova-categoria')} className="w-full text-center p-3 rounded-lg flex items-center justify-center space-x-2 transition-colors bg-gray-100 dark:bg-gray-700/50 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700">
                <Plus size={18} /><span>Adicionar nova categoria</span>
              </button>
            </div>
            <div className="mt-6 space-y-8 flex-grow overflow-y-auto">
              {Object.entries(groupedCategorias).map(([tipo, cats]) => {
                if (tipo === 'Transferencia') return null; // Oculta transferências
                if (!Array.isArray(cats) || cats.length === 0) return null;
                return (
                  <div key={tipo}>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 border-b-2 border-gray-200 dark:border-gray-700 pb-2">{tipo}</h3>
                    {/* Layout antigo em cards removido (evitar duplicidade) */}
                    <div
                      className="hidden"
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                      onDrop={(e) => {
                        const draggingId = e.dataTransfer.getData('text/plain');
                        const draggedCat = categorias.find(c => c.id === draggingId);
                        if (!draggedCat || draggedCat.tipo !== (tipo as any)) return; // respeitar o grupo
                        // Se soltar na área vazia do grupo, inserir ao final (fallback)
                        const sameGroup = categorias
                          .filter(c => c.tipo === draggedCat.tipo)
                          .sort((a, b) => (a.ordem ?? 999999) - (b.ordem ?? 999999) || a.nome.localeCompare(b.nome));
                        const withoutDragged = sameGroup.filter(c => c.id !== draggedCat.id);
                        withoutDragged.push(draggedCat);
                        // Reindexa
                        withoutDragged.forEach((c, idx) => {
                          const newOrder = idx + 1;
                          if ((c.ordem ?? 0) !== newOrder) {
                            updateCategoria({ ...c, ordem: newOrder });
                          }
                        });
                        setMovedRowId(draggedCat.id);
                        setTimeout(() => setMovedRowId(null), 800);
                        setDragOverId(null); setDragOverPos(null); setDraggingId(null);
                      }}
                    >
                      {Array.isArray(cats) && cats.map((c, idx) => renderCategoryItem(
                        c,
                        (ev, cat) => { ev.dataTransfer.setData('text/plain', cat.id); },
                        (ev, target) => {
                          ev.preventDefault();
                          ev.stopPropagation();
                          const rect = (ev.currentTarget as HTMLElement).getBoundingClientRect();
                          const pos = (ev.clientY - rect.top < rect.height / 2 ? 'before' : 'after');
                          setDragOverId(target.id);
                          setDragOverPos(pos as 'before' | 'after');
                        },
                        (ev, target) => {
                          ev.preventDefault();
                          ev.stopPropagation();
                          const draggingIdLocal = ev.dataTransfer.getData('text/plain');
                          const dragged = categorias.find(cg => cg.id === draggingIdLocal);
                          if (!dragged || dragged.tipo !== (tipo as any)) return;
                          const sameGroup = categorias
                            .filter(cg => cg.tipo === dragged.tipo)
                            .sort((a, b) => (a.ordem ?? 999999) - (b.ordem ?? 999999) || a.nome.localeCompare(b.nome));
                          const fromIdx = sameGroup.findIndex(cg => cg.id === dragged.id);
                          const toIdxBase = sameGroup.findIndex(cg => cg.id === target.id);
                          let toIdx = toIdxBase;
                          if (dragOverPos === 'after') toIdx = toIdxBase + 1;
                          // Ajuste quando removemos antes de inserir
                          const arr = [...sameGroup];
                          const [moved] = arr.splice(fromIdx, 1);
                          const insertIdx = fromIdx < toIdx ? toIdx - 1 : toIdx;
                          arr.splice(insertIdx, 0, moved);
                          // Reindexa
                          arr.forEach((cg, i2) => {
                            const newOrder = i2 + 1;
                            if ((cg.ordem ?? 0) !== newOrder) {
                              updateCategoria({ ...cg, ordem: newOrder });
                            }
                          });
                          setDragOverId(null); setDragOverPos(null); setDraggingId(null);
                        },
                        () => { setDragOverId(null); setDragOverPos(null); }
                      ))}
                    </div>

                    {/* Tabela (Categoria | Orçado | Realizado) com colunas redimensionáveis */}
                    <div className="mt-4">
                      <div ref={headerRef} className="relative select-none px-2 text-sm text-gray-500 dark:text-gray-400">
                        <div className="grid items-center" style={{ gridTemplateColumns: `${colPerc.cat}% ${colPerc.orcado}% ${colPerc.realizado}%` }}>
                          <div></div>
                          <div className="text-center border-l border-gray-700">Orçado</div>
                          <div className="text-center border-l border-gray-700">Realizado</div>
                        </div>
                        {/* Resizers */}
                        <div
                          className="absolute top-0 bottom-0 w-1 cursor-col-resize bg-gray-400/0 hover:bg-gray-400/40"
                          style={{ left: `calc(${colPerc.cat}% - 2px)` }}
                          onMouseDown={(e) => startResize(1, e)}
                          title="Arraste para ajustar colunas"
                        />
                        <div
                          className="absolute top-0 bottom-0 w-1 cursor-col-resize bg-gray-400/0 hover:bg-gray-400/40"
                          style={{ left: `calc(${colPerc.cat + colPerc.orcado}% - 2px)` }}
                          onMouseDown={(e) => startResize(2, e)}
                          title="Arraste para ajustar colunas"
                        />
                      </div>
                      <div className="mt-2 space-y-3">
                        {Array.isArray(cats) && cats.map(c => {
                          const isProtected = c.sistema;
                          const realizado = realizadoPorCategoria[c.id] || 0;
                          return (
                            <div
                              key={`row-${c.id}`}
                              className={`relative grid items-center p-2 rounded-lg bg-white dark:bg-gray-800 shadow-sm dark:shadow-none transition-all duration-200 ${draggingId === c.id ? 'opacity-50' : ''} ${movedRowId === c.id ? 'ring-2 ring-green-400' : ''} cursor-pointer md:cursor-default`}
                              style={{ gridTemplateColumns: `${colPerc.cat}% ${colPerc.orcado}% ${colPerc.realizado}%` }}
                              draggable
                              onDragStart={(ev) => {
                                ev.dataTransfer.setData('text/plain', c.id);
                                setDraggingId(c.id); setDragOverId(null); setDragOverPos(null);
                              }}
                              onDragOver={(ev) => { ev.preventDefault(); ev.stopPropagation(); const rect = (ev.currentTarget as HTMLElement).getBoundingClientRect(); const pos = (ev.clientY - rect.top < rect.height / 2 ? 'before' : 'after'); setDragOverId(c.id); setDragOverPos(pos as 'before' | 'after'); }}
                              onDrop={(ev) => {
                                ev.preventDefault(); ev.stopPropagation();
                                const draggingIdLocal = ev.dataTransfer.getData('text/plain');
                                const dragged = categorias.find(cg => cg.id === draggingIdLocal);
                                if (!dragged || dragged.tipo !== (tipo as any)) return;
                                const sameGroup = categorias
                                  .filter(cg => cg.tipo === dragged.tipo)
                                  .sort((a, b) => (a.ordem ?? 999999) - (b.ordem ?? 999999) || a.nome.localeCompare(b.nome));
                                const fromIdx = sameGroup.findIndex(cg => cg.id === dragged.id);
                                const toIdxBase = sameGroup.findIndex(cg => cg.id === c.id);
                                let toIdx = toIdxBase; if (dragOverPos === 'after') toIdx = toIdxBase + 1;
                                const arr = [...sameGroup]; const [moved] = arr.splice(fromIdx, 1); const insertIdx = fromIdx < toIdx ? toIdx - 1 : toIdx; arr.splice(insertIdx, 0, moved);
                                arr.forEach((cg, i2) => { const newOrder = i2 + 1; if ((cg.ordem ?? 0) !== newOrder) updateCategoria({ ...cg, ordem: newOrder }); });
                                setMovedRowId(dragged.id);
                                setTimeout(() => setMovedRowId(null), 800);
                                setDragOverId(null); setDragOverPos(null); setDraggingId(null);
                              }}
                              onDragEnd={() => { setDraggingId(null); setDragOverId(null); setDragOverPos(null); }}
                              onClick={() => { if (!isDesktop) handleOpenEditModal(c); }}
                            >
                              {dragOverId === c.id && dragOverPos === 'before' && (<div className="absolute left-0 right-0 -top-1 h-1 bg-green-500 rounded-full" />)}
                              {dragOverId === c.id && dragOverPos === 'after' && (<div className="absolute left-0 right-0 -bottom-1 h-1 bg-green-500 rounded-full" />)}

                              {/* Coluna Categoria */}
                              <div className="pr-2 flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <span className="hidden md:inline-block cursor-grab active:cursor-grabbing text-gray-400" title="Arrastar para reordenar"><GripVertical size={16} /></span>
                                  {getCategoryIcon(c.tipo)}
                                  <span className="text-gray-900 dark:text-white">{c.nome}</span>
                                  {c.sistema && <span title="Categoria de sistema"><Lock size={14} className="text-yellow-500 dark:text-yellow-400" /></span>}
                                </div>
                                <div className="hidden md:flex items-center space-x-4">
                                  <button onClick={() => handleOpenEditModal(c)} className="text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400" aria-label={`Editar categoria ${c.nome}`}><Pencil size={18} /></button>
                                  <button onClick={() => {
                                    if (isProtected) return;
                                    setConfirmation({
                                      title: 'Excluir categoria?',
                                      message: `Tem certeza que deseja excluir a categoria "${c.nome}"? Esta ação é permanente.`,
                                      buttons: [
                                        { label: 'Cancelar', style: 'secondary', onClick: () => setConfirmation(null) },
                                        { label: 'Excluir', style: 'danger', onClick: async () => { try { await deleteCategoria(c.id); } finally { setConfirmation(null); } } }
                                      ]
                                    });
                                  }} disabled={isProtected} className={`transition-colors ${isProtected ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed' : 'text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400'}`} aria-label={`Excluir categoria ${c.nome}`}><Trash2 size={18} /></button>
                                </div>
                              </div>
                              {/* Coluna Orçado */}
                              <div className="flex items-center justify-center text-sm text-gray-700 dark:text-gray-200 border-l border-gray-700">{formatCurrency(autoBudgets[c.id] || 0)}</div>
                              {/* Coluna Realizado */}
                              <div className="flex items-center justify-center text-sm text-gray-700 dark:text-gray-200 border-l border-gray-700">{formatCurrency(realizado)}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
        </div>
        <Modal 
            isOpen={isModalOpen} 
            onClose={closeModal} 
            title={editingCategoria ? 'Editar Categoria' : 'Adicionar Nova Categoria'}
            footer={
                <>
                    {editingCategoria && !editingCategoria.sistema && (
                        <button 
                          type="button" 
                          onClick={handleDeleteEditingCategoria} 
                          disabled={isEditingInUse}
                          title={isEditingInUse ? 'Não é possível excluir: existem transações ou compras vinculadas.' : 'Excluir categoria'}
                          className={`mr-auto font-bold py-2 px-4 rounded-lg transition-colors ${isEditingInUse ? 'bg-red-400/40 text-white cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 text-white'}`}
                        >
                          Excluir
                        </button>
                    )}
                    <button onClick={closeModal} className="bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-white font-bold py-2 px-4 rounded-lg transition-colors">Cancelar</button>
                    <button type="submit" form="categoria-form" className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition-colors">Salvar</button>
                </>
            }
        >
            <form id="categoria-form" onSubmit={handleSubmit} noValidate className="space-y-4">
                <div>
                    <label htmlFor="nome-cat" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome da Categoria</label>
                    <input type="text" id="nome-cat" value={nome} onChange={(e) => setNome(e.target.value)} className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500" required />
                </div>
                <div className="relative">
                    <label htmlFor="tipo-cat" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo</label>
                    {editingCategoria ? (
                        <input id="tipo-cat" type="text" value={tipo} readOnly className="w-full bg-gray-200 dark:bg-gray-600 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-500 dark:text-gray-300 cursor-not-allowed focus:outline-none" />
                    ) : (
                        <>
                            <select id="tipo-cat" value={tipo} onChange={(e) => setTipo(e.target.value as TipoCategoria)} className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 pl-3 pr-10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none">
                                {Object.values(TipoCategoria).filter(t => ![TipoCategoria.Estorno, TipoCategoria.Transferencia].includes(t)).map(val => ( <option key={val} value={val}>{val}</option>))}
                            </select>
                            <ChevronDown className="absolute right-3 top-[calc(50%+8px)] -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                        </>
                    )}
                </div>
                {[TipoCategoria.Saida, TipoCategoria.Entrada, TipoCategoria.Investimento].includes(tipo) && (
                    <div>
                        <label htmlFor="orcamento-cat" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                             {tipo === TipoCategoria.Saida ? 'Orçamento Mensal (Opcional)' : 'Meta Mensal (Opcional)'}
                        </label>
                        <CurrencyInput value={orcamento} onValueChange={setOrcamento} placeholder="R$ 0,00" className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"/>
                        {editingCategoria && !editingCategoria.sistema && isEditingInUse && (
                          <p className="mt-2 text-xs text-red-500">Esta categoria possui lançamentos vinculados e não pode ser excluída.</p>
                        )}
                    </div>
                )}
            </form>
        </Modal>
    </div>
  );

  return (
    <div className="animate-fade-in">
      <div>
        {activeTab === 'categorias' && renderCategorias()}
        {activeTab === 'visualizacao' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl mx-auto animate-fade-in shadow-sm dark:shadow-none">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Opções de Visualização</h3>
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <div>
                            <label htmlFor="show-percentage" className="font-medium text-gray-800 dark:text-white">Mostrar Variação Percentual</label>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Exibe a mudança percentual nos cards da tela de Resumo.</p>
                        </div>
                        <label htmlFor="show-percentage" className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" id="show-percentage" className="sr-only peer" checked={props.settings.showPercentageChange} onChange={() => props.setSettings(prev => ({ ...prev, showPercentageChange: !prev.showPercentageChange }))}/>
                            <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 rounded-full peer peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                        </label>
                    </div>
                </div>
            </div>
        )}
        {activeTab === 'configuracoes' && (
          <ConfiguracoesPage
            handleDeleteAllData={props.handleDeleteAllData}
            handleExportData={props.handleExportData}
            handleImportData={props.handleImportData}
          />
        )}
      </div>
    </div>
  );
};

export default PerfilPage;
