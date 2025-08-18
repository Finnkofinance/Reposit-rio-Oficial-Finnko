import React from 'react';
import { DollarSign } from 'lucide-react';
import { NAV_ITEMS } from '../constants';
import { Page } from '../types';

interface SidebarProps {
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentPage, setCurrentPage }) => {
  const handleNavClick = (page: Page) => {
    setCurrentPage(page);
  };

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
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  handleNavClick(item.id);
                }}
                className={`flex items-center space-x-3 p-2 rounded-md text-sm font-medium transition-colors ${
                  currentPage === item.id
                    ? 'bg-gradient-to-r from-[#19CF67] to-[#00DE5F] text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;