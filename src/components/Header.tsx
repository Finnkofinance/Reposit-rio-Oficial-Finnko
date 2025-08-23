import React, { useRef, useState, useEffect } from 'react';
import { Page } from '@/types/types';
import { Search, Menu, Settings, TrendingUp, Shield, Sun, Moon, BarChartBig, Upload, LogOut, User, BarChartHorizontal } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthProvider';
import { useAppContext } from '@/context/AppContext';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  setCurrentPage: (page: Page, state?: { viewId: string; }) => void;
  profilePicture: string | null;
  onImageSelect: (imageSrc: string) => void;
  onImageRemove: () => void;
  onSearchClick: () => void;
  theme: 'light' | 'dark';
  setTheme: React.Dispatch<React.SetStateAction<'light' | 'dark'>>;
}

const Header: React.FC<HeaderProps> = ({ setCurrentPage, profilePicture, onImageSelect, onImageRemove, onSearchClick, theme, setTheme }) => {
  const [isCalcMenuOpen, setIsCalcMenuOpen] = useState(false);
  const calcMenuRef = useRef<HTMLDivElement>(null);
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { openModal } = useAppContext() as any;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (calcMenuRef.current && !calcMenuRef.current.contains(event.target as Node)) {
        setIsCalcMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    setIsCalcMenuOpen(false); // Close menu on action
  };

  return (
    <header className="sticky top-0 z-30 h-16 flex-shrink-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border-b border-gray-200 dark:border-gray-900">
      <div className="h-full px-4 md:px-8 grid grid-cols-3 items-center">
        {/* Left: avatar somente no mobile */}
        <div className="justify-self-start md:hidden">
            <button
              onClick={() => openModal('profile')}
              className="relative group"
              aria-label="Perfil"
              title="Perfil"
            >
              <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                {profilePicture ? (
                  <img src={profilePicture} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="text-gray-400" />
                )}
              </div>
            </button>
        </div>
        {/* Desktop spacer para manter layout */}
        <div className="justify-self-start hidden md:block" />
        
        {/* Center: Botão Resumo maior no topo */}
        <div className="justify-self-center">
            <button
                onClick={() => setCurrentPage('resumo')}
                className="bg-gradient-to-r from-[#19CF67] to-[#00DE5F] text-white px-5 md:px-6 h-12 rounded-full flex items-center justify-center gap-2 shadow-lg hover:from-[#16B359] hover:to-[#00C454] transition-colors"
                title="Resumo"
                aria-label="Ir para a página de Resumo"
            >
                <BarChartBig size={20} />
                <span className="font-semibold">Resumo</span>
            </button>
        </div>
        
        {/* Right side icons */}
        <div className="flex items-center space-x-2 md:space-x-4 justify-self-end">
            <button onClick={() => setCurrentPage('categorias-nav')} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700/50 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors" aria-label="Orçamentos e Categorias">
                <BarChartHorizontal size={20} />
            </button>
            <button onClick={onSearchClick} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700/50 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors" aria-label="Buscar">
                <Search size={20} />
            </button>
            <div className="relative" ref={calcMenuRef}>
                <button onClick={() => setIsCalcMenuOpen(prev => !prev)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700/50 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors" aria-label="Calculadoras e Opções">
                    <Menu size={20} />
                </button>
                {isCalcMenuOpen && (
                    <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 animate-fade-in-down">
                        <div className="p-2">
                             <button onClick={toggleTheme} className="flex items-center space-x-3 w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white">
                                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                                <span>{theme === 'dark' ? 'Mudar para Tema Claro' : 'Mudar para Tema Escuro'}</span>
                            </button>
                            <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                            <h4 className="px-3 pt-2 pb-1 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                                Ajustes
                            </h4>
                            <a href="#" onClick={(e) => {
                                e.preventDefault();
                                setCurrentPage('perfil', { viewId: 'visualizacao' });
                                setIsCalcMenuOpen(false);
                            }} className="flex items-center space-x-3 w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white">
                                <Settings size={16} />
                                <span>Visualização</span>
                            </a>
                             <a href="#" onClick={(e) => {
                                e.preventDefault();
                                setCurrentPage('configuracoes');
                                setIsCalcMenuOpen(false);
                            }} className="flex items-center space-x-3 w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white">
                                <Upload size={16} />
                                <span>Dados do App</span>
                            </a>
                            
                            <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                            
                            <h4 className="px-3 pt-2 pb-1 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                                Calculadoras
                            </h4>
                            <a href="#" onClick={(e) => {
                                e.preventDefault();
                                setCurrentPage('calculadora-juros-compostos');
                                setIsCalcMenuOpen(false);
                            }} className="flex items-center space-x-3 w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white">
                                <TrendingUp size={16} />
                                <span>Calculadora de Juros Compostos</span>
                            </a>
                             <a href="#" onClick={(e) => {
                                e.preventDefault();
                                setCurrentPage('calculadora-reserva-emergencia');
                                setIsCalcMenuOpen(false);
                            }} className="flex items-center space-x-3 w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white">
                                <Shield size={16} />
                                <span>Calculadora de Reserva de Emergência</span>
                            </a>
                            <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                            <button onClick={async () => { await signOut(); setIsCalcMenuOpen(false); try { window.localStorage.removeItem('demo:allow'); } catch {} navigate('/'); }} className="flex items-center space-x-3 w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">
                                <LogOut size={16} />
                                <span>Sair da conta</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>
    </header>
  );
};

export default Header;