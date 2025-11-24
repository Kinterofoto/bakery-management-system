/**
 * Filter Panel Component
 * Advanced filtering system with Liquid Glass design
 *
 * Features:
 * - Multi-select dropdowns with glass effect
 * - Date range selector with presets
 * - Dynamic filters based on selections
 * - Responsive grid layout
 *
 * Apple HIG: Deference - supports data view without competing
 */

'use client';

import React, { useState } from 'react';
import { glassStyles } from './glass-styles';
import { ChevronDown } from 'lucide-react';

export interface FilterPanelProps {
  onFilterChange?: (filters: FilterValues) => void;
  showBranchFilter?: boolean;
  className?: string;
}

export interface FilterValues {
  customers: string[];
  products: string[];
  dateRange: {
    startDate?: string;
    endDate?: string;
    preset?: 'today' | 'week' | 'month' | 'custom';
  };
  sellers: string[];
  statuses: string[];
  branch?: string;
}

interface FilterRowProps {
  children: React.ReactNode;
  className?: string;
}

const FilterRow: React.FC<FilterRowProps> = ({ children, className = '' }) => (
  <div className={`
    grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
    gap-4 sm:gap-6
    ${className}
  `}>
    {children}
  </div>
);

interface FilterGroupProps {
  label: string;
  children: React.ReactNode;
  className?: string;
}

const FilterGroup: React.FC<FilterGroupProps> = ({ label, children, className = '' }) => (
  <div className={`flex flex-col gap-2 ${className}`}>
    <label className={`
      ${glassStyles.typography.headline}
      text-gray-900 dark:text-white
      font-medium
    `}>
      {label}
    </label>
    {children}
  </div>
);

export const FilterPanel: React.FC<FilterPanelProps> = ({
  onFilterChange,
  showBranchFilter = false,
  className = '',
}) => {
  const [filters, setFilters] = useState<FilterValues>({
    customers: [],
    products: [],
    dateRange: { preset: 'month' },
    sellers: [],
    statuses: [],
  });

  const handleFilterChange = (key: keyof FilterValues, value: any) => {
    const updatedFilters = { ...filters, [key]: value };
    setFilters(updatedFilters);
    onFilterChange?.(updatedFilters);
  };

  const handleApplyFilters = () => {
    onFilterChange?.(filters);
  };

  const handleClearFilters = () => {
    const clearedFilters: FilterValues = {
      customers: [],
      products: [],
      dateRange: { preset: 'month' },
      sellers: [],
      statuses: [],
    };
    setFilters(clearedFilters);
    onFilterChange?.(clearedFilters);
  };

  // Mock data - replace with actual data
  const customerOptions = [
    'Panadería A',
    'Panadería B',
    'Panadería C',
    'Panadería D',
  ];

  const productOptions = [
    'Pan Blanco',
    'Pan Integral',
    'Croissants',
    'Donuts',
    'Bollos',
  ];

  const sellerOptions = [
    'Juan García',
    'María López',
    'Carlos Rodríguez',
    'Ana Martínez',
  ];

  const statusOptions = [
    'Completado',
    'Pendiente',
    'Cancelado',
    'En Tránsito',
  ];

  return (
    <div className={`
      ${glassStyles.containers.filterPanel}
      ${className}
      space-y-6
    `}>
      {/* Filter Row 1: Clientes, Productos, Fechas */}
      <FilterRow>
        <FilterGroup label="Clientes">
          <select
            multiple
            value={filters.customers}
            onChange={(e) => {
              const selected = Array.from(e.target.selectedOptions, (opt) => opt.value);
              handleFilterChange('customers', selected);
            }}
            className={glassStyles.inputs.select}
          >
            {customerOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <p className={`${glassStyles.typography.caption} text-xs`}>
            {filters.customers.length > 0
              ? `${filters.customers.length} seleccionado(s)`
              : 'Seleccionar clientes'}
          </p>
        </FilterGroup>

        <FilterGroup label="Productos">
          <select
            multiple
            value={filters.products}
            onChange={(e) => {
              const selected = Array.from(e.target.selectedOptions, (opt) => opt.value);
              handleFilterChange('products', selected);
            }}
            className={glassStyles.inputs.select}
          >
            {productOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <p className={`${glassStyles.typography.caption} text-xs`}>
            {filters.products.length > 0
              ? `${filters.products.length} seleccionado(s)`
              : 'Seleccionar productos'}
          </p>
        </FilterGroup>

        <FilterGroup label="Fechas">
          <select
            value={filters.dateRange.preset || 'custom'}
            onChange={(e) =>
              handleFilterChange('dateRange', {
                ...filters.dateRange,
                preset: e.target.value as FilterValues['dateRange']['preset'],
              })
            }
            className={glassStyles.inputs.select}
          >
            <option value="today">Hoy</option>
            <option value="week">Última Semana</option>
            <option value="month">Último Mes</option>
            <option value="custom">Personalizado</option>
          </select>

          {filters.dateRange.preset === 'custom' && (
            <div className="grid grid-cols-2 gap-3 mt-2">
              <input
                type="date"
                value={filters.dateRange.startDate || ''}
                onChange={(e) =>
                  handleFilterChange('dateRange', {
                    ...filters.dateRange,
                    startDate: e.target.value,
                  })
                }
                className={glassStyles.inputs.standard}
                placeholder="Fecha inicial"
              />
              <input
                type="date"
                value={filters.dateRange.endDate || ''}
                onChange={(e) =>
                  handleFilterChange('dateRange', {
                    ...filters.dateRange,
                    endDate: e.target.value,
                  })
                }
                className={glassStyles.inputs.standard}
                placeholder="Fecha final"
              />
            </div>
          )}
        </FilterGroup>
      </FilterRow>

      {/* Filter Row 2: Vendedor, Estado, (Sucursal si aplica) */}
      <FilterRow>
        <FilterGroup label="Vendedor Asignado">
          <select
            multiple
            value={filters.sellers}
            onChange={(e) => {
              const selected = Array.from(e.target.selectedOptions, (opt) => opt.value);
              handleFilterChange('sellers', selected);
            }}
            className={glassStyles.inputs.select}
          >
            {sellerOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <p className={`${glassStyles.typography.caption} text-xs`}>
            {filters.sellers.length > 0
              ? `${filters.sellers.length} seleccionado(s)`
              : 'Seleccionar vendedores'}
          </p>
        </FilterGroup>

        <FilterGroup label="Estado">
          <select
            multiple
            value={filters.statuses}
            onChange={(e) => {
              const selected = Array.from(e.target.selectedOptions, (opt) => opt.value);
              handleFilterChange('statuses', selected);
            }}
            className={glassStyles.inputs.select}
          >
            {statusOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <p className={`${glassStyles.typography.caption} text-xs`}>
            {filters.statuses.length > 0
              ? `${filters.statuses.length} seleccionado(s)`
              : 'Seleccionar estados'}
          </p>
        </FilterGroup>

        {showBranchFilter && (
          <FilterGroup label="Sucursal">
            <select
              value={filters.branch || ''}
              onChange={(e) => handleFilterChange('branch', e.target.value)}
              className={glassStyles.inputs.select}
            >
              <option value="">Todas las sucursales</option>
              <option value="matriz">Matriz</option>
              <option value="sucursal1">Sucursal 1</option>
              <option value="sucursal2">Sucursal 2</option>
            </select>
          </FilterGroup>
        )}
      </FilterRow>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-white/20 dark:border-white/10">
        <button
          onClick={handleClearFilters}
          className={`${glassStyles.buttons.secondary} text-sm`}
        >
          Limpiar Filtros
        </button>

        <button
          onClick={handleApplyFilters}
          className={`${glassStyles.buttons.primary} text-sm`}
        >
          Aplicar Filtros
        </button>
      </div>
    </div>
  );
};

export default FilterPanel;
