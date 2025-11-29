import { cn } from '@/lib/utils'

export type GlassVariant = 'ultra-thin' | 'thin' | 'medium' | 'thick'

interface GlassCardProps {
  children: React.ReactNode
  variant?: GlassVariant
  className?: string
  padding?: 'none' | 'sm' | 'md' | 'lg'
  hover?: boolean
}

const variantClasses: Record<GlassVariant, string> = {
  'ultra-thin': 'bg-white/[0.03] backdrop-blur-md border-white/[0.05]',
  'thin': 'bg-white/[0.05] backdrop-blur-xl border-white/[0.08]',
  'medium': 'bg-white/[0.08] backdrop-blur-2xl border-white/[0.12]',
  'thick': 'bg-white/[0.12] backdrop-blur-3xl border-white/[0.15]',
}

const paddingClasses = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
}

export function GlassCard({
  children,
  variant = 'thin',
  className,
  padding = 'md',
  hover = false,
}: GlassCardProps) {
  return (
    <div
      className={cn(
        // Base styles
        'rounded-xl border',
        // Glass effect variant
        variantClasses[variant],
        // Padding
        paddingClasses[padding],
        // Shadow
        'shadow-lg shadow-black/10',
        // Hover effect
        hover && 'transition-all duration-200 hover:bg-white/[0.1] hover:border-white/[0.2]',
        // Custom classes
        className
      )}
    >
      {children}
    </div>
  )
}
