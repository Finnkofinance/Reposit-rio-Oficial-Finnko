import React, { useState } from 'react';
import CurrencyInput from '@/components/CurrencyInput';
import { formatCurrency } from '@/utils/format';
import { ShieldAlert, ChevronDown, ChevronUp } from 'lucide-react';

const CalculadoraReservaEmergencia: React.FC = () => {
    const [tipoEmprego, setTipoEmprego] = useState<'CLT' | 'Autônomo' | 'Freelancer'>('CLT');
    const [custoFixo, setCustoFixo] = useState('');
    const [salarioMensal, setSalarioMensal] = useState('');
    const [percentualGuardado, setPercentualGuardado] = useState('10');
    const [mesesSeguranca, setMesesSeguranca] = useState('6');

    const [resultado, setResultado] = useState<{ reservaIdeal: number; mesesParaAtingir: number } | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleCalcular = () => {
        const custo = parseFloat(custoFixo) / 100 || 0;
        const salario = parseFloat(salarioMensal) / 100 || 0;
        const percentual = parseFloat(percentualGuardado) || 0;
        const meses = parseInt(mesesSeguranca, 10);

        if (custo <= 0 || salario <= 0 || percentual <= 0) {
            setError('Preencha todos os campos com valores válidos para calcular.');
            setResultado(null);
            return;
        }

        setError(null);

        const reservaIdeal = custo * meses;
        const valorGuardadoMes = (salario * percentual) / 100;
        
        if (valorGuardadoMes <= 0) {
            setError('O valor guardado por mês deve ser maior que zero.');
            setResultado(null);
            return;
        }

        const mesesParaAtingir = Math.ceil(reservaIdeal / valorGuardadoMes);

        setResultado({ reservaIdeal, mesesParaAtingir });
    };

    const handleLimpar = () => {
        setTipoEmprego('CLT');
        setCustoFixo('');
        setSalarioMensal('');
        setPercentualGuardado('10');
        setMesesSeguranca('6');
        setResultado(null);
        setError(null);
    };

    const getExplanatoryText = () => {
        const employmentText = {
            'CLT': 'um profissional CLT',
            'Autônomo': 'um profissional autônomo',
            'Freelancer': 'um freelancer'
        }[tipoEmprego];
        return `Para ${employmentText} com ${mesesSeguranca} meses de segurança, sua reserva ideal é:`;
    }
    
    const handlePercentChange = (amount: number) => {
        setPercentualGuardado(prev => {
            const current = parseInt(prev, 10) || 0;
            const newValue = Math.max(1, Math.min(100, current + amount));
            return String(newValue);
        });
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center md:text-left">Calculadora de Reserva de Emergência</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                {/* Inputs */}
                <div className="space-y-4 bg-gray-50 dark:bg-gray-900/50 p-6 rounded-lg">
                    <div>
                        <label htmlFor="tipo-emprego" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo de Emprego</label>
                        <div className="relative">
                            <select id="tipo-emprego" value={tipoEmprego} onChange={e => setTipoEmprego(e.target.value as any)} className="w-full bg-white dark:bg-gray-700 rounded-lg pl-3 pr-10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#19CF67] appearance-none h-[42px]">
                                <option value="CLT">CLT</option>
                                <option value="Autônomo">Autônomo</option>
                                <option value="Freelancer">Freelancer</option>
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                        </div>
                    </div>
                     <div>
                        <label htmlFor="custo-fixo" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Custo Fixo Mensal (R$)</label>
                        <CurrencyInput id="custo-fixo" value={custoFixo} onValueChange={setCustoFixo} placeholder="R$ 0,00" className="w-full bg-white dark:bg-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#19CF67] h-[42px]"/>
                    </div>
                     <div>
                        <label htmlFor="salario-mensal" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Salário Mensal (R$)</label>
                        <CurrencyInput id="salario-mensal" value={salarioMensal} onValueChange={setSalarioMensal} placeholder="R$ 0,00" className="w-full bg-white dark:bg-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#19CF67] h-[42px]"/>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="percentual-guardado" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">% do Salário Guardado</label>
                             <div className="relative flex items-center bg-white dark:bg-gray-700 rounded-lg focus-within:ring-2 focus-within:ring-[#19CF67] h-[42px]">
                                <input
                                    id="percentual-guardado"
                                    type="number"
                                    min="1"
                                    max="100"
                                    value={percentualGuardado}
                                    onChange={e => setPercentualGuardado(e.target.value)}
                                    className="w-full h-full bg-transparent pl-3 text-gray-900 dark:text-white focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                                <div className="flex items-center pr-3 text-gray-400">
                                    <div className="flex flex-col -space-y-1">
                                        <button type="button" onClick={() => handlePercentChange(1)} className="hover:text-gray-800 dark:hover:text-white h-4 flex items-center" aria-label="Aumentar percentual">
                                            <ChevronUp size={16}/>
                                        </button>
                                        <button type="button" onClick={() => handlePercentChange(-1)} className="hover:text-gray-800 dark:hover:text-white h-4 flex items-center" aria-label="Diminuir percentual">
                                            <ChevronDown size={16}/>
                                        </button>
                                    </div>
                                    <span className="ml-2">%</span>
                                </div>
                            </div>
                        </div>
                        <div>
                            <label htmlFor="meses-seguranca" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Meses de Segurança</label>
                            <div className="relative">
                                <select id="meses-seguranca" value={mesesSeguranca} onChange={e => setMesesSeguranca(e.target.value)} className="w-full bg-white dark:bg-gray-700 rounded-lg pl-3 pr-10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#19CF67] appearance-none h-[42px]">
                                    <option value="3">3 meses</option>
                                    <option value="6">6 meses</option>
                                    <option value="12">12 meses</option>
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center space-x-4 pt-2">
                        <button onClick={handleCalcular} className="w-full bg-gradient-to-r from-[#19CF67] to-[#00DE5F] hover:from-[#16B359] hover:to-[#00C454] text-white font-bold py-3 px-4 rounded-lg transition-colors">Calcular</button>
                        <button onClick={handleLimpar} className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white text-sm font-medium transition-colors whitespace-nowrap">Limpar</button>
                    </div>
                </div>

                {/* Resultado */}
                <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-900/30 p-6 rounded-lg min-h-[200px]">
                    {error && (
                         <div className="text-center text-yellow-500 dark:text-yellow-400 animate-fade-in">
                            <ShieldAlert size={48} className="mx-auto mb-4" />
                            <p className="font-semibold">{error}</p>
                        </div>
                    )}
                    {resultado && !error && (
                        <div className="text-center animate-fade-in">
                            <p className="text-gray-600 dark:text-gray-300 mb-2">{getExplanatoryText()}</p>
                            <p className="text-4xl font-extrabold text-gray-900 dark:text-white mb-4">{formatCurrency(resultado.reservaIdeal)}</p>
                            <div className="bg-gray-200 dark:bg-gray-700/50 inline-block px-4 py-2 rounded-full">
                                <p className="text-gray-600 dark:text-gray-300">
                                    Você atingirá sua meta em <span className="font-bold text-gray-800 dark:text-white">{resultado.mesesParaAtingir}</span> {resultado.mesesParaAtingir > 1 ? 'meses' : 'mês'}.
                                </p>
                            </div>
                        </div>
                    )}
                    {!resultado && !error && (
                         <div className="text-center text-gray-500">
                            <p>Preencha os campos e clique em "Calcular" para ver o resultado.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CalculadoraReservaEmergencia;