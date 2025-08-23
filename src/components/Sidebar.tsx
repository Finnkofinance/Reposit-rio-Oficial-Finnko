import React, { useState } from 'react';
import { DollarSign, User } from 'lucide-react';
import Modal from '@/components/Modal';
import ProfileModal from '@/components/ProfileModal';
import { useAuth } from '@/features/auth/AuthProvider';
import { useAppContext } from '@/context/AppContext';
import { NAV_ITEMS } from '@/constants.tsx';
import { Page } from '@/types/types';

interface SidebarProps {
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentPage, setCurrentPage }) => {
  const { user } = useAuth();
  const { profilePicture } = useAppContext() as any;
  const [isProfileOpen, setProfileOpen] = useState(false);
  const handleNavClick = (page: Page) => {
    setCurrentPage(page);
  };
  const userName = user?.user_metadata?.full_name || 'Minha conta';
  const userEmail = user?.email || '—';

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border-r border-gray-200/80 dark:border-gray-700/50 p-4">
      <div className="flex items-center space-x-2 mb-8">
        <DollarSign className="text-transparent bg-clip-text bg-gradient-to-r from-[#19CF67] to-[#00DE5F]" size={32} />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Finnko</h1>
      </div>
      <nav className="flex-grow">
        <ul>
          {NAV_ITEMS.map((item) => (
            <li key={item.id} className="mb-2">
              <button
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`w-full text-left flex items-center space-x-3 p-2 rounded-md text-sm font-medium transition-colors ${
                  currentPage === item.id
                    ? 'bg-gradient-to-r from-[#19CF67] to-[#00DE5F] text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Perfil do usuário (desktop) */}
      <div className="mt-2 pt-3 border-t border-gray-200/80 dark:border-gray-700/50">
        <button
          type="button"
          onClick={() => setProfileOpen(true)}
          className="w-full flex items-center space-x-3 p-2 rounded-md transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
            {profilePicture ? (
              <img src={profilePicture} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <User size={18} className="text-gray-500" />
            )}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">{userName}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{userEmail}</div>
          </div>
        </button>
      </div>

      {isProfileOpen && (
        <ProfileModal isOpen={true} onClose={() => setProfileOpen(false)} />
      )}
    </aside>
  );
};

export default Sidebar;