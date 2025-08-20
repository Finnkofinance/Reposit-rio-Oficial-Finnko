import React, { useRef } from 'react';
import { Download, Upload, Trash2, ShieldAlert } from 'lucide-react';

interface ConfiguracoesPageProps {
  handleDeleteAllData: () => void;
  handleExportData: () => void;
  handleImportData: (file: File) => void;
}

const ConfiguracoesPage: React.FC<ConfiguracoesPageProps> = ({ handleDeleteAllData, handleExportData, handleImportData }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            handleImportData(file);
             // Reset file input to allow re-uploading the same file
            if(fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };
    
    const triggerFileSelect = () => fileInputRef.current?.click();

    return (
        <div className="animate-fade-in">
            <div className="space-y-8 max-w-2xl mx-auto">
                {/* Data Management Card */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm dark:shadow-none">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Gerenciamento de Dados</h3>
                    <div className="space-y-4">
                        <button onClick={handleExportData} className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors">
                            <Download size={20} />
                            <span>Exportar Dados (Backup)</span>
                        </button>
                        <button onClick={triggerFileSelect} className="w-full flex items-center justify-center space-x-2 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-4 rounded-lg transition-colors">
                            <Upload size={20} />
                            <span>Importar Dados (CSV/JSON)</span>
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept=".json,.csv"
                            className="hidden"
                        />
                    </div>
                </div>

                {/* Danger Zone Card */}
                <div className="bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-700 rounded-lg p-6">
                    <div className="flex items-center space-x-3 mb-4">
                        <ShieldAlert className="text-red-500 dark:text-red-400" size={24} />
                        <h3 className="text-xl font-semibold text-red-800 dark:text-red-300">Zona de Perigo</h3>
                    </div>
                    <p className="text-red-700 dark:text-red-300/80 mb-4 text-sm">
                        Esta ação é irreversível. Tenha certeza absoluta antes de prosseguir, pois todos os seus dados financeiros serão perdidos.
                    </p>
                    <button onClick={handleDeleteAllData} className="w-full flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg transition-colors">
                        <Trash2 size={20} />
                        <span>Apagar Todos os Dados</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfiguracoesPage;