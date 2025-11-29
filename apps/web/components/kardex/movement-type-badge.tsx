import { cn } from '@/lib/utils'
import { MovementType, movementTypeConfig } from '@/hooks/use-kardex'

interface MovementTypeBadgeProps {
  type: MovementType
  showIcon?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const colorClasses = {
  green: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  red: 'bg-red-500/20 text-red-300 border-red-500/30',
  blue: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  yellow: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  purple: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  gray: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
}

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm',
  lg: 'px-4 py-1.5 text-base',
}

export function MovementTypeBadge({ type, showIcon = true, size = 'md' }: MovementTypeBadgeProps) {
  const config = movementTypeConfig[type]
  if (!config) return null

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-medium',
        'backdrop-blur-sm',
        colorClasses[config.color],
        sizeClasses[size]
      )}
    >
      {showIcon && <span className="text-xs">{config.icon}</span>}
      <span>{config.label}</span>
    </span>
  )
}
