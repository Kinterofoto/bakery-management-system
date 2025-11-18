'use client';

import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export interface GanttBarProps {
  id: string;
  label: string;
  startDate: Date;
  endDate: Date;
  progressPercentage: number;
  colorCode: string;
  isDragging?: boolean;
  isSelected?: boolean;
  status?: 'planned' | 'in_progress' | 'completed' | 'delayed';
  onClick?: (id: string) => void;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd?: (e: React.DragEvent<HTMLDivElement>) => void;
  quantity?: number;
  plannedQty?: number;
  producedQty?: number;
  daysDelayed?: number;
}

export function GanttBar({
  id,
  label,
  startDate,
  endDate,
  progressPercentage,
  colorCode,
  isDragging = false,
  isSelected = false,
  status = 'planned',
  onClick,
  onDragStart,
  onDragEnd,
  quantity,
  plannedQty,
  producedQty,
  daysDelayed,
}: GanttBarProps) {
  const durationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const isDelayed = daysDelayed && daysDelayed > 0;

  // Get color values based on status
  const getColorClasses = () => {
    if (status === 'planned') {
      return 'bg-opacity-30 backdrop-blur-md';
    } else if (status === 'in_progress' || status === 'completed') {
      return 'bg-opacity-60 backdrop-blur-lg';
    }
    return 'bg-opacity-40';
  };

  // Determine background color based on colorCode
  const getBackgroundColor = () => {
    const colorMap: Record<string, string> = {
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      purple: 'bg-purple-500',
      orange: 'bg-orange-500',
      pink: 'bg-pink-500',
      red: 'bg-red-500',
      indigo: 'bg-indigo-500',
      cyan: 'bg-cyan-500',
    };
    return colorMap[colorCode] || 'bg-blue-500';
  };

  const tooltipText = `
    ${label}
    Fechas: ${startDate.toLocaleDateString('es-ES')} - ${endDate.toLocaleDateString('es-ES')}
    ${durationDays} días
    ${plannedQty !== undefined && producedQty !== undefined ? `Planificado: ${plannedQty} | Producido: ${producedQty}` : ''}
    Progreso: ${progressPercentage}%
    ${isDelayed ? `Retrasado: ${daysDelayed} días` : ''}
  `.trim();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            draggable
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onClick={() => onClick?.(id)}
            className={cn(
              'relative h-12 rounded-lg transition-all duration-200 cursor-move group',
              'border border-white/20 dark:border-white/10',
              getBackgroundColor(),
              getColorClasses(),
              isDragging && 'opacity-50 scale-105 shadow-xl',
              isSelected && 'ring-2 ring-white ring-offset-2 ring-offset-gray-900 shadow-lg',
              'hover:shadow-lg hover:scale-102',
              isDelayed && 'animate-pulse'
            )}
          >
            {/* Progress indicator overlay */}
            {progressPercentage > 0 && (
              <div
                className={cn(
                  'absolute inset-0 rounded-lg bg-gradient-to-r',
                  getBackgroundColor(),
                  'bg-opacity-80 transition-all duration-300'
                )}
                style={{ width: `${progressPercentage}%` }}
              />
            )}

            {/* Delay indicator */}
            {isDelayed && (
              <div className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-xs text-white font-bold">!</span>
              </div>
            )}

            {/* Content */}
            <div className="relative h-full px-3 py-2 flex items-center justify-between z-10">
              <span className="text-xs font-semibold text-white truncate flex-1">
                {label}
              </span>
              {quantity !== undefined && (
                <span className="text-xs text-white/80 ml-2 whitespace-nowrap">
                  {quantity}
                </span>
              )}
            </div>

            {/* Status indicator dot */}
            <div
              className={cn(
                'absolute right-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full',
                status === 'completed' && 'bg-green-400',
                status === 'in_progress' && 'bg-yellow-400 animate-pulse',
                status === 'delayed' && 'bg-red-400 animate-pulse',
                status === 'planned' && 'bg-gray-400'
              )}
            />
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs bg-black/80 text-white text-xs whitespace-pre-wrap">
          {tooltipText}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
