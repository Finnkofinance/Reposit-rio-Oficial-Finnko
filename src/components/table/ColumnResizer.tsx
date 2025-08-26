import React, { useCallback, useRef, useState } from 'react';
import { ColumnKey, MIN_COLUMN_WIDTH, MAX_COLUMN_WIDTH } from '@/services/columnWidthService';
import { useTableLayout } from '@/context/tableLayout/useTableLayout';

interface ColumnResizerProps {
  column: ColumnKey;
  className?: string;
}

const ColumnResizer: React.FC<ColumnResizerProps> = ({ column, className = '' }) => {
  const { widths, setWidth, autoFit } = useTableLayout();
  const [isResizing, setIsResizing] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const startPosRef = useRef({ x: 0, width: 0 });
  const resizerRef = useRef<HTMLDivElement>(null);

  // Clamp width dentro dos limites
  const clampWidth = useCallback((width: number): number => {
    return Math.max(MIN_COLUMN_WIDTH, Math.min(MAX_COLUMN_WIDTH, width));
  }, []);

  // Início do arrasto (mouse/touch)
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const currentWidth = widths[column];
    startPosRef.current = {
      x: e.clientX,
      width: currentWidth,
    };
    
    setIsResizing(true);
    setShowTooltip(true);
    
    // Capturar eventos de pointer
    if (resizerRef.current) {
      resizerRef.current.setPointerCapture(e.pointerId);
    }
  }, [column, widths]);

  // Durante o arrasto
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isResizing) return;
    
    e.preventDefault();
    
    const deltaX = e.clientX - startPosRef.current.x;
    const newWidth = clampWidth(startPosRef.current.width + deltaX);
    
    setWidth(column, newWidth);
  }, [isResizing, column, setWidth, clampWidth]);

  // Fim do arrasto
  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!isResizing) return;
    
    e.preventDefault();
    setIsResizing(false);
    setShowTooltip(false);
    
    // Liberar captura
    if (resizerRef.current) {
      resizerRef.current.releasePointerCapture(e.pointerId);
    }
  }, [isResizing]);

  // Double-click para auto-fit
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    autoFit(column);
  }, [column, autoFit]);

  // Navegação por teclado
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const currentWidth = widths[column];
    const step = e.shiftKey ? 24 : 8; // Shift = passo maior
    const delta = e.key === 'ArrowLeft' ? -step : step;
    const newWidth = clampWidth(currentWidth + delta);
    
    setWidth(column, newWidth);
  }, [column, widths, setWidth, clampWidth]);

  // Accessibility labels
  const getColumnLabel = (col: ColumnKey): string => {
    const labels: Record<ColumnKey, string> = {
      date: 'Data',
      income: 'Entradas',
      expense: 'Saídas',
      invest: 'Investimentos',
      balance: 'Saldo',
    };
    return labels[col];
  };

  return (
    <div
      ref={resizerRef}
      className={`
        absolute top-0 -right-0.5 h-full w-1 bg-gray-400 dark:bg-gray-500 cursor-col-resize 
        hover:bg-blue-500 dark:hover:bg-blue-400 active:bg-blue-600 transition-all duration-150
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset
        ${isResizing ? 'bg-blue-600 w-1.5' : 'hover:w-1.5'}
        ${className}
      `}
      tabIndex={0}
      role="separator"
      aria-orientation="vertical"
      aria-label={`Redimensionar coluna ${getColumnLabel(column)}`}
      aria-valuenow={widths[column]}
      aria-valuemin={MIN_COLUMN_WIDTH}
      aria-valuemax={MAX_COLUMN_WIDTH}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKeyDown}
      style={{ 
        touchAction: 'none', // Evita scroll durante resize no mobile
        zIndex: isResizing ? 30 : 25,
      }}
    >
      {/* Tooltip mostrando largura atual durante resize */}
      {showTooltip && (
        <div 
          className="
            absolute top-1/2 left-full transform -translate-y-1/2 ml-3
            bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900
            px-2 py-1 rounded text-xs font-mono whitespace-nowrap
            pointer-events-none shadow-lg z-50
          "
        >
          {widths[column]}px
        </div>
      )}
      
      {/* Área de hit mais generosa para touch e mouse */}
      <div 
        className="absolute top-0 -right-2 w-4 h-full"
        aria-hidden="true"
        style={{ cursor: 'col-resize' }}
      />
    </div>
  );
};

export default ColumnResizer;