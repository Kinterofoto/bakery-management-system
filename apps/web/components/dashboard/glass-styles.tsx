/**
 * Liquid Glass Design System - Reusable Tailwind Classes
 * Apple Human Interface Guidelines compliant
 *
 * Provides consistent glass material opacity, blur, borders, and shadows
 * across all dashboard components.
 */

export const glassStyles = {
  // Material Thickness Levels
  materials: {
    ultraThin: `
      bg-white/50 dark:bg-black/30
      backdrop-blur-lg
      border border-white/15 dark:border-white/10
      shadow-sm shadow-black/5
    `,

    standard: `
      bg-white/70 dark:bg-black/50
      backdrop-blur-2xl
      border border-white/20 dark:border-white/10
      shadow-md shadow-black/5
    `,

    thick: `
      bg-white/85 dark:bg-black/60
      backdrop-blur-3xl
      border border-white/30 dark:border-white/15
      shadow-lg shadow-black/10
    `,
  },

  // Colored Glass Variants (for emphasis)
  coloredGlass: {
    blue: `
      bg-blue-500/10 dark:bg-blue-500/5
      backdrop-blur-xl
      border border-blue-500/20 dark:border-blue-500/15
    `,

    green: `
      bg-green-500/10 dark:bg-green-500/5
      backdrop-blur-xl
      border border-green-500/20 dark:border-green-500/15
    `,

    red: `
      bg-red-500/10 dark:bg-red-500/5
      backdrop-blur-xl
      border border-red-500/20 dark:border-red-500/15
    `,

    orange: `
      bg-orange-500/10 dark:bg-orange-500/5
      backdrop-blur-xl
      border border-orange-500/20 dark:border-orange-500/15
    `,
  },

  // Container Styles
  containers: {
    filterPanel: `
      bg-white/70 dark:bg-black/50
      backdrop-blur-2xl
      border border-white/20 dark:border-white/10
      rounded-2xl
      shadow-lg shadow-black/5
      p-6
    `,

    metricCard: `
      bg-gradient-to-br from-white/80 to-white/60
      dark:from-black/60 dark:to-black/40
      backdrop-blur-xl
      border border-white/25 dark:border-white/15
      rounded-2xl
      shadow-md shadow-black/5
      p-6
      hover:shadow-lg hover:shadow-black/10
      hover:border-white/35 dark:hover:border-white/25
      transition-all duration-200 ease-out
    `,

    card: `
      bg-white/70 dark:bg-black/50
      backdrop-blur-2xl
      border border-white/20 dark:border-white/10
      rounded-2xl
      shadow-lg shadow-black/5
      p-6
    `,

    modal: `
      bg-white/90 dark:bg-black/80
      backdrop-blur-2xl
      border border-white/30 dark:border-white/15
      rounded-3xl
      shadow-2xl shadow-black/20
      p-6
    `,

    backdrop: `
      fixed inset-0
      bg-black/30 dark:bg-black/50
      backdrop-blur-sm
    `,
  },

  // Input Styles
  inputs: {
    standard: `
      w-full
      bg-white/50 dark:bg-black/30
      backdrop-blur-md
      border border-gray-200/50 dark:border-white/10
      rounded-xl
      px-4 py-3
      text-sm font-medium
      placeholder:text-gray-400 dark:placeholder:text-gray-500
      focus:outline-none
      focus:ring-2 focus:ring-blue-500/50
      focus:border-blue-500/50
      hover:border-gray-300/70 dark:hover:border-white/20
      transition-all duration-200
      cursor-pointer
    `,

    select: `
      w-full
      bg-white/50 dark:bg-black/30
      backdrop-blur-md
      border border-gray-200/50 dark:border-white/10
      rounded-xl
      px-4 py-3
      pr-10
      text-sm font-medium
      text-gray-900 dark:text-white
      appearance-none
      focus:outline-none
      focus:ring-2 focus:ring-blue-500/50
      focus:border-blue-500/50
      hover:border-gray-300/70 dark:hover:border-white/20
      transition-all duration-200
      cursor-pointer
    `,

    textarea: `
      w-full
      bg-white/50 dark:bg-black/30
      backdrop-blur-md
      border border-gray-200/50 dark:border-white/10
      rounded-xl
      px-4 py-3
      text-sm font-medium
      placeholder:text-gray-400 dark:placeholder:text-gray-500
      focus:outline-none
      focus:ring-2 focus:ring-blue-500/50
      focus:border-blue-500/50
      hover:border-gray-300/70 dark:hover:border-white/20
      transition-all duration-200
      resize-none
    `,
  },

  // Button Styles
  buttons: {
    primary: `
      bg-blue-500
      text-white
      font-semibold
      px-6 py-3
      rounded-xl
      shadow-md shadow-blue-500/30
      hover:bg-blue-600
      hover:shadow-lg hover:shadow-blue-500/40
      active:scale-95
      active:shadow-md
      focus:outline-none
      focus:ring-2 focus:ring-blue-500/50
      focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-black
      transition-all duration-150
      disabled:opacity-50 disabled:cursor-not-allowed
    `,

    secondary: `
      bg-gray-100 dark:bg-white/10
      text-gray-900 dark:text-white
      font-semibold
      px-6 py-3
      rounded-xl
      hover:bg-gray-200 dark:hover:bg-white/20
      active:scale-95
      focus:outline-none
      focus:ring-2 focus:ring-gray-500/50
      focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-black
      transition-all duration-150
      disabled:opacity-50 disabled:cursor-not-allowed
    `,

    glass: `
      bg-white/20 dark:bg-black/20
      backdrop-blur-md
      border border-white/30 dark:border-white/20
      text-gray-900 dark:text-white
      font-semibold
      px-6 py-3
      rounded-xl
      hover:bg-white/30 dark:hover:bg-black/30
      hover:border-white/40 dark:hover:border-white/30
      active:scale-95
      focus:outline-none
      focus:ring-2 focus:ring-blue-500/50
      focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-black
      transition-all duration-150
      disabled:opacity-50 disabled:cursor-not-allowed
    `,

    icon: `
      min-w-11 min-h-11
      flex items-center justify-center
      text-gray-600 dark:text-gray-400
      hover:text-gray-900 dark:hover:text-white
      hover:bg-white/20 dark:hover:bg-white/10
      rounded-lg
      transition-all duration-200
      focus:outline-none
      focus:ring-2 focus:ring-blue-500/50
    `,
  },

  // Table Styles
  table: {
    container: `
      bg-white/60 dark:bg-black/40
      backdrop-blur-xl
      border border-white/20 dark:border-white/10
      rounded-2xl
      overflow-hidden
      shadow-md shadow-black/5
    `,

    header: `
      bg-gray-50/50 dark:bg-white/5
      backdrop-blur-sm
      border-b border-gray-200/30 dark:border-white/10
    `,

    row: `
      border-b border-gray-200/30 dark:border-white/10
      hover:bg-white/30 dark:hover:bg-white/5
      transition-colors duration-150
    `,

    cell: `
      px-6 py-4
      text-sm
      text-gray-900 dark:text-gray-100
    `,
  },

  // Tab Styles
  tabs: {
    trigger: `
      px-6 py-3
      text-base font-semibold
      text-gray-600 dark:text-gray-400
      border-b-2 border-transparent
      hover:text-gray-900 dark:hover:text-white
      hover:border-blue-500/30
      focus:outline-none
      focus:ring-2 focus:ring-blue-500/50
      focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-black
      transition-all duration-200 ease-out
      relative
    `,

    active: `
      text-gray-900 dark:text-white
      border-b-2 border-blue-500
      shadow-md shadow-blue-500/10
    `,
  },

  // Spacing System (8-point grid)
  spacing: {
    xs: 'space-y-1',      // 4px
    sm: 'space-y-2',      // 8px
    md: 'space-y-3',      // 12px
    base: 'space-y-4',    // 16px
    lg: 'space-y-6',      // 24px
    xl: 'space-y-8',      // 32px
    '2xl': 'space-y-12',  // 48px
    '3xl': 'space-y-16',  // 64px
  },

  gap: {
    xs: 'gap-1',          // 4px
    sm: 'gap-2',          // 8px
    md: 'gap-3',          // 12px
    base: 'gap-4',        // 16px
    lg: 'gap-6',          // 24px
    xl: 'gap-8',          // 32px
    '2xl': 'gap-12',      // 48px
    '3xl': 'gap-16',      // 64px
  },

  // Typography Styles
  typography: {
    display: 'text-4xl sm:text-5xl font-bold tracking-tight',
    title1: 'text-3xl font-semibold',
    title2: 'text-2xl font-semibold',
    headline: 'text-lg font-semibold',
    body: 'text-base font-normal',
    callout: 'text-sm font-normal',
    caption: 'text-xs font-medium tracking-wide text-gray-500 dark:text-gray-400',
    mono: 'font-mono text-sm font-medium',
  },

  // Utility Classes
  utility: {
    clearFix: 'clear-fix',
    truncate: 'truncate',
    lineClamp1: 'line-clamp-1',
    lineClamp2: 'line-clamp-2',
    lineClamp3: 'line-clamp-3',
  },
};

/**
 * Usage Examples:
 *
 * Filter Panel:
 * className={glassStyles.containers.filterPanel}
 *
 * Metric Card:
 * className={glassStyles.containers.metricCard}
 *
 * Input Field:
 * className={glassStyles.inputs.standard}
 *
 * Button:
 * className={glassStyles.buttons.primary}
 *
 * Tab Trigger:
 * className={`${glassStyles.tabs.trigger} ${isActive ? glassStyles.tabs.active : ''}`}
 *
 * Combination:
 * className={`${glassStyles.containers.card} ${glassStyles.spacing.base}`}
 */

// Export individual helper functions for common patterns
export const getMetricCardClass = (isHovered?: boolean) => {
  return `
    ${glassStyles.containers.metricCard}
    ${isHovered ? 'shadow-lg shadow-black/10' : ''}
  `;
};

export const getTabTriggerClass = (isActive: boolean) => {
  return `
    ${glassStyles.tabs.trigger}
    ${isActive ? glassStyles.tabs.active : ''}
  `;
};

export const getButtonClass = (variant: 'primary' | 'secondary' | 'glass' | 'icon' = 'primary') => {
  return glassStyles.buttons[variant];
};

export const getInputClass = (variant: 'standard' | 'select' | 'textarea' = 'standard') => {
  return glassStyles.inputs[variant];
};

export const getContainerClass = (type: 'filterPanel' | 'metricCard' | 'card' | 'modal' | 'backdrop' = 'card') => {
  return glassStyles.containers[type];
};

export const getMaterialClass = (thickness: 'ultraThin' | 'standard' | 'thick' = 'standard') => {
  return glassStyles.materials[thickness];
};

export const getColoredGlassClass = (color: 'blue' | 'green' | 'red' | 'orange' = 'blue') => {
  return glassStyles.coloredGlass[color];
};
