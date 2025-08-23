import React, { useEffect } from 'react';
import { CheckCircle, XCircle, Info } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000); // 5 seconds
    return () => clearTimeout(timer);
  }, [onClose]);

  const config = {
      success: {
          bgColor: 'bg-gradient-to-r from-[#19CF67] to-[#00DE5F]',
          Icon: CheckCircle,
      },
      error: {
          bgColor: 'bg-red-600',
          Icon: XCircle,
      },
      info: {
          bgColor: 'bg-blue-600',
          Icon: Info,
      }
  };

  const { bgColor, Icon } = config[type] || config.info;

  return (
    <div className={`fixed top-6 right-6 z-[120] flex items-center p-4 rounded-lg text-white shadow-lg animate-fade-in-down ${bgColor}`}>
      <Icon size={24} className="mr-3 flex-shrink-0" />
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
};

export default Toast;