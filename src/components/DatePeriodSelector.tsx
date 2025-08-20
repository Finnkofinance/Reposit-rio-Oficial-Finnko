import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DatePeriodSelectorProps {
    title?: string;
    selectedMonth: string; // YYYY-MM
    onMonthChange: (newMonth: string) => void;
}

const ALL_MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const DatePeriodSelector: React.FC<DatePeriodSelectorProps> = ({ title, selectedMonth, onMonthChange }) => {
    const { year, monthIndex } = useMemo(() => {
        const [y, m] = selectedMonth.split('-').map(Number);
        return { year: y, monthIndex: m - 1 };
    }, [selectedMonth]);

    const changeYear = (newYear: number) => {
        onMonthChange(`${newYear}-${String(monthIndex + 1).padStart(2, '0')}`);
    };

    const navigateMonth = (offset: number) => {
        const currentDate = new Date(year, monthIndex, 15);
        currentDate.setMonth(currentDate.getMonth() + offset);
        const newYear = currentDate.getFullYear();
        const newMonth = currentDate.getMonth() + 1;
        onMonthChange(`${newYear}-${String(newMonth).padStart(2, '0')}`);
    };

    const getMonthLabel = (offset: number) => {
        const d = new Date(year, monthIndex + offset, 1);
        return ALL_MONTHS[d.getMonth()];
    };

    return (
        <div className="flex flex-col items-center space-y-2 mb-6">
            {title && <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{title}</h2>}
            {/* Year Selector */}
            <div className="flex items-center space-x-4 text-base font-medium text-gray-500 dark:text-gray-400">
                <button onClick={() => changeYear(year - 1)} className="hover:text-gray-900 dark:hover:text-white transition-colors">{year - 1}</button>
                <span className="text-gray-900 dark:text-white font-bold text-lg">{year}</span>
                <button onClick={() => changeYear(year + 1)} className="hover:text-gray-900 dark:hover:text-white transition-colors">{year + 1}</button>
            </div>
            {/* Month Selector */}
            <div className="flex items-center space-x-1">
                <button onClick={() => navigateMonth(-1)} className="p-1.5 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-white transition-colors" aria-label="Mês anterior">
                    <ChevronLeft size={18} />
                </button>
                <div className="flex items-center space-x-1 text-sm">
                    <button onClick={() => navigateMonth(-1)} className="px-3 py-1.5 rounded-full bg-gray-200 dark:bg-gray-700/80 hover:bg-gray-300 dark:hover:bg-gray-700 w-24 text-center text-gray-700 dark:text-gray-300 transition-colors">{getMonthLabel(-1)}</button>
                    <button onClick={() => navigateMonth(0)} className="px-3 py-1.5 rounded-full bg-gradient-to-r from-[#19CF67] to-[#00DE5F] text-white font-semibold w-24 text-center shadow-md">{getMonthLabel(0)}</button>
                    <button onClick={() => navigateMonth(1)} className="px-3 py-1.5 rounded-full bg-gray-200 dark:bg-gray-700/80 hover:bg-gray-300 dark:hover:bg-gray-700 w-24 text-center text-gray-700 dark:text-gray-300 transition-colors">{getMonthLabel(1)}</button>
                </div>
                <button onClick={() => navigateMonth(1)} className="p-1.5 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-white transition-colors" aria-label="Próximo mês">
                    <ChevronRight size={18} />
                </button>
            </div>
        </div>
    );
};

export default DatePeriodSelector;