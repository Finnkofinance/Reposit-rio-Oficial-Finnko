import React, { useRef, useState, useEffect } from 'react';
import { Page } from '@/types/types';
import { User, Pencil, Calendar, Search, Menu, Camera, Trash2, Settings, TrendingUp, Shield, Sun, Moon, BarChartBig, Upload } from 'lucide-react';

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCalcMenuOpen, setIsCalcMenuOpen] = useState(false);
  const calcMenuRef = useRef<HTMLDivElement>(null);
  const [isEditMenuOpen, setIsEditMenuOpen] = useState(false);
  const editMenuRef = useRef<HTMLDivElement>(null);


  const handleProfileClick = () => {
    setCurrentPage('perfil');
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditMenuOpen(prev => !prev);
  };
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onImageSelect(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
     // Reset file input to allow re-uploading the same file
    if(fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  const handleTriggerFileSelect = () => {
    fileInputRef.current?.click();
    setIsEditMenuOpen(false);
  };

  const handleRemoveImage = () => {
    onImageRemove();
    setIsEditMenuOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (calcMenuRef.current && !calcMenuRef.current.contains(event.target as Node)) {
        setIsCalcMenuOpen(false);
      }
      if (editMenuRef.current && !editMenuRef.current.contains(event.target as Node)) {
        setIsEditMenuOpen(false);
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
        {/* Left side: Profile Icon */}
        <div className="relative justify-self-start" ref={editMenuRef}>
            <button onClick={handleProfileClick} className="relative group">
                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                    {profilePicture ? (
                        <img src={profilePicture} alt="Foto de Perfil" className="w-full h-full object-cover" />
                    ) : (
                        <User className="text-gray-400" />
                    )}
                </div>
                <div 
                    onClick={handleEditClick}
                    className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white ring-2 ring-white dark:ring-gray-900 cursor-pointer group-hover:bg-blue-600 transition-colors"
                    title="Alterar foto de perfil"
                    aria-haspopup="true"
                    aria-expanded={isEditMenuOpen}
                >
                    <Pencil size={12} />
                </div>
            </button>
            {isEditMenuOpen && (
                <div className="absolute left-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 animate-fade-in-down">
                    <div className="p-2">
                        <button onClick={handleTriggerFileSelect} className="flex items-center space-x-3 w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white">
                            <Camera size={16} />
                            <span>Alterar foto</span>
                        </button>
                        {profilePicture && (
                            <button onClick={handleRemoveImage} className="flex items-center space-x-3 w-full text-left px-3 py-2 text-sm text-red-500 dark:text-red-400 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">
                                <Trash2 size={16} />
                                <span>Remover foto</span>
                            </button>
                        )}
                    </div>
                </div>
            )}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
        </div>
        
        {/* Center: Resumo Button */}
        <div className="justify-self-center">
            <button
                onClick={() => setCurrentPage('resumo')}
                className="bg-gradient-to-r from-[#19CF67] to-[#00DE5F] text-white w-12 h-12 rounded-full flex items-center justify-center shadow-lg hover:from-[#16B359] hover:to-[#00C454] transition-colors"
                title="Resumo"
                aria-label="Ir para a página de Resumo"
            >
                <BarChartBig size={24} />
            </button>
        </div>
        
        {/* Right side icons */}
        <div className="flex items-center space-x-2 md:space-x-4 justify-self-end">
            <button onClick={() => setCurrentPage('fluxo')} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700/50 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors" aria-label="Calendário">
                <Calendar size={20} />
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
                                setCurrentPage('perfil', { viewId: 'configuracoes' });
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