import React, { useState } from 'react';
import CurrencyInput from '@/components/CurrencyInput';
import { formatCurrency } from '@/utils/format';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { ChevronDown } from 'lucide-react';

const JurosCompostosSimulador: React.FC = () => {
    const [valorInicial, setValorInicial] = useState('');
    const [valorMensal, setValorMensal] = useState('');
    const [taxaJuros, setTaxaJuros] = useState('');
    const [tipoTaxa, setTipoTaxa] = useState<'anual' | 'mensal'>('anual');
    const [periodo, setPeriodo] = useState('');
    const [tipoPeriodo, setTipoPeriodo] = useState<'anos' | 'meses'>('anos');

    const [resultado, setResultado] = useState<{ valorFinal: number; totalInvestido: number; totalJuros: number; graficoData: any[] } | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleCalcular = () => {
        const vi = parseFloat(valorInicial) / 100 || 0;
        const vm = parseFloat(valorMensal) / 100 || 0;
        let tj = parseFloat(taxaJuros) || 0;
        let p = parseInt(periodo, 10) || 0;

        if (vi <= 0 || vm < 0 || tj <= 0 || p <= 0) {
            setError('Preencha todos os campos com valores válidos para calcular.');
            setResultado(null);
            return;
        }
        setError(null);

        const taxaMensal = tipoTaxa === 'anual' ? Math.pow(1 + tj / 100, 1 / 12) - 1 : tj / 100;
        const periodoMeses = tipoPeriodo === 'anos' ? p * 12 : p;

        let valorAcumulado = vi;
        let totalInvestido = vi;
        const data = [{ mes: 0, 'Valor Acumulado': valorAcumulado, 'Total Investido': totalInvestido }];

        for (let i = 1; i <= periodoMeses; i++) {
            valorAcumulado *= (1 + taxaMensal);
            valorAcumulado += vm;
            totalInvestido += vm;
            if (i % 12 === 0 || i === periodoMeses) {
                 data.push({
                    mes: i,
                    'Valor Acumulado': parseFloat(valorAcumulado.toFixed(2)),
                    'Total Investido': parseFloat(totalInvestido.toFixed(2)),
                });
            }
        }
        
        setResultado({
            valorFinal: valorAcumulado,
            totalInvestido: totalInvestido,
            totalJuros: valorAcumulado - totalInvestido,
            graficoData: data,
        });
    };

    const handleLimpar = () => {
        setValorInicial('');
        setValorMensal('');
        setTaxaJuros('');
        setPeriodo('');
        setResultado(null);
        setError(null);
    };

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg">
                    <p className="font-bold text-gray-900 dark:text-white mb-2">{`Mês: ${label}`}</p>
                    <p style={{ color: payload[0]?.color || '#000' }} className="text-gray-700 dark:text-gray-300">{`${payload[0]?.name}: ${formatCurrency(payload[0]?.value)}`}</p>
                    <p style={{ color: payload[1]?.color || '#000' }} className="text-gray-700 dark:text-gray-300">{`${payload[1]?.name}: ${formatCurrency(payload[1]?.value)}`}</p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                <div className="space-y-4 bg-gray-50 dark:bg-gray-900/50 p-6 rounded-lg">
                    <div>
                        <label htmlFor="valor-inicial" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Valor Inicial (R$)</label>
                        <CurrencyInput id="valor-inicial" value={valorInicial} onValueChange={setValorInicial} placeholder="R$ 0,00" className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#19CF67]"/>
                    </div>
                    <div>
                        <label htmlFor="valor-mensal" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Valor Mensal (R$)</label>
                        <CurrencyInput id="valor-mensal" value={valorMensal} onValueChange={setValorMensal} placeholder="R$ 0,00" className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#19CF67]"/>
                    </div>
                    <div>
                        <label htmlFor="taxa-juros" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Taxa de Juros</label>
                        <div className="flex">
                            <input id="taxa-juros" type="number" value={taxaJuros} onChange={e => setTaxaJuros(e.target.value)} className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-l-lg px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#19CF67] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" placeholder="Ex: 8.5" />
                            <div className="relative">
                                <select value={tipoTaxa} onChange={e => setTipoTaxa(e.target.value as any)} className="h-full bg-gray-200 dark:bg-gray-600 border border-gray-300 dark:border-gray-600 rounded-r-lg pl-3 pr-10 py-2 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#19CF67] appearance-none">
                                    <option value="anual">anual</option>
                                    <option value="mensal">mensal</option>
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-300 pointer-events-none" size={16}/>
                            </div>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="periodo" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Período</label>
                        <div className="flex">
                            <input id="periodo" type="number" value={periodo} onChange={e => setPeriodo(e.target.value)} className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-l-lg px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#19CF67] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" placeholder="Ex: 20" />
                             <div className="relative">
                                <select value={tipoPeriodo} onChange={e => setTipoPeriodo(e.target.value as any)} className="h-full bg-gray-200 dark:bg-gray-600 border border-gray-300 dark:border-gray-600 rounded-r-lg pl-3 pr-10 py-2 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#19CF67] appearance-none">
                                    <option value="anos">ano(s)</option>
                                    <option value="meses">meses</option>
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-300 pointer-events-none" size={16}/>
                             </div>
                        </div>
                    </div>
                    <div className="flex items-center space-x-4 pt-2">
                        <button onClick={handleCalcular} className="w-full bg-gradient-to-r from-[#19CF67] to-[#00DE5F] hover:from-[#16B359] hover:to-[#00C454] text-white font-bold py-3 px-4 rounded-lg transition-colors">Calcular</button>
                        <button onClick={handleLimpar} className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white text-sm font-medium transition-colors whitespace-nowrap">Limpar</button>
                    </div>
                </div>
                <div className="space-y-4">
                    {error && <p className="text-yellow-500 dark:text-yellow-400 text-center">{error}</p>}
                    {resultado && (
                        <div className="animate-fade-in space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="bg-gradient-to-r from-[rgba(25,207,103,0.1)] to-[rgba(0,222,95,0.1)] border border-[#19CF67]/30 text-gray-900 dark:text-white p-4 rounded-lg text-center">
                                    <p className="text-sm font-medium text-transparent bg-clip-text bg-gradient-to-r from-[#19CF67] to-[#00DE5F]">Valor Final</p>
                                    <p className="text-xl font-bold">{formatCurrency(resultado.valorFinal)}</p>
                                </div>
                                <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg text-center text-gray-900 dark:text-white">
                                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Aportado</p>
                                    <p className="text-xl font-bold">{formatCurrency(resultado.totalInvestido)}</p>
                                </div>
                                <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg text-center text-gray-900 dark:text-white">
                                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total em Juros</p>
                                    <p className="text-xl font-bold">{formatCurrency(resultado.totalJuros)}</p>
                                </div>
                            </div>
                             <div className="w-full h-80 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg text-gray-600 dark:text-gray-400">
                                <ResponsiveContainer>
                                    <LineChart data={resultado.graficoData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.2} />
                                        <XAxis dataKey="mes" stroke="currentColor" fontSize={12} tickLine={false} axisLine={false} label={{ value: 'Meses', position: 'insideBottom', offset: -5 }}/>
                                        <YAxis stroke="currentColor" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => formatCurrency(v as number).replace(/\s/g, '')} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend wrapperStyle={{fontSize: "14px"}}/>
                                        <Line type="monotone" dataKey="Valor Acumulado" stroke="#19CF67" strokeWidth={2}/>
                                        <Line type="monotone" dataKey="Total Investido" stroke="#6b7280" strokeDasharray="5 5" strokeWidth={2} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default JurosCompostosSimulador;