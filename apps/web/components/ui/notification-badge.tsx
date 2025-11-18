'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

export interface NotificationBadgeProps {
  type?: 'info' | 'success' | 'warning' | 'error';
  count?: number;
  label?: string;
  onClick?: () => void;
  className?: string;
}

export function NotificationBadge({
  type = 'info',
  count,
  label,
  onClick,
  className,
}: NotificationBadgeProps) {
  const getColors = () => {
    switch (type) {
      case 'success':
        return 'bg-green-500/20 border-green-500/30 text-green-700 dark:text-green-400';
      case 'warning':
        return 'bg-yellow-500/20 border-yellow-500/30 text-yellow-700 dark:text-yellow-400';
      case 'error':
        return 'bg-red-500/20 border-red-500/30 text-red-700 dark:text-red-400';
      case 'info':
      default:
        return 'bg-blue-500/20 border-blue-500/30 text-blue-700 dark:text-blue-400';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'warning':
      case 'error':
        return <AlertCircle className="w-4 h-4" />;
      case 'info':
      default:
        return <Info className="w-4 h-4" />;
    }
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-2 px-3 py-2 rounded-lg border',
        'backdrop-blur-sm transition-all duration-200',
        'hover:shadow-md hover:scale-105',
        onClick && 'cursor-pointer',
        getColors(),
        className
      )}
    >
      {getIcon()}
      {label && <span className="text-xs font-medium">{label}</span>}
      {count !== undefined && (
        <span className="text-xs font-bold ml-1">({count})</span>
      )}
    </div>
  );
}
