import React, { useState, useEffect, useRef } from 'react';
import { Plus, ShoppingCart, Landmark, CreditCard, ArrowUp, ArrowDown, X } from 'lucide-react';
import { Page } from '../types';
import { NAV_ITEMS } from '../constants';

interface BottomNavProps {
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
  onNewTransaction: () => void;
  onNewCardPurchase: () => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ currentPage, setCurrentPage, onNewTransaction, onNewCardPurchase }) => {
  const [isFabOpen, setFabOpen] = useState(false);
  const fabRef = useRef<HTMLDivElement>(null);
  
  const navItemsForBar = [
    NAV_ITEMS.find(i => i.id === 'categorias-nav'),
    NAV_ITEMS.find(i => i.id === 'contas-extrato'),
    NAV_ITEMS.find(i => i.id === 'cartoes'),
    NAV_ITEMS.find(i => i.id === 'investimentos'),
  ].filter(Boolean) as { id: Page; label: string; icon: React.ReactElement }[];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (fabRef.current && !fabRef.current.contains(event.target as Node)) {
        setFabOpen(false);
      }
    };
    if (isFabOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isFabOpen]);

  const fabActions = [
    { label: 'Nova Transação', icon: <Landmark size={24} className="text-white" />, action: onNewTransaction },
    { label: 'Compra no Cartão', icon: <CreditCard size={24} className="text-white" />, action: onNewCardPurchase },
  ];
  
  return (
    <div ref={fabRef}>
      {/* Mobile Nav & FAB */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-[calc(4.5rem+env(safe-area-inset-bottom))] bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-t border-gray-200 dark:border-gray-700/50 z-40">
        
        {/* FAB Actions Container */}
        <div className={`absolute bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 flex flex-row items-center gap-4 transition-all duration-300 ease-in-out ${isFabOpen ? 'opacity-100 scale-100' : 'opacity-0 pointer-events-none scale-90'}`}>
          {fabActions.map((action, index) => (
            <button 
              key={action.label} 
              onClick={() => { action.action(); setFabOpen(false); }} 
              title={action.label} 
              className="bg-slate-700 dark:bg-slate-800 w-14 h-14 rounded-full flex items-center justify-center shadow-lg disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:opacity-50 relative transition-all duration-300"
              style={{ transitionDelay: isFabOpen ? `${index * 50}ms` : '0ms' }}
            >
              {action.icon}
              <div className="absolute -bottom-1 -right-1 flex bg-black/20 p-0.5 rounded-full backdrop-blur-sm border border-white/10">
                <ArrowUp size={10} className="text-[#19CF67]" />
                <ArrowDown size={10} className="text-red-500" />
              </div>
            </button>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="flex justify-around items-center h-full px-2 pb-[env(safe-area-inset-bottom)]">
          {navItemsForBar.slice(0, 2).map(item => (
            <button key={item.id} onClick={() => setCurrentPage(item.id)} className="flex flex-col items-center justify-center w-1/5">
              <div className={`p-3 rounded-full transition-colors ${currentPage === item.id ? 'bg-gradient-to-r from-[#19CF67] to-[#00DE5F] text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                {React.cloneElement(item.icon as React.ReactElement<{ size?: number }>, { size: 24 })}
              </div>
            </button>
          ))}
          <div className="w-1/5 flex justify-center">
              <button onClick={() => setFabOpen(!isFabOpen)} className="bg-gradient-to-r from-[#19CF67] to-[#00DE5F] hover:from-[#16B359] hover:to-[#00C454] text-white w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-transform duration-300 relative overflow-hidden">
                  <Plus size={32} className={`transition-all duration-300 absolute ${isFabOpen ? 'opacity-0 -rotate-45' : 'opacity-100 rotate-0'}`} />
                  <X size={28} className={`transition-all duration-300 absolute ${isFabOpen ? 'opacity-100 rotate-0' : 'opacity-0 rotate-45'}`} />
              </button>
          </div>
          {navItemsForBar.slice(2, 4).map(item => (
            <button key={item.id} onClick={() => setCurrentPage(item.id)} className="flex flex-col items-center justify-center w-1/5">
              <div className={`p-3 rounded-full transition-colors ${currentPage === item.id ? 'bg-gradient-to-r from-[#19CF67] to-[#00DE5F] text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                  {React.cloneElement(item.icon as React.ReactElement<{ size?: number }>, { size: 24 })}
              </div>
            </button>
          ))}
        </div>
      </nav>

      {/* Desktop FAB */}
      <div className="hidden md:block fixed bottom-8 right-8 z-40">
        <div className="flex flex-row-reverse items-center gap-4">
            <button onClick={() => setFabOpen(!isFabOpen)} className="bg-gradient-to-r from-[#19CF67] to-[#00DE5F] hover:from-[#16B359] hover:to-[#00C454] text-white w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-transform duration-300 relative overflow-hidden">
                <Plus size={32} className={`transition-all duration-300 absolute ${isFabOpen ? 'opacity-0 -rotate-45' : 'opacity-100 rotate-0'}`} />
                <X size={28} className={`transition-all duration-300 absolute ${isFabOpen ? 'opacity-100 rotate-0' : 'opacity-0 rotate-45'}`} />
            </button>
            <div className={`flex flex-row items-center gap-4 transition-all duration-300 ease-in-out ${isFabOpen ? 'opacity-100 scale-100' : 'opacity-0 pointer-events-none scale-90'}`}>
              {fabActions.map((action, index) => (
                <div key={action.label} className="relative group">
                  <span className="absolute right-full mr-4 px-3 py-1.5 bg-slate-700 dark:bg-slate-800 text-white text-xs font-semibold rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">{action.label}</span>
                  <button 
                    onClick={() => { action.action(); setFabOpen(false); }} 
                    title={action.label} 
                    className="bg-slate-700 dark:bg-slate-800 w-14 h-14 rounded-full flex items-center justify-center shadow-lg disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:opacity-50 relative transition-all duration-300"
                    style={{ transitionDelay: isFabOpen ? `${index * 50}ms` : '0ms' }}
                  >
                    {action.icon}
                    <div className="absolute -bottom-1 -right-1 flex bg-black/20 p-0.5 rounded-full backdrop-blur-sm border border-white/10">
                      <ArrowUp size={10} className="text-[#19CF67]" />
                      <ArrowDown size={10} className="text-red-500" />
                    </div>
                  </button>
                </div>
              ))}
            </div>
        </div>
      </div>
    </div>
  );
};

export default BottomNav;