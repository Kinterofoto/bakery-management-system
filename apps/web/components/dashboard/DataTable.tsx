/**
 * Data Table Component
 * Responsive table with Liquid Glass styling
 *
 * Features:
 * - Responsive design (horizontal scroll on mobile)
 * - Glass effect styling
 * - Accessible table structure
 * - Sortable columns (structure provided)
 * - Pagination-ready
 *
 * Apple HIG: Clarity - clean data presentation
 */

import React, { ReactNode } from 'react';
import { glassStyles } from './glass-styles';

export interface ColumnDef<T> {
  header: string;
  accessor: keyof T;
  cell?: (value: any, row: T) => ReactNode;
  width?: string;
  sortable?: boolean;
}

export interface DataTableProps<T extends Record<string, any>> {
  data: T[];
  columns: ColumnDef<T>[];
  isLoading?: boolean;
  emptyMessage?: string;
  className?: string;
  rowClassName?: (row: T, index: number) => string;
  onRowClick?: (row: T) => void;
}

export const DataTable = React.forwardRef<
  HTMLDivElement,
  DataTableProps<any>
>(
  (
    {
      data,
      columns,
      isLoading = false,
      emptyMessage = 'No hay datos disponibles',
      className = '',
      rowClassName,
      onRowClick,
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={`
          ${glassStyles.table.container}
          ${className}
        `}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            {/* Table Header */}
            <thead>
              <tr className={glassStyles.table.header}>
                {columns.map((column, index) => (
                  <th
                    key={index}
                    className={`
                      ${glassStyles.table.cell}
                      font-semibold
                      text-gray-900 dark:text-white
                      text-left
                      ${column.sortable ? 'cursor-pointer hover:bg-white/20 dark:hover:bg-white/10' : ''}
                      ${column.width || ''}
                    `}
                  >
                    <div className="flex items-center gap-2">
                      {column.header}
                      {column.sortable && (
                        <span className="text-gray-400 dark:text-gray-600 text-xs">
                          ⇅
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            {/* Table Body */}
            <tbody>
              {isLoading ? (
                // Loading skeleton
                Array.from({ length: 5 }).map((_, rowIndex) => (
                  <tr
                    key={rowIndex}
                    className={`
                      ${glassStyles.table.row}
                      opacity-50 animate-pulse
                    `}
                  >
                    {columns.map((_, colIndex) => (
                      <td
                        key={colIndex}
                        className={glassStyles.table.cell}
                      >
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : data.length === 0 ? (
                // Empty state
                <tr className={glassStyles.table.row}>
                  <td
                    colSpan={columns.length}
                    className={`
                      ${glassStyles.table.cell}
                      text-center
                      py-8
                      text-gray-500 dark:text-gray-400
                    `}
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                // Data rows
                data.map((row, rowIndex) => (
                  <tr
                    key={rowIndex}
                    className={`
                      ${glassStyles.table.row}
                      ${rowClassName ? rowClassName(row, rowIndex) : ''}
                      ${onRowClick ? 'cursor-pointer' : ''}
                    `}
                    onClick={() => onRowClick?.(row)}
                  >
                    {columns.map((column, colIndex) => {
                      const value = row[column.accessor];
                      const cellContent = column.cell
                        ? column.cell(value, row)
                        : value;

                      return (
                        <td
                          key={colIndex}
                          className={`
                            ${glassStyles.table.cell}
                            text-gray-900 dark:text-gray-100
                            ${column.width || ''}
                          `}
                        >
                          {cellContent}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }
);

DataTable.displayName = 'DataTable';

export default DataTable;
