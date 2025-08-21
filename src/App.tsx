import React, { useState, useEffect, Suspense } from 'react';
import { RouterProvider, Outlet, useLocation, useNavigate } from 'react-router-dom';
import Papa from 'papaparse';

// Components
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import Toast from '@/components/Toast';
import ConfirmationModal, { ConfirmationModalData } from '@/components/ConfirmationModal';
import Modal from '@/components/Modal';
import NovaTransacaoModal from '@/components/NovaTransacaoModal';
import EditarTransacaoModal from '@/components/EditarTransacaoModal';
import EditarTransferenciaModal from '@/components/EditarTransferenciaModal';
import NovaCompraCartaoModal from '@/components/NovaCompraCartaoModal';
import EditarCompraCartaoModal from '@/components/EditarCompraCartaoModal';
import ImageCropModal from '@/components/ImageCropModal';
import SearchModal from '@/components/SearchModal';

// Context
import { AppProvider } from '@/context/AppContext';
import { AuthProvider } from '@/features/auth/AuthProvider';

// Types and Utils
import { ModalState, TransacaoBanco } from '@/types/types';
import { formatCurrency, formatDate, parseBrDate, parseCurrency } from '@/utils/format';

// Hooks
import { useAccounts } from '@/hooks/useAccounts';
import { useTransactions } from '@/hooks/useTransactions';
import { useCards } from '@/hooks/useCards';
import { useCategories } from '@/hooks/useCategories';

// Router with layout
import { createBrowserRouter } from 'react-router-dom';
import ResumoPageWrapper from '@/pages/ResumoPageWrapper';
import ContasExtratoPageWrapper from '@/pages/ContasExtratoPageWrapper';
import FluxoCaixaPageWrapper from '@/pages/FluxoCaixaPageWrapper';
import CartoesPageWrapper from '@/pages/CartoesPageWrapper';
import InvestimentosPageWrapper from '@/pages/InvestimentosPageWrapper';
import PerfilPageWrapper from '@/pages/PerfilPageWrapper';
import CalculadoraJurosCompostosPageWrapper from '@/pages/CalculadoraJurosCompostosPageWrapper';
import CalculadoraReservaEmergenciaPageWrapper from '@/pages/CalculadoraReservaEmergenciaPageWrapper';
import LandingPage from '@/pages/LandingPage';
import AuthPage from '@/pages/AuthPage';
import { useAuth } from '@/features/auth/AuthProvider';

// CSV Import Types
type CsvTransaction = { data: string; descricao: string; valor: number; originalLine: any };
type CsvImportRow = CsvTransaction & {
    selected: boolean;
    isDuplicate: boolean;
};
type CsvImportState = {
    transactions: CsvImportRow[];
    fileName: string;
} | null;

// Layout Component that wraps all pages
const Layout = () => {
    const location = useLocation();
    const navigate = useNavigate();
    
    // Get current page from URL path
    const getCurrentPageFromPath = (pathname: string): string => {
        // Suporta rotas sob "/app/*" e diretas
        const cleaned = pathname.startsWith('/app') ? pathname.replace(/^\/app/, '') : pathname;
        const path = cleaned === '' ? '/' : cleaned;
        const pathMap: Record<string, string> = {
            '/': 'resumo',
            '/resumo': 'resumo',
            '/contas': 'contas-extrato',
            '/contas-extrato': 'contas-extrato',
            '/fluxo': 'fluxo',
            '/cartoes': 'cartoes',
            '/investimentos': 'investimentos',
            '/perfil': 'perfil',
            '/calculadora-juros-compostos': 'calculadora-juros-compostos',
            '/calculadora-reserva-emergencia': 'calculadora-reserva-emergencia'
        };
        return pathMap[path] || 'resumo';
    };

    const currentPage = getCurrentPageFromPath(location.pathname);

    // Context hooks
    const { contas, addConta } = useAccounts();
    const { transacoes, addTransacao, addRecurringTransacao, addTransferencia, updateTransacao, updateTransferencia, addPayment } = useTransactions();
    const { cartoes, compras, addCompraCartao, updateCompraCartao } = useCards();
    const { categorias } = useCategories();

    // UI State
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
    const [confirmation, setConfirmation] = useState<ConfirmationModalData | null>(null);
    const [modalState, setModalState] = useState<ModalState>({ modal: null, data: null });
    const [profilePicture, setProfilePicture] = useState<string | null>(null);
    const [imageToCrop, setImageToCrop] = useState<string | null>(null);
    const [theme, setTheme] = useState<'light' | 'dark'>('dark');
    const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [csvImportState, setCsvImportState] = useState<CsvImportState>(null);

    // Load persistent UI state
    useEffect(() => {
        try {
            const profileItem = window.localStorage.getItem('profilePicture');
            setProfilePicture(profileItem ? JSON.parse(profileItem) : null);
            
            const themeItem = window.localStorage.getItem('theme');
            setTheme(themeItem ? JSON.parse(themeItem) : 'dark');
        } catch (error) {
            console.error('Error loading UI state:', error);
        }
    }, []);

    // Save UI state changes
    useEffect(() => {
        try {
            window.localStorage.setItem('profilePicture', JSON.stringify(profilePicture));
        } catch (error) {
            console.error('Error saving profile picture:', error);
        }
    }, [profilePicture]);

    useEffect(() => {
        try {
            window.localStorage.setItem('theme', JSON.stringify(theme));
        } catch (error) {
            console.error('Error saving theme:', error);
        }
    }, [theme]);

    // Theme effect
    useEffect(() => {
        const root = window.document.documentElement;
        if (theme === 'dark') root.classList.add('dark');
        else root.classList.remove('dark');
    }, [theme]);

    // Navigation function
    const setCurrentPage = (page: string) => {
        const routeMap: Record<string, string> = {
            'resumo': '/app/resumo',
            'contas-extrato': '/app/contas',
            'fluxo': '/app/fluxo',
            'cartoes': '/app/cartoes',
            'investimentos': '/app/investimentos',
            'perfil': '/app/perfil',
            'categorias-nav': '/app/perfil',
            'calculadora-juros-compostos': '/app/calculadora-juros-compostos',
            'calculadora-reserva-emergencia': '/app/calculadora-reserva-emergencia'
        };
        navigate(routeMap[page] || '/app/resumo');
    };

    // Modal functions
    const openModal = (modal: string, data: any = null) => {
        setModalState({ modal, data });
    };

    const closeModal = () => {
        setModalState({ modal: null, data: null });
    };

    // Toast function
    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
        setToast({ message, type });
    };

    // Profile picture handlers
    const handleSetProfilePicture = (croppedImage: string) => {
        setProfilePicture(croppedImage);
        setImageToCrop(null);
        showToast('Foto de perfil atualizada!', 'success');
    };

    const handleRemoveProfilePicture = () => {
        setProfilePicture(null);
        showToast('Foto de perfil removida.', 'info');
    };

    // Transaction and card handlers
    const handleNewTransactionClick = () => {
        if (contas.length > 0) {
            openModal('nova-transacao');
        } else {
            setConfirmation({
                title: 'Nenhuma Conta Cadastrada',
                message: 'Você ainda não tem uma conta cadastrada. Cadastre agora!',
                buttons: [
                    { label: 'Depois', onClick: () => setConfirmation(null), style: 'secondary' },
                    { label: 'Cadastrar Conta', onClick: () => {
                        setConfirmation(null);
                        navigate('/app/contas');
                    }, style: 'primary' },
                ]
            });
        }
    };

    const handleNewCardPurchaseClick = () => {
        if (cartoes.length > 0) {
            openModal('nova-compra-cartao');
        } else {
            setConfirmation({
                title: 'Nenhum Cartão Cadastrado',
                message: 'Você ainda não tem um cartão de crédito cadastrado. Cadastre agora!',
                buttons: [
                    { label: 'Depois', onClick: () => setConfirmation(null), style: 'secondary' },
                    { label: 'Cadastrar Cartão', onClick: () => {
                        setConfirmation(null);
                        navigate('/app/cartoes');
                    }, style: 'primary' },
                ]
            });
        }
    };

    // Handle transaction operations
    const handleAddTransacao = (transacaoData: any) => {
        const categoria = categorias.find(c => c.id === transacaoData.categoria_id);
        if (!categoria) {
            showToast('Categoria não encontrada.', 'error');
            return;
        }

        if (transacaoData.recorrencia) {
            // Use the recurring transaction method from context
            addRecurringTransacao(transacaoData, categoria);
            showToast(`Transação recorrente "${transacaoData.descricao}" criada!`, 'success');
        } else {
            addTransacao(transacaoData, categoria);
            showToast('Transação adicionada!', 'success');
        }
    };

    const handleAddTransferencia = (data: any) => {
        addTransferencia(data, contas);
        showToast('Transferência registrada!', 'success');
    };

    const handleUpdateTransacao = (tx: TransacaoBanco) => {
        const categoria = categorias.find(c => c.id === tx.categoria_id);
        if (!categoria) {
            showToast('Categoria inválida.', 'error');
            return;
        }
        updateTransacao(tx, categoria);
        showToast('Transação atualizada!', 'success');
    };

    const handleUpdateTransferencia = (data: any) => {
        updateTransferencia(data, contas);
        showToast('Transferência atualizada!', 'success');
    };

    const handleAddCompraCartao = (compraData: any) => {
        const success = addCompraCartao(compraData);
        if (success) {
            showToast('Compra adicionada!', 'success');
            return true;
        }
        showToast('Cartão não encontrado.', 'error');
        return false;
    };

    const handleUpdateCompraCartao = (compra: any) => {
        const success = updateCompraCartao(compra);
        if (success) {
            showToast('Compra atualizada!', 'success');
            return true;
        }
        showToast('Cartão não encontrado.', 'error');
        return false;
    };

    // Search functionality (simplified)
    const searchResults = {
        actions: [],
        contas: [],
        cartoes: [],
        transacoes: [],
        compras: [],
        objetivos: [],
        categorias: [],
        ativos: []
    };

    const handleSearchResultClick = () => {
        setIsSearchModalOpen(false);
        setSearchTerm('');
    };

    return (
        <AppProvider
            onShowToast={showToast}
            onSetConfirmation={setConfirmation}
            profilePicture={profilePicture}
            setProfilePicture={setProfilePicture}
            theme={theme}
            setTheme={setTheme}
            modalState={modalState}
            setModalState={setModalState}
        >
            <div className="flex h-screen overflow-hidden">
                <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} />
                <div className="flex-1 flex flex-col overflow-hidden">
                    <Header 
                        setCurrentPage={setCurrentPage} 
                        profilePicture={profilePicture} 
                        onImageSelect={setImageToCrop} 
                        onImageRemove={handleRemoveProfilePicture} 
                        onSearchClick={() => setIsSearchModalOpen(true)} 
                        theme={theme} 
                        setTheme={setTheme} 
                    />
                    <main className="flex-1 overflow-y-auto p-4 pb-36 md:pb-24 md:p-8">
                        <Outlet />
                    </main>
                </div>

                <BottomNav 
                    currentPage={currentPage} 
                    setCurrentPage={setCurrentPage} 
                    onNewTransaction={handleNewTransactionClick} 
                    onNewCardPurchase={handleNewCardPurchaseClick} 
                />

                {/* Modals and UI Components */}
                {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
                {confirmation && <ConfirmationModal data={confirmation} onClose={() => setConfirmation(null)} />}
                {imageToCrop && <ImageCropModal imageSrc={imageToCrop} onClose={() => setImageToCrop(null)} onSave={handleSetProfilePicture} />}
                
                <SearchModal 
                    isOpen={isSearchModalOpen} 
                    onClose={() => setIsSearchModalOpen(false)} 
                    searchTerm={searchTerm} 
                    onSearchTermChange={setSearchTerm} 
                    results={searchResults} 
                    onResultClick={handleSearchResultClick} 
                />
                
                {csvImportState && (
                    <div>CSV Import Modal would go here</div>
                )}
                
                {/* Transaction Modals */}
                {modalState.modal === 'nova-transacao' && (
                    <NovaTransacaoModal
                        isOpen={true}
                        onClose={closeModal}
                        onSave={handleAddTransacao}
                        onSaveTransferencia={handleAddTransferencia}
                        contas={contas}
                        categorias={categorias}
                    />
                )}
                
                {modalState.modal === 'editar-transacao' && (
                    <EditarTransacaoModal
                        isOpen={true}
                        onClose={closeModal}
                        onSave={handleUpdateTransacao}
                        transacaoToEdit={modalState.data?.transacao}
                        contas={contas}
                        categorias={categorias}
                    />
                )}
                
                {modalState.modal === 'editar-transferencia' && (
                    <EditarTransferenciaModal
                        isOpen={true}
                        onClose={closeModal}
                        onSave={handleUpdateTransferencia}
                        transferenciaToEdit={modalState.data?.transferencia}
                    />
                )}
                
                {/* Card Purchase Modals */}
                {modalState.modal === 'nova-compra-cartao' && (
                    <NovaCompraCartaoModal
                        isOpen={true}
                        onClose={closeModal}
                        onSave={handleAddCompraCartao}
                        cartoes={cartoes}
                        categorias={categorias}
                        defaultCartaoId={modalState.data?.cartaoId}
                    />
                )}
                
                {modalState.modal === 'editar-compra-cartao' && (
                    <EditarCompraCartaoModal
                        isOpen={true}
                        onClose={closeModal}
                        onSave={handleUpdateCompraCartao}
                        compraToEdit={modalState.data?.compra}
                        cartoes={cartoes}
                        categorias={categorias}
                    />
                )}
            </div>
        </AppProvider>
    );
};


// Create new router with layout
// Public routes (landing + auth)
const publicRoutes = {
    path: '/',
    element: <LandingPage />,
};

// Guard para rotas protegidas (usa sessão real do Supabase)
const AppGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { session, loading } = useAuth();
    const demoAllowed = (() => {
        try { return window.localStorage.getItem('demo:allow') === 'true'; } catch { return false; }
    })();
    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-100 dark:bg-gradient-to-b dark:from-gray-900 dark:to-black">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#19CF67] mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-300">Verificando sessão…</p>
                </div>
            </div>
        );
    }
    if (!session && !demoAllowed) return <AuthPage />;
    return <>{children}</>;
};

const routerWithLayout = createBrowserRouter([
    publicRoutes,
    {
        path: '/auth',
        element: <AuthPage />,
    },
    {
        path: '/app',
        element: (
            <AppGuard>
                <Layout />
            </AppGuard>
        ),
        children: [
            { path: 'resumo', element: <ResumoPageWrapper /> },
            { path: 'contas', element: <ContasExtratoPageWrapper /> },
            { path: 'contas-extrato', element: <ContasExtratoPageWrapper /> },
            { path: 'fluxo', element: <FluxoCaixaPageWrapper /> },
            { path: 'cartoes', element: <CartoesPageWrapper /> },
            { path: 'investimentos', element: <InvestimentosPageWrapper /> },
            { path: 'perfil', element: <PerfilPageWrapper /> },
            { path: 'calculadora-juros-compostos', element: <CalculadoraJurosCompostosPageWrapper /> },
            { path: 'calculadora-reserva-emergencia', element: <CalculadoraReservaEmergenciaPageWrapper /> },
            { path: 'configuracoes', element: <div className="text-center p-8"><h1 className="text-2xl">Configurações - Em breve</h1></div> },
        ]
    },
    { path: '*', element: <div className="text-center p-8"><h1 className="text-2xl">Página não encontrada</h1></div> },
]);

const App: React.FC = () => {
    return (
        <Suspense fallback={
            <div className="flex h-screen items-center justify-center bg-gray-100 dark:bg-gradient-to-b dark:from-gray-900 dark:to-black">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#19CF67] mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-300">Carregando...</p>
                </div>
            </div>
        }>
            <AuthProvider>
                <RouterProvider router={routerWithLayout} />
            </AuthProvider>
        </Suspense>
    );
};

export default App;