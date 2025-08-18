import React from 'react';
import Modal from './Modal';

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
        <Modal 
            isOpen={true} 
            onClose={onClose} 
            title={data.title}
            footer={
                <>
                    {data.buttons.map((btn, index) => (
                        <button
                            key={index}
                            onClick={btn.onClick}
                            className={`text-white font-bold py-2 px-4 rounded-lg transition-colors ${getButtonClass(btn.style)}`}
                        >
                            {btn.label}
                        </button>
                    ))}
                </>
            }
        >
            <p className="text-gray-300">{data.message}</p>
        </Modal>
    );
}

export default ConfirmationModal;
