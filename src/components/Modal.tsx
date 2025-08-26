import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  zIndexClass?: string;
  overlayClassName?: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer, zIndexClass, overlayClassName }) => {
  // Prevenir scroll do body quando modal estiver aberto (mobile)
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = '0px'; // Evita shift de layout
    } else {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }
    
    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className={`fixed inset-0 ${overlayClassName || 'bg-black bg-opacity-60 dark:bg-opacity-70'} ${zIndexClass || 'z-50'} flex justify-center items-start md:items-center overflow-y-auto py-4 md:py-0`}
      onClick={onClose}
      aria-modal="true"
      role="dialog"
      style={{ touchAction: 'pan-y' }}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg md:max-w-xl mx-4 my-4 md:my-0 animate-fade-in-up max-h-[calc(100vh-2rem)] md:max-h-[90vh] flex flex-col overflow-hidden" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-shrink-0 p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-800 dark:hover:text-white" aria-label="Close modal">
              <X size={24} />
            </button>
          </div>
        </div>
        <div className="flex-1 p-6 overflow-y-auto" style={{ overscrollBehavior: 'contain' }}>
            {children}
        </div>
        {footer && (
            <div className="flex-shrink-0 bg-gray-50 dark:bg-gray-800/50 backdrop-blur-sm rounded-b-lg border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-end space-x-3">
                {footer}
            </div>
        )}
      </div>
    </div>
  );
};

export default Modal;