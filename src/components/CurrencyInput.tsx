
import React, { useState, useEffect } from 'react';

interface CurrencyInputProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  required?: boolean;
  disabled?: boolean;
}

const CurrencyInput: React.FC<CurrencyInputProps> = ({ value, onValueChange, ...props }) => {
  const [displayValue, setDisplayValue] = useState('');

  // Format the number to BRL currency string
  const format = (numStr: string) => {
    if (!numStr) return '';
    const number = parseFloat(numStr.replace(/[^0-9]/g, '')) / 100;
    if (isNaN(number)) return '';
    return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(number);
  };

  // When the external value changes, update the display value
  useEffect(() => {
    setDisplayValue(format(value));
  }, [value]);

  // Handle user input
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputVal = e.target.value;
    const numericValue = inputVal.replace(/[^0-9]/g, '');
    
    // Update the internal display value
    setDisplayValue(format(numericValue));
    
    // Pass the raw numeric string (e.g., "12345" for 123.45) to the parent
    onValueChange(numericValue);
  };
  
  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (e.target.value === '0,00') {
      setDisplayValue('');
      onValueChange('');
    }
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      {...props}
    />
  );
};

export default CurrencyInput;
