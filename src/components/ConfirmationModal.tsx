import React from 'react';
import Modal from '@/components/Modal';

export interface ButtonConfig {
    label: string;
    onClick: () => void;
    style: 'primary' | 'secondary' | 'danger';
}

export interface ConfirmationModalData {
    title: string;
    message: React.ReactNode;
    buttons: ButtonConfig[];
}

interface ConfirmationModalProps {
    data: ConfirmationModalData;
    onClose: () => void;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ data, onClose }) => {
    const getButtonClass = (style: 'primary' | 'secondary' | 'danger') => {
        switch (style) {
            case 'primary': return 'bg-blue-500 hover:bg-blue-600';
            case 'danger': return 'bg-red-600 hover:bg-red-700';
            case 'secondary': return 'bg-gray-600 hover:bg-gray-500';
            default: return 'bg-green-500 hover:bg-green-600';
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[999] flex justify-center items-center">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg mx-4 p-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">{data.title}</h3>
                <p className="text-gray-800 dark:text-gray-200 mb-6">{data.message}</p>
                <div className="flex space-x-3 justify-end">
                    {data.buttons.map((btn, index) => (
                        <button
                            key={index}
                            type="button"
                            onClick={btn.onClick}
                            className={`text-white font-bold py-2 px-4 rounded-lg transition-colors ${getButtonClass(btn.style)}`}
                        >
                            {btn.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default ConfirmationModal;
