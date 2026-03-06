"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface MaterialCost {
  id: string;
  material_name: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  total_cost: number;
}

interface CostBreakdownTableProps {
  materials: MaterialCost[];
  laborCost: number;
  totalUnits: number;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function CostBreakdownTable({
  materials,
  laborCost,
  totalUnits,
}: CostBreakdownTableProps) {
  const materialsTotalCost = materials.reduce(
    (sum, m) => sum + m.total_cost,
    0
  );
  const grandTotal = materialsTotalCost + laborCost;
  const costPerUnit = totalUnits > 0 ? grandTotal / totalUnits : 0;

  return (
    <div className="space-y-4">
      {/* Cost per unit - prominent */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className={cn(
          "bg-gradient-to-br from-blue-500/10 to-purple-500/10",
          "dark:from-blue-500/5 dark:to-purple-500/5",
          "backdrop-blur-xl",
          "border border-blue-500/20 dark:border-blue-500/15",
          "rounded-2xl p-5",
          "text-center"
        )}
      >
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
          Costo por unidad
        </p>
        <p className="text-3xl font-bold text-gray-900 dark:text-white">
          {formatCurrency(costPerUnit)}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          {totalUnits} unidades | Total: {formatCurrency(grandTotal)}
        </p>
      </motion.div>

      {/* Materiales section */}
      <div
        className={cn(
          "bg-white/70 dark:bg-black/50",
          "backdrop-blur-xl",
          "border border-white/20 dark:border-white/10",
          "rounded-2xl",
          "overflow-hidden",
          "shadow-sm shadow-black/5"
        )}
      >
        <div className="px-4 py-3 bg-gray-50/50 dark:bg-white/5 border-b border-gray-200/30 dark:border-white/10">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Materiales
          </h3>
        </div>

        {/* Desktop: table */}
        <div className="hidden md:block">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200/30 dark:border-white/10">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Material
                </th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Cantidad
                </th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Costo Unit.
                </th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200/20 dark:divide-white/5">
              {materials.map((m) => (
                <tr
                  key={m.id}
                  className="hover:bg-white/30 dark:hover:bg-white/5 transition-colors duration-150"
                >
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                    {m.material_name}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-300">
                    {m.quantity} {m.unit}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-300">
                    {formatCurrency(m.unit_cost)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(m.total_cost)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile: stacked cards */}
        <div className="md:hidden divide-y divide-gray-200/20 dark:divide-white/5">
          {materials.map((m) => (
            <div key={m.id} className="px-4 py-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {m.material_name}
                </span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(m.total_cost)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
                <span>
                  {m.quantity} {m.unit}
                </span>
                <span>@ {formatCurrency(m.unit_cost)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Materials subtotal */}
        <div className="px-4 py-3 bg-gray-50/50 dark:bg-white/5 border-t border-gray-200/30 dark:border-white/10 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">
            Subtotal Materiales
          </span>
          <span className="text-sm font-bold text-gray-900 dark:text-white">
            {formatCurrency(materialsTotalCost)}
          </span>
        </div>
      </div>

      {/* Mano de Obra section */}
      <div
        className={cn(
          "bg-white/70 dark:bg-black/50",
          "backdrop-blur-xl",
          "border border-white/20 dark:border-white/10",
          "rounded-2xl",
          "overflow-hidden",
          "shadow-sm shadow-black/5"
        )}
      >
        <div className="px-4 py-3 bg-gray-50/50 dark:bg-white/5 border-b border-gray-200/30 dark:border-white/10">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Mano de Obra
          </h3>
        </div>
        <div className="px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-300">
            Costo de mano de obra
          </span>
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            {formatCurrency(laborCost)}
          </span>
        </div>
      </div>

      {/* Grand total */}
      <div
        className={cn(
          "bg-gray-900 dark:bg-white",
          "rounded-2xl p-4",
          "flex items-center justify-between"
        )}
      >
        <span className="text-sm font-bold text-white dark:text-gray-900">
          TOTAL
        </span>
        <span className="text-lg font-bold text-white dark:text-gray-900">
          {formatCurrency(grandTotal)}
        </span>
      </div>
    </div>
  );
}
