"use client"

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SearchableSelectOption {
  value: string;
  label: string;
  subLabel?: string;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = "Seleccionar...",
  icon,
  className = "",
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get selected option object
  const selectedOption = useMemo(() =>
    options.find(opt => opt.value === value),
    [options, value]
  );

  // Sync search term with selected value label only when closing or initial load
  useEffect(() => {
    if (selectedOption && !isOpen) {
      setSearchTerm(selectedOption.label);
    } else if (!selectedOption && !isOpen) {
      setSearchTerm("");
    }
  }, [selectedOption, isOpen]);

  // Filter options based on search
  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    const lowerSearch = searchTerm.toLowerCase();
    return options.filter(opt =>
      opt.label.toLowerCase().includes(lowerSearch) ||
      (opt.subLabel && opt.subLabel.toLowerCase().includes(lowerSearch))
    );
  }, [options, searchTerm]);

  // Handle click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // Reset search term to selected value on close without selection
        if (selectedOption) {
          setSearchTerm(selectedOption.label);
        } else {
          setSearchTerm("");
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectedOption]);

  const handleSelect = (option: SearchableSelectOption) => {
    onChange(option.value);
    setSearchTerm(option.label);
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    if (!isOpen) setIsOpen(true);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
    // Clear search term to show all options when opening
    setSearchTerm("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSearchTerm("");
    onChange("");
    inputRef.current?.focus();
  };

  return (
    <div ref={wrapperRef} className={cn("relative", className)}>
      <div className="relative group">
        <input
          ref={inputRef}
          type="text"
          disabled={disabled}
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          className={cn(
            "w-full pr-10 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-900",
            "placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
            "transition-all shadow-sm truncate",
            icon ? "pl-10" : "pl-3",
            disabled ? "bg-gray-100 text-gray-500 cursor-not-allowed" : "cursor-text"
          )}
        />

        {/* Left Icon */}
        {icon && (
          <div className="absolute left-3 top-2.5 text-gray-400 pointer-events-none group-focus-within:text-primary transition-colors">
            {icon}
          </div>
        )}

        {/* Right Actions */}
        <div className="absolute right-3 top-2.5 flex items-center gap-1">
          {searchTerm && !disabled && (
            <button
              onClick={handleClear}
              className="text-gray-300 hover:text-gray-500 transition-colors"
              type="button"
            >
              <X size={14} />
            </button>
          )}
          <ChevronDown
            size={16}
            className={cn(
              "text-gray-400 transition-transform duration-200",
              isOpen && "rotate-180"
            )}
          />
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1.5 bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto overflow-x-hidden animate-in fade-in-0 zoom-in-95 duration-100">
          {filteredOptions.length > 0 ? (
            <ul className="py-1">
              {filteredOptions.map((option) => (
                <li
                  key={option.value}
                  onClick={() => handleSelect(option)}
                  className={cn(
                    "px-4 py-2.5 text-sm cursor-pointer hover:bg-primary/5 transition-colors flex items-center justify-between group",
                    option.value === value ? "bg-primary/5 text-primary" : "text-gray-700"
                  )}
                >
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium group-hover:text-primary transition-colors truncate">
                      {option.label}
                    </span>
                    {option.subLabel && (
                      <span className="text-[11px] text-gray-400 group-hover:text-primary/60 truncate">
                        {option.subLabel}
                      </span>
                    )}
                  </div>
                  {option.value === value && <Check size={14} className="text-primary flex-shrink-0 ml-2" />}
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-6 text-center text-sm text-gray-500 flex flex-col items-center gap-2">
              <Search size={16} className="text-gray-300" />
              <span>No se encontraron resultados</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
