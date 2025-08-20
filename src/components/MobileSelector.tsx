import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Plus } from 'lucide-react';

interface Option {
  value: string;
  label: React.ReactNode;
}

interface MobileSelectorProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  allLabel: React.ReactNode;
  allValue?: string;
  onAddNew?: () => void;
  addNewLabel?: string;
}

const MobileSelector: React.FC<MobileSelectorProps> = ({ options, value, onChange, allLabel, allValue = 'all', onAddNew, addNewLabel }) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value);
  const displayLabel = selectedOption ? selectedOption.label : allLabel;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);
  
  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue);
    setIsOpen(false);
  };

  const handleAddNew = () => {
    if(onAddNew) {
        onAddNew();
    }
    setIsOpen(false);
  }

  return (
    <div className="relative md:hidden" ref={wrapperRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center bg-white dark:bg-gray-700/80 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-semibold py-3 px-4 rounded-lg shadow-md transition-colors"
      >
        <div className="text-left">{displayLabel}</div>
        <ChevronDown size={20} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''} flex-shrink-0 ml-2`} />
      </button>

      {isOpen && (
        <div className="absolute z-10 top-full mt-2 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl overflow-hidden animate-fade-in-down">
          <ul className="max-h-60 overflow-y-auto">
            <li>
              <button
                onClick={() => handleSelect(allValue)}
                className="w-full text-left px-4 py-3 text-gray-900 dark:text-white font-bold bg-gray-100 dark:bg-gray-900/50 hover:bg-gradient-to-r hover:from-[rgba(25,207,103,0.1)] hover:to-[rgba(0,222,95,0.1)] dark:hover:bg-gradient-to-r dark:hover:from-[rgba(25,207,103,0.2)] dark:hover:to-[rgba(0,222,95,0.2)] transition-colors"
              >
                {allLabel}
              </button>
            </li>
            {options.map(option => (
              <li key={option.value}>
                <button
                  onClick={() => handleSelect(option.value)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${value === option.value ? 'bg-gray-100 dark:bg-gray-700/50' : 'text-gray-800 dark:text-gray-200'}`}
                >
                  {option.label}
                </button>
              </li>
            ))}
            {onAddNew && addNewLabel && (
              <li className="border-t border-gray-200 dark:border-gray-700/50">
                <button
                  onClick={handleAddNew}
                  className="w-full text-left px-4 py-3 text-transparent bg-clip-text bg-gradient-to-r from-[#19CF67] to-[#00DE5F] hover:bg-gradient-to-r hover:from-[rgba(25,207,103,0.1)] hover:to-[rgba(0,222,95,0.1)] dark:hover:bg-gradient-to-r dark:hover:from-[rgba(25,207,103,0.2)] dark:hover:to-[rgba(0,222,95,0.2)] transition-colors flex items-center space-x-3 font-semibold"
                >
                  <Plus size={18} />
                  <span>{addNewLabel}</span>
                </button>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default MobileSelector;