import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { 
  columnWidthService, 
  ColumnKey, 
  DEFAULT_COLUMN_WIDTHS, 
  MIN_COLUMN_WIDTH, 
  MAX_COLUMN_WIDTH,
  SCREEN_KEY_FLUXO_CAIXA
} from '@/services/columnWidthService';

interface TableLayoutContextType {
  widths: Record<ColumnKey, number>;
  setWidth: (column: ColumnKey, width: number) => void;
  setWidths: (widths: Record<ColumnKey, number>) => void;
  reset: () => void;
  autoFit: (column: ColumnKey) => void;
  isLoading: boolean;
}

const TableLayoutContext = createContext<TableLayoutContextType | undefined>(undefined);

interface TableLayoutProviderProps {
  children: React.ReactNode;
  userId?: string;
  screenKey?: string;
}

export const TableLayoutProvider: React.FC<TableLayoutProviderProps> = ({ 
  children, 
  userId, 
  screenKey = SCREEN_KEY_FLUXO_CAIXA 
}) => {
  const [widths, setWidthsState] = useState<Record<ColumnKey, number>>(DEFAULT_COLUMN_WIDTHS);
  const [isLoading, setIsLoading] = useState(true);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  // Clamp width dentro dos limites
  const clampWidth = (width: number): number => {
    return Math.max(MIN_COLUMN_WIDTH, Math.min(MAX_COLUMN_WIDTH, width));
  };

  // Debounced save para evitar muitas chamadas ao salvar
  const debouncedSave = (newWidths: Record<ColumnKey, number>) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      if (userId) {
        columnWidthService.saveWidths(userId, screenKey, newWidths);
      }
    }, 300);
  };

  // Carregar larguras iniciais
  useEffect(() => {
    const loadWidths = async () => {
      if (!userId) {
        setIsLoading(false);
        return;
      }
      
      try {
        const savedWidths = await columnWidthService.getWidths(userId, screenKey);
        if (savedWidths) {
          // Aplicar clamp nas larguras salvas para garantir que estão dentro dos limites
          const clampedWidths = Object.keys(savedWidths).reduce((acc, key) => {
            const columnKey = key as ColumnKey;
            acc[columnKey] = clampWidth(savedWidths[columnKey] || DEFAULT_COLUMN_WIDTHS[columnKey]);
            return acc;
          }, {} as Record<ColumnKey, number>);
          
          setWidthsState(clampedWidths);
        }
      } catch (error) {
        console.warn('Erro ao carregar larguras das colunas:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadWidths();
  }, [userId, screenKey]);

  const setWidth = (column: ColumnKey, width: number) => {
    const clampedWidth = clampWidth(width);
    const newWidths = { ...widths, [column]: clampedWidth };
    setWidthsState(newWidths);
    debouncedSave(newWidths);
  };

  const setWidths = (newWidths: Record<ColumnKey, number>) => {
    // Aplicar clamp em todas as larguras
    const clampedWidths = Object.keys(newWidths).reduce((acc, key) => {
      const columnKey = key as ColumnKey;
      acc[columnKey] = clampWidth(newWidths[columnKey]);
      return acc;
    }, {} as Record<ColumnKey, number>);
    
    setWidthsState(clampedWidths);
    debouncedSave(clampedWidths);
  };

  const reset = async () => {
    setWidthsState(DEFAULT_COLUMN_WIDTHS);
    if (userId) {
      await columnWidthService.clearWidths(userId, screenKey);
    }
  };

  const autoFit = (column: ColumnKey) => {
    try {
      const width = measureAutoFitWidth(column);
      setWidth(column, width);
    } catch (error) {
      console.warn('Erro no auto-fit:', error);
      // Fallback para largura padrão
      setWidth(column, DEFAULT_COLUMN_WIDTHS[column]);
    }
  };

  // Cleanup do timeout na desmontagem
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const contextValue: TableLayoutContextType = {
    widths,
    setWidth,
    setWidths,
    reset,
    autoFit,
    isLoading,
  };

  return (
    <TableLayoutContext.Provider value={contextValue}>
      {children}
    </TableLayoutContext.Provider>
  );
};

/**
 * Hook para usar o contexto de layout da tabela
 */
export const useTableLayout = (): TableLayoutContextType => {
  const context = useContext(TableLayoutContext);
  if (context === undefined) {
    throw new Error('useTableLayout deve ser usado dentro de um TableLayoutProvider');
  }
  return context;
};

/**
 * Função utilitária para medir a largura auto-fit de uma coluna
 */
function measureAutoFitWidth(column: ColumnKey): number {
  try {
    // Criar canvas temporário para medição
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas context not available');

    // Usar fonte padrão do sistema (pode ser obtida de getComputedStyle se necessário)
    context.font = '12px system-ui, -apple-system, sans-serif';

    // Textos de exemplo para cada coluna
    const sampleTexts: Record<ColumnKey, string[]> = {
      date: ['31/12', '01/01', 'Data'],
      income: ['R$ 123.456,78', 'R$ 1.000,00', 'Entradas'],
      expense: ['R$ 987.654,32', 'R$ 2.500,00', 'Saídas'],
      invest: ['R$ 50.000,00', 'R$ 500,00', 'Invest.'],
      balance: ['R$ 999.999,99', 'R$ -10.000,00', 'Saldo'],
    };

    const texts = sampleTexts[column] || ['Sample Text'];
    
    // Medir largura máxima dos textos
    let maxWidth = 0;
    for (const text of texts) {
      const metrics = context.measureText(text);
      maxWidth = Math.max(maxWidth, metrics.width);
    }

    // Adicionar padding (16px left + 16px right = 32px)
    const paddingHorizontal = 32;
    const measuredWidth = maxWidth + paddingHorizontal;

    // Aplicar limites
    return Math.max(MIN_COLUMN_WIDTH, Math.min(MAX_COLUMN_WIDTH, measuredWidth));
  } catch (error) {
    console.warn('Erro na medição auto-fit:', error);
    return DEFAULT_COLUMN_WIDTHS[column];
  }
}

export default TableLayoutProvider;