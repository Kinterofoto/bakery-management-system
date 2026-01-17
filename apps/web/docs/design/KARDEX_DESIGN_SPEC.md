# Kardex Module Design Specification
## DarkMouth Theme with Liquid Glass Effects

---

## 1. Color Palette - DarkMouth Theme

### Base Colors
```typescript
const darkMouthPalette = {
  // Backgrounds
  bg: {
    primary: '#0a0a0a',      // Deep black base
    secondary: '#1a1a1a',    // Elevated surfaces
    tertiary: '#242424',     // Cards, containers
    elevated: '#2d2d2d',     // Hover states
  },

  // Glass Effects
  glass: {
    ultraThin: 'rgba(255, 255, 255, 0.03)',
    thin: 'rgba(255, 255, 255, 0.05)',
    medium: 'rgba(255, 255, 255, 0.08)',
    thick: 'rgba(255, 255, 255, 0.12)',
  },

  // Borders
  border: {
    subtle: 'rgba(255, 255, 255, 0.06)',
    default: 'rgba(255, 255, 255, 0.1)',
    strong: 'rgba(255, 255, 255, 0.15)',
  },

  // Text
  text: {
    primary: '#ffffff',
    secondary: 'rgba(255, 255, 255, 0.7)',
    tertiary: 'rgba(255, 255, 255, 0.5)',
    disabled: 'rgba(255, 255, 255, 0.3)',
  },

  // Accent Colors
  accent: {
    blue: {
      primary: '#3b82f6',    // Blue 500
      light: '#60a5fa',      // Blue 400
      dark: '#2563eb',       // Blue 600
      glass: 'rgba(59, 130, 246, 0.15)',
    },
    purple: {
      primary: '#8b5cf6',    // Violet 500
      light: '#a78bfa',      // Violet 400
      dark: '#7c3aed',       // Violet 600
      glass: 'rgba(139, 92, 246, 0.15)',
    },
  },

  // Semantic Colors (Movement Types)
  semantic: {
    reception: {
      bg: 'rgba(34, 197, 94, 0.15)',   // Green glass
      border: 'rgba(34, 197, 94, 0.3)',
      text: '#4ade80',                  // Green 400
      solid: '#22c55e',                 // Green 500
    },
    consumption: {
      bg: 'rgba(239, 68, 68, 0.15)',   // Red glass
      border: 'rgba(239, 68, 68, 0.3)',
      text: '#f87171',                  // Red 400
      solid: '#ef4444',                 // Red 500
    },
    transfer: {
      bg: 'rgba(59, 130, 246, 0.15)',  // Blue glass
      border: 'rgba(59, 130, 246, 0.3)',
      text: '#60a5fa',                  // Blue 400
      solid: '#3b82f6',                 // Blue 500
    },
    adjustment: {
      bg: 'rgba(251, 191, 36, 0.15)',  // Yellow glass
      border: 'rgba(251, 191, 36, 0.3)',
      text: '#fbbf24',                  // Yellow 400
      solid: '#f59e0b',                 // Amber 500
    },
    return: {
      bg: 'rgba(139, 92, 246, 0.15)',  // Purple glass
      border: 'rgba(139, 92, 246, 0.3)',
      text: '#a78bfa',                  // Violet 400
      solid: '#8b5cf6',                 // Violet 500
    },
    waste: {
      bg: 'rgba(107, 114, 128, 0.15)', // Gray glass
      border: 'rgba(107, 114, 128, 0.3)',
      text: '#9ca3af',                  // Gray 400
      solid: '#6b7280',                 // Gray 500
    },
  },
}
```

---

## 2. Component Hierarchy

```
app/
└── kardex/
    ├── page.tsx                          # Main Kardex page
    └── components/
        ├── KardexHeader.tsx              # Header with filters and actions
        ├── BalanceSummaryCards.tsx       # Top metrics cards
        ├── KardexTabs.tsx                # Tab navigation
        ├── MovementsTab/
        │   ├── MovementsTable.tsx        # Main movements table
        │   ├── MovementRow.tsx           # Table row with expand
        │   ├── MovementFilters.tsx       # Collapsible filter panel
        │   └── MovementTypeBadge.tsx     # Colored badge component
        └── BalanceTab/
            ├── BalanceSplitView.tsx      # Split layout container
            ├── MaterialList.tsx          # Left side material list
            ├── LocationBreakdown.tsx     # Right side location details
            └── MaterialCard.tsx          # Individual material card

components/ui/
└── kardex/
    ├── GlassCard.tsx                     # Reusable glass card
    ├── GlassTable.tsx                    # Glass effect table
    ├── DateRangeFilter.tsx               # Date range picker
    ├── MaterialFilter.tsx                # Material multi-select
    ├── StockProgressBar.tsx              # Stock distribution bar
    └── MovementIcon.tsx                  # Icons for movement types

hooks/
└── use-kardex.ts                         # Main data hook
└── use-inventory-balance.ts              # Balance calculations hook
```

---

## 3. Typography Hierarchy

### SF Pro Display Inspired (Using System Fonts)
```tsx
const typography = {
  // Page Title
  display: "text-3xl font-bold tracking-tight text-white",

  // Section Headers
  title1: "text-2xl font-semibold text-white",
  title2: "text-xl font-semibold text-white",

  // Card Titles
  headline: "text-lg font-semibold text-white",

  // Table Headers
  subheadline: "text-sm font-semibold text-white/70 uppercase tracking-wider",

  // Body Text
  body: "text-base font-normal text-white/70",
  bodyEmphasis: "text-base font-medium text-white",

  // Secondary Text
  callout: "text-sm font-normal text-white/60",

  // Metadata/Timestamps
  caption1: "text-xs font-normal text-white/50",
  caption2: "text-xs font-medium text-white/60 uppercase tracking-wide",

  // Numeric Values (Stock, Quantities)
  numeric: "font-mono text-base tabular-nums text-white",
  numericLarge: "font-mono text-2xl tabular-nums font-semibold text-white",
}
```

---

## 4. Layout Structure

### Main Page Layout
```tsx
// app/kardex/page.tsx
<div className="min-h-screen bg-[#0a0a0a]">
  {/* Background Gradient */}
  <div className="fixed inset-0 bg-gradient-to-br from-blue-950/10 via-transparent to-purple-950/10 pointer-events-none" />

  {/* Main Content */}
  <div className="relative z-10 p-6 lg:p-8 space-y-6">

    {/* Header Section */}
    <KardexHeader />

    {/* Balance Summary Cards */}
    <BalanceSummaryCards />

    {/* Tabs with Content */}
    <KardexTabs />

  </div>
</div>
```

### Responsive Breakpoints
- **Mobile**: < 640px - Stacked layout, bottom sheets
- **Tablet**: 640px - 1024px - Condensed tables, 2-column cards
- **Desktop**: 1024px+ - Full split view, expanded tables

---

## 5. Glass Effect Specifications

### Ultra-Thin Glass (Overlays, Hover States)
```tsx
className="
  bg-white/[0.03]
  backdrop-blur-md
  border border-white/[0.06]
  shadow-lg shadow-black/20
"
```

### Thin Glass (Cards, Secondary Containers)
```tsx
className="
  bg-white/[0.05]
  backdrop-blur-xl
  border border-white/[0.1]
  shadow-xl shadow-black/30
"
```

### Medium Glass (Primary Cards, Tables)
```tsx
className="
  bg-white/[0.08]
  backdrop-blur-2xl
  border border-white/[0.12]
  shadow-2xl shadow-black/40
"
```

### Thick Glass (Navigation, Modals)
```tsx
className="
  bg-white/[0.12]
  backdrop-blur-3xl
  border border-white/[0.15]
  shadow-2xl shadow-black/50
"
```

### Glass with Colored Tint (Accent Cards)
```tsx
// Blue tinted glass
className="
  bg-gradient-to-br from-blue-500/10 to-blue-600/5
  backdrop-blur-xl
  border border-blue-400/20
  shadow-xl shadow-blue-900/30
"

// Purple tinted glass
className="
  bg-gradient-to-br from-purple-500/10 to-purple-600/5
  backdrop-blur-xl
  border border-purple-400/20
  shadow-xl shadow-purple-900/30
"
```

---

## 6. Component Specifications

### 6.1 KardexHeader Component

```tsx
// Tailwind Classes
<header className="
  flex flex-col lg:flex-row lg:items-center lg:justify-between
  gap-4 lg:gap-6
  p-6
  bg-white/[0.05] backdrop-blur-xl
  border border-white/[0.1]
  rounded-2xl
  shadow-xl shadow-black/30
">
  {/* Title Section */}
  <div>
    <h1 className="text-3xl font-bold tracking-tight text-white">
      Kardex de Inventario
    </h1>
    <p className="text-sm text-white/60 mt-1">
      Sistema de seguimiento de movimientos
    </p>
  </div>

  {/* Actions Section */}
  <div className="flex flex-wrap items-center gap-3">
    {/* Date Range Picker */}
    <DateRangeFilter />

    {/* Material Filter */}
    <MaterialFilter />

    {/* Export Button */}
    <button className="
      px-4 py-2.5
      bg-blue-500 hover:bg-blue-600
      text-white font-semibold text-sm
      rounded-xl
      shadow-lg shadow-blue-500/30
      hover:shadow-xl hover:shadow-blue-500/40
      active:scale-95
      transition-all duration-150
      flex items-center gap-2
    ">
      <ExportIcon className="w-4 h-4" />
      Exportar
    </button>
  </div>
</header>
```

### 6.2 BalanceSummaryCards Component

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
  {/* Card 1: Total Materials */}
  <div className="
    p-6
    bg-gradient-to-br from-blue-500/10 to-blue-600/5
    backdrop-blur-xl
    border border-blue-400/20
    rounded-2xl
    shadow-xl shadow-blue-900/20
    hover:shadow-2xl hover:shadow-blue-900/30
    transition-all duration-200
  ">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs font-medium text-blue-300/70 uppercase tracking-wide">
          Materiales
        </p>
        <p className="text-3xl font-bold text-white mt-2 font-mono tabular-nums">
          48
        </p>
      </div>
      <div className="
        p-3
        bg-blue-500/20
        backdrop-blur-sm
        border border-blue-400/30
        rounded-xl
      ">
        <PackageIcon className="w-6 h-6 text-blue-300" />
      </div>
    </div>
    <p className="text-xs text-blue-300/50 mt-3">
      Activos en inventario
    </p>
  </div>

  {/* Card 2: Warehouse Stock */}
  <div className="
    p-6
    bg-gradient-to-br from-purple-500/10 to-purple-600/5
    backdrop-blur-xl
    border border-purple-400/20
    rounded-2xl
    shadow-xl shadow-purple-900/20
    hover:shadow-2xl hover:shadow-purple-900/30
    transition-all duration-200
  ">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs font-medium text-purple-300/70 uppercase tracking-wide">
          Bodega
        </p>
        <p className="text-3xl font-bold text-white mt-2 font-mono tabular-nums">
          1,247 kg
        </p>
      </div>
      <div className="
        p-3
        bg-purple-500/20
        backdrop-blur-sm
        border border-purple-400/30
        rounded-xl
      ">
        <WarehouseIcon className="w-6 h-6 text-purple-300" />
      </div>
    </div>
    <p className="text-xs text-purple-300/50 mt-3">
      Stock en bodega principal
    </p>
  </div>

  {/* Card 3: Production Stock */}
  <div className="
    p-6
    bg-gradient-to-br from-green-500/10 to-green-600/5
    backdrop-blur-xl
    border border-green-400/20
    rounded-2xl
    shadow-xl shadow-green-900/20
    hover:shadow-2xl hover:shadow-green-900/30
    transition-all duration-200
  ">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs font-medium text-green-300/70 uppercase tracking-wide">
          Producción
        </p>
        <p className="text-3xl font-bold text-white mt-2 font-mono tabular-nums">
          328 kg
        </p>
      </div>
      <div className="
        p-3
        bg-green-500/20
        backdrop-blur-sm
        border border-green-400/30
        rounded-xl
      ">
        <FactoryIcon className="w-6 h-6 text-green-300" />
      </div>
    </div>
    <p className="text-xs text-green-300/50 mt-3">
      En centros de trabajo
    </p>
  </div>

  {/* Card 4: Movements Today */}
  <div className="
    p-6
    bg-gradient-to-br from-amber-500/10 to-amber-600/5
    backdrop-blur-xl
    border border-amber-400/20
    rounded-2xl
    shadow-xl shadow-amber-900/20
    hover:shadow-2xl hover:shadow-amber-900/30
    transition-all duration-200
  ">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs font-medium text-amber-300/70 uppercase tracking-wide">
          Movimientos Hoy
        </p>
        <p className="text-3xl font-bold text-white mt-2 font-mono tabular-nums">
          23
        </p>
      </div>
      <div className="
        p-3
        bg-amber-500/20
        backdrop-blur-sm
        border border-amber-400/30
        rounded-xl
      ">
        <ActivityIcon className="w-6 h-6 text-amber-300" />
      </div>
    </div>
    <p className="text-xs text-amber-300/50 mt-3">
      Últimas 24 horas
    </p>
  </div>
</div>
```

### 6.3 KardexTabs Component

```tsx
<div className="
  bg-white/[0.05]
  backdrop-blur-xl
  border border-white/[0.1]
  rounded-2xl
  shadow-xl shadow-black/30
  overflow-hidden
">
  {/* Tab Navigation */}
  <div className="
    flex
    border-b border-white/[0.1]
    bg-white/[0.02]
    backdrop-blur-sm
  ">
    <button className="
      flex-1
      px-6 py-4
      text-sm font-semibold
      text-white
      bg-blue-500/20
      border-b-2 border-blue-400
      hover:bg-blue-500/30
      transition-colors duration-150
    ">
      Movimientos
    </button>

    <button className="
      flex-1
      px-6 py-4
      text-sm font-semibold
      text-white/60
      hover:text-white
      hover:bg-white/[0.03]
      transition-colors duration-150
    ">
      Balance por Ubicación
    </button>
  </div>

  {/* Tab Content */}
  <div className="p-6">
    {/* Content goes here */}
  </div>
</div>
```

### 6.4 MovementsTable Component

```tsx
<div className="space-y-4">
  {/* Filters Panel (Collapsible) */}
  <div className="
    p-4
    bg-white/[0.03]
    backdrop-blur-lg
    border border-white/[0.08]
    rounded-xl
  ">
    <button className="
      flex items-center justify-between
      w-full
      text-sm font-semibold text-white/80
      hover:text-white
      transition-colors
    ">
      <span className="flex items-center gap-2">
        <FilterIcon className="w-4 h-4" />
        Filtros
      </span>
      <ChevronDownIcon className="w-4 h-4" />
    </button>

    {/* Expanded Filters */}
    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {/* Filter inputs go here */}
    </div>
  </div>

  {/* Table */}
  <div className="
    overflow-x-auto
    rounded-xl
    border border-white/[0.1]
  ">
    <table className="w-full">
      {/* Table Header */}
      <thead className="
        bg-white/[0.05]
        backdrop-blur-sm
        border-b border-white/[0.1]
      ">
        <tr>
          <th className="
            px-6 py-4
            text-left
            text-xs font-semibold text-white/70
            uppercase tracking-wider
          ">
            Fecha/Hora
          </th>
          <th className="px-6 py-4 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">
            Material
          </th>
          <th className="px-6 py-4 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">
            Tipo
          </th>
          <th className="px-6 py-4 text-right text-xs font-semibold text-white/70 uppercase tracking-wider">
            Cantidad
          </th>
          <th className="px-6 py-4 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">
            Ubicación
          </th>
          <th className="px-6 py-4 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">
            Usuario
          </th>
          <th className="px-6 py-4 text-center text-xs font-semibold text-white/70 uppercase tracking-wider">
            Acciones
          </th>
        </tr>
      </thead>

      {/* Table Body */}
      <tbody className="divide-y divide-white/[0.06]">
        <tr className="
          hover:bg-white/[0.03]
          transition-colors duration-150
          cursor-pointer
        ">
          <td className="px-6 py-4 text-sm text-white/70 font-mono">
            2025-11-29 14:23
          </td>
          <td className="px-6 py-4">
            <div>
              <p className="text-sm font-medium text-white">
                Harina de Trigo 000
              </p>
              <p className="text-xs text-white/50">
                Materias Primas
              </p>
            </div>
          </td>
          <td className="px-6 py-4">
            {/* Movement Type Badge */}
            <span className="
              inline-flex items-center gap-1.5
              px-3 py-1
              bg-green-500/15
              border border-green-400/30
              text-green-400 text-xs font-medium
              rounded-lg
            ">
              <ArrowDownIcon className="w-3 h-3" />
              Recepción
            </span>
          </td>
          <td className="px-6 py-4 text-right">
            <span className="text-sm font-mono font-semibold text-white">
              +50.00 kg
            </span>
          </td>
          <td className="px-6 py-4 text-sm text-white/70">
            Bodega Principal
          </td>
          <td className="px-6 py-4 text-sm text-white/70">
            Juan Pérez
          </td>
          <td className="px-6 py-4 text-center">
            <button className="
              p-2
              hover:bg-white/[0.05]
              rounded-lg
              transition-colors
            ">
              <ExpandIcon className="w-4 h-4 text-white/50" />
            </button>
          </td>
        </tr>

        {/* More rows... */}
      </tbody>
    </table>
  </div>

  {/* Pagination */}
  <div className="flex items-center justify-between">
    <p className="text-sm text-white/50">
      Mostrando 1-20 de 156 movimientos
    </p>

    <div className="flex gap-2">
      <button className="
        px-3 py-2
        bg-white/[0.05]
        hover:bg-white/[0.08]
        border border-white/[0.1]
        text-sm text-white/70
        rounded-lg
        transition-colors
        disabled:opacity-40
        disabled:cursor-not-allowed
      ">
        Anterior
      </button>
      <button className="
        px-3 py-2
        bg-white/[0.05]
        hover:bg-white/[0.08]
        border border-white/[0.1]
        text-sm text-white/70
        rounded-lg
        transition-colors
      ">
        Siguiente
      </button>
    </div>
  </div>
</div>
```

### 6.5 MovementTypeBadge Component

```tsx
// Consumption Badge
<span className="
  inline-flex items-center gap-1.5
  px-3 py-1
  bg-red-500/15
  border border-red-400/30
  text-red-400 text-xs font-medium
  rounded-lg
">
  <ArrowUpIcon className="w-3 h-3" />
  Consumo
</span>

// Transfer Badge
<span className="
  inline-flex items-center gap-1.5
  px-3 py-1
  bg-blue-500/15
  border border-blue-400/30
  text-blue-400 text-xs font-medium
  rounded-lg
">
  <SwapIcon className="w-3 h-3" />
  Transferencia
</span>

// Adjustment Badge
<span className="
  inline-flex items-center gap-1.5
  px-3 py-1
  bg-yellow-500/15
  border border-yellow-400/30
  text-yellow-400 text-xs font-medium
  rounded-lg
">
  <EditIcon className="w-3 h-3" />
  Ajuste
</span>

// Return Badge
<span className="
  inline-flex items-center gap-1.5
  px-3 py-1
  bg-purple-500/15
  border border-purple-400/30
  text-purple-400 text-xs font-medium
  rounded-lg
">
  <ReturnIcon className="w-3 h-3" />
  Devolución
</span>

// Waste Badge
<span className="
  inline-flex items-center gap-1.5
  px-3 py-1
  bg-gray-500/15
  border border-gray-400/30
  text-gray-400 text-xs font-medium
  rounded-lg
">
  <TrashIcon className="w-3 h-3" />
  Merma
</span>
```

### 6.6 BalanceSplitView Component

```tsx
<div className="grid lg:grid-cols-2 gap-6">
  {/* Left Side: Material List */}
  <div className="space-y-3">
    <h3 className="text-lg font-semibold text-white mb-4">
      Materiales
    </h3>

    {/* Search */}
    <div className="relative">
      <input
        type="text"
        placeholder="Buscar material..."
        className="
          w-full
          px-4 py-3 pl-10
          bg-white/[0.05]
          backdrop-blur-md
          border border-white/[0.1]
          rounded-xl
          text-sm text-white
          placeholder:text-white/40
          focus:outline-none
          focus:ring-2 focus:ring-blue-500/50
          focus:border-blue-500/50
          transition-all duration-200
        "
      />
      <SearchIcon className="
        absolute left-3 top-1/2 -translate-y-1/2
        w-4 h-4 text-white/40
      " />
    </div>

    {/* Material Cards */}
    <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
      <MaterialCard />
      <MaterialCard />
      {/* More cards... */}
    </div>
  </div>

  {/* Right Side: Location Breakdown */}
  <div className="
    p-6
    bg-white/[0.03]
    backdrop-blur-lg
    border border-white/[0.1]
    rounded-xl
  ">
    <h3 className="text-lg font-semibold text-white mb-4">
      Distribución por Ubicación
    </h3>

    {/* Content when material selected */}
    <LocationBreakdown />
  </div>
</div>
```

### 6.7 MaterialCard Component

```tsx
<div className="
  p-4
  bg-white/[0.05]
  backdrop-blur-xl
  border border-white/[0.1]
  rounded-xl
  hover:bg-white/[0.08]
  hover:border-white/[0.15]
  hover:shadow-lg hover:shadow-black/20
  transition-all duration-200
  cursor-pointer
  group
">
  <div className="flex items-start justify-between mb-3">
    <div className="flex-1">
      <h4 className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors">
        Harina de Trigo 000
      </h4>
      <p className="text-xs text-white/50 mt-0.5">
        Materias Primas
      </p>
    </div>

    <div className="
      px-2.5 py-1
      bg-blue-500/15
      border border-blue-400/30
      rounded-lg
    ">
      <span className="text-xs font-medium text-blue-400">
        kg
      </span>
    </div>
  </div>

  {/* Total Stock */}
  <div className="mb-3">
    <p className="text-xs text-white/50 mb-1">Stock Total</p>
    <p className="text-2xl font-bold font-mono tabular-nums text-white">
      1,247.50
    </p>
  </div>

  {/* Distribution Progress Bar */}
  <div className="space-y-2">
    <div className="flex items-center justify-between text-xs">
      <span className="text-white/60">Distribución</span>
      <span className="text-white/60">79% / 21%</span>
    </div>

    <div className="h-2 bg-white/[0.05] rounded-full overflow-hidden flex">
      <div
        className="bg-gradient-to-r from-purple-500 to-purple-400"
        style={{ width: '79%' }}
      />
      <div
        className="bg-gradient-to-r from-green-500 to-green-400"
        style={{ width: '21%' }}
      />
    </div>

    <div className="flex items-center justify-between text-xs">
      <div className="flex items-center gap-1.5">
        <div className="w-2 h-2 bg-purple-400 rounded-full" />
        <span className="text-white/60">Bodega: 990 kg</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-2 h-2 bg-green-400 rounded-full" />
        <span className="text-white/60">Producción: 257.5 kg</span>
      </div>
    </div>
  </div>

  {/* Last Movement */}
  <div className="mt-3 pt-3 border-t border-white/[0.06]">
    <p className="text-xs text-white/40">
      Último movimiento: Hoy, 14:23
    </p>
  </div>
</div>
```

### 6.8 LocationBreakdown Component

```tsx
<div className="space-y-6">
  {/* Selected Material Header */}
  <div className="
    p-4
    bg-gradient-to-br from-blue-500/10 to-blue-600/5
    backdrop-blur-sm
    border border-blue-400/20
    rounded-xl
  ">
    <h4 className="text-lg font-semibold text-white mb-1">
      Harina de Trigo 000
    </h4>
    <div className="flex items-baseline gap-3">
      <span className="text-3xl font-bold font-mono tabular-nums text-white">
        1,247.50
      </span>
      <span className="text-sm text-white/60">kg</span>
    </div>
  </div>

  {/* Warehouse Section */}
  <div>
    <div className="flex items-center gap-2 mb-3">
      <WarehouseIcon className="w-5 h-5 text-purple-400" />
      <h5 className="text-sm font-semibold text-white/80 uppercase tracking-wide">
        Bodega Principal
      </h5>
    </div>

    <div className="
      p-4
      bg-purple-500/10
      backdrop-blur-sm
      border border-purple-400/20
      rounded-xl
    ">
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold font-mono tabular-nums text-white">
          990.00
        </span>
        <span className="text-sm text-white/60">kg</span>
      </div>
      <p className="text-xs text-purple-300/60 mt-1">
        79.4% del stock total
      </p>
    </div>
  </div>

  {/* Production Centers Section */}
  <div>
    <div className="flex items-center gap-2 mb-3">
      <FactoryIcon className="w-5 h-5 text-green-400" />
      <h5 className="text-sm font-semibold text-white/80 uppercase tracking-wide">
        Centros de Trabajo
      </h5>
    </div>

    <div className="space-y-2">
      {/* Work Center 1 */}
      <div className="
        p-4
        bg-green-500/10
        backdrop-blur-sm
        border border-green-400/20
        rounded-xl
      ">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-white/80">
            Centro A - Panadería
          </span>
          <span className="text-xs text-green-300/60">
            13.7%
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold font-mono tabular-nums text-white">
            170.50
          </span>
          <span className="text-sm text-white/60">kg</span>
        </div>
      </div>

      {/* Work Center 2 */}
      <div className="
        p-4
        bg-green-500/10
        backdrop-blur-sm
        border border-green-400/20
        rounded-xl
      ">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-white/80">
            Centro B - Pastelería
          </span>
          <span className="text-xs text-green-300/60">
            7.0%
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold font-mono tabular-nums text-white">
            87.00
          </span>
          <span className="text-sm text-white/60">kg</span>
        </div>
      </div>
    </div>
  </div>

  {/* Summary Footer */}
  <div className="
    pt-4
    border-t border-white/[0.1]
  ">
    <div className="flex items-center justify-between text-sm">
      <span className="text-white/60">Total en Producción</span>
      <div className="flex items-baseline gap-2">
        <span className="font-mono font-semibold text-white">257.50</span>
        <span className="text-white/60">kg</span>
      </div>
    </div>
  </div>
</div>
```

---

## 7. Interaction States

### Hover States
```tsx
// Cards
className="
  hover:bg-white/[0.08]
  hover:border-white/[0.15]
  hover:shadow-xl hover:shadow-black/30
  transition-all duration-200
"

// Buttons
className="
  hover:bg-blue-600
  hover:shadow-xl hover:shadow-blue-500/40
  hover:scale-[1.02]
  transition-all duration-150
"

// Table Rows
className="
  hover:bg-white/[0.03]
  transition-colors duration-150
"
```

### Active/Pressed States
```tsx
className="
  active:scale-95
  active:shadow-md
  transition-all duration-100
"
```

### Focus States
```tsx
className="
  focus:outline-none
  focus:ring-2
  focus:ring-blue-500/50
  focus:ring-offset-2
  focus:ring-offset-[#0a0a0a]
  transition-all duration-200
"
```

### Disabled States
```tsx
className="
  disabled:opacity-40
  disabled:cursor-not-allowed
  disabled:hover:scale-100
"
```

### Selected/Active States
```tsx
// Active Tab
className="
  bg-blue-500/20
  border-b-2 border-blue-400
  text-white
"

// Selected Item
className="
  bg-blue-500/15
  border-blue-400/30
  text-blue-300
"
```

---

## 8. Accessibility Specifications

### ARIA Labels
```tsx
// Filter Button
<button
  aria-label="Abrir filtros de movimientos"
  aria-expanded={isExpanded}
  aria-controls="filter-panel"
>
  Filtros
</button>

// Export Button
<button aria-label="Exportar kardex a Excel">
  Exportar
</button>

// Expand Row Button
<button
  aria-label="Ver detalles del movimiento"
  aria-expanded={isRowExpanded}
>
  <ExpandIcon />
</button>
```

### Keyboard Navigation
- **Tab**: Navigate between interactive elements
- **Enter/Space**: Activate buttons and expand rows
- **Arrow Keys**: Navigate table rows (optional enhancement)
- **Escape**: Close modals/filters

### Focus Indicators
Always visible focus rings with sufficient contrast:
```tsx
className="
  focus-visible:outline-none
  focus-visible:ring-2
  focus-visible:ring-blue-500
  focus-visible:ring-offset-2
  focus-visible:ring-offset-[#0a0a0a]
"
```

### Screen Reader Support
```tsx
// Hidden text for context
<span className="sr-only">Ordenar por fecha</span>

// Table headers with scope
<th scope="col">Material</th>

// Progress bars with aria-valuenow
<div
  role="progressbar"
  aria-valuenow={79}
  aria-valuemin={0}
  aria-valuemax={100}
  aria-label="Distribución en bodega"
>
```

### Color Contrast Requirements
- Text on dark background: Minimum 7:1 (AAA level)
- UI components: Minimum 3:1
- All semantic colors tested for sufficient contrast
- Icons paired with text labels where possible

---

## 9. Mobile Responsive Design

### Mobile Layout (< 640px)

```tsx
// Header - Stacked
<header className="
  flex flex-col gap-4
  p-4
  ...
">
  {/* Title full width */}
  {/* Actions stack vertically */}
</header>

// Summary Cards - Single Column
<div className="grid grid-cols-1 gap-3">
  {/* Cards stack */}
</div>

// Table - Simplified Columns
<table className="w-full">
  <thead>
    {/* Only show: Material, Type, Quantity, Actions */}
    {/* Hide: Date, Location, User */}
  </thead>
</table>

// Expandable Row Details (Mobile)
<div className="
  px-4 py-3
  bg-white/[0.02]
  border-t border-white/[0.06]
  space-y-2
">
  <div className="flex justify-between text-xs">
    <span className="text-white/50">Fecha:</span>
    <span className="text-white/70">2025-11-29 14:23</span>
  </div>
  {/* Additional hidden fields */}
</div>

// Split View - Stacked
<div className="flex flex-col gap-4">
  {/* Material list full width */}
  {/* Location breakdown full width below */}
</div>
```

### Touch Targets (Minimum 44x44px)
```tsx
className="min-h-11 min-w-11"  // 44px minimum
className="p-3"                  // Comfortable padding
className="gap-4"                // Spacing between touch elements
```

### Bottom Sheet Filters (Mobile)
```tsx
// Mobile Filter Trigger
<button className="
  fixed bottom-4 right-4
  w-14 h-14
  bg-blue-500
  rounded-full
  shadow-2xl shadow-blue-500/40
  z-50
  sm:hidden
">
  <FilterIcon className="w-6 h-6 text-white m-auto" />
</button>

// Bottom Sheet
<div className="
  fixed inset-x-0 bottom-0
  bg-white/[0.12]
  backdrop-blur-3xl
  border-t border-white/[0.15]
  rounded-t-3xl
  shadow-2xl shadow-black/50
  z-50
  transform transition-transform duration-300
  sm:hidden
">
  {/* Drag handle */}
  <div className="flex justify-center py-3">
    <div className="w-12 h-1 bg-white/30 rounded-full" />
  </div>

  {/* Filter content */}
  <div className="p-6 max-h-[80vh] overflow-y-auto">
    {/* Filters */}
  </div>
</div>
```

---

## 10. Animation Specifications

### Durations
```tsx
const animations = {
  fast: 'duration-100',      // Button press, immediate feedback
  default: 'duration-150',   // Hover states, most transitions
  moderate: 'duration-200',  // Focus, selection changes
  slow: 'duration-300',      // Modal open/close, page transitions
}
```

### Easing Functions
```tsx
const easing = {
  default: 'ease-out',       // User-initiated actions
  in: 'ease-in',            // Elements leaving
  inOut: 'ease-in-out',     // Independent animations
}
```

### Common Transitions
```tsx
// Scale on hover
className="
  hover:scale-[1.02]
  active:scale-95
  transition-transform duration-150 ease-out
"

// Fade and slide
className="
  opacity-0 translate-y-4
  data-[state=open]:opacity-100 data-[state=open]:translate-y-0
  transition-all duration-200 ease-out
"

// Background color
className="
  transition-colors duration-150
"

// All properties
className="
  transition-all duration-200 ease-out
"
```

### Skeleton Loading States
```tsx
<div className="
  h-4 w-32
  bg-white/[0.05]
  rounded
  animate-pulse
" />
```

---

## 11. Reusable Component Library

### GlassCard Component
```tsx
interface GlassCardProps {
  variant?: 'thin' | 'medium' | 'thick'
  className?: string
  children: React.ReactNode
}

const variants = {
  thin: "bg-white/[0.05] backdrop-blur-xl border border-white/[0.1]",
  medium: "bg-white/[0.08] backdrop-blur-2xl border border-white/[0.12]",
  thick: "bg-white/[0.12] backdrop-blur-3xl border border-white/[0.15]",
}

export function GlassCard({ variant = 'medium', className, children }: GlassCardProps) {
  return (
    <div className={cn(
      variants[variant],
      "rounded-2xl shadow-xl shadow-black/30",
      className
    )}>
      {children}
    </div>
  )
}
```

### DateRangeFilter Component
```tsx
export function DateRangeFilter() {
  return (
    <div className="flex items-center gap-2">
      <input
        type="date"
        className="
          px-3 py-2
          bg-white/[0.05]
          backdrop-blur-md
          border border-white/[0.1]
          text-sm text-white
          rounded-lg
          focus:outline-none
          focus:ring-2 focus:ring-blue-500/50
          transition-all
        "
      />
      <span className="text-white/50">-</span>
      <input
        type="date"
        className="
          px-3 py-2
          bg-white/[0.05]
          backdrop-blur-md
          border border-white/[0.1]
          text-sm text-white
          rounded-lg
          focus:outline-none
          focus:ring-2 focus:ring-blue-500/50
          transition-all
        "
      />
    </div>
  )
}
```

### StockProgressBar Component
```tsx
interface StockProgressBarProps {
  warehouse: number
  production: number
  total: number
}

export function StockProgressBar({ warehouse, production, total }: StockProgressBarProps) {
  const warehousePercent = (warehouse / total) * 100
  const productionPercent = (production / total) * 100

  return (
    <div className="space-y-2">
      <div className="h-2 bg-white/[0.05] rounded-full overflow-hidden flex">
        <div
          className="bg-gradient-to-r from-purple-500 to-purple-400 transition-all duration-300"
          style={{ width: `${warehousePercent}%` }}
        />
        <div
          className="bg-gradient-to-r from-green-500 to-green-400 transition-all duration-300"
          style={{ width: `${productionPercent}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 bg-purple-400 rounded-full" />
          <span className="text-white/60">
            Bodega: {warehouse} kg ({warehousePercent.toFixed(1)}%)
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 bg-green-400 rounded-full" />
          <span className="text-white/60">
            Producción: {production} kg ({productionPercent.toFixed(1)}%)
          </span>
        </div>
      </div>
    </div>
  )
}
```

---

## 12. Implementation Checklist

### Phase 1: Core Structure
- [ ] Create `/app/kardex` directory structure
- [ ] Set up base page layout with dark background
- [ ] Implement KardexHeader component
- [ ] Create BalanceSummaryCards with glass effects
- [ ] Build KardexTabs navigation

### Phase 2: Movements Tab
- [ ] Create MovementsTable component
- [ ] Implement MovementRow with expand functionality
- [ ] Build MovementTypeBadge variants
- [ ] Add MovementFilters panel (collapsible)
- [ ] Implement pagination

### Phase 3: Balance Tab
- [ ] Create BalanceSplitView layout
- [ ] Build MaterialList with search
- [ ] Implement MaterialCard component
- [ ] Create LocationBreakdown component
- [ ] Add StockProgressBar visualization

### Phase 4: Data Integration
- [ ] Create `use-kardex.ts` hook
- [ ] Create `use-inventory-balance.ts` hook
- [ ] Connect to Supabase database
- [ ] Implement real-time updates
- [ ] Add error handling

### Phase 5: Polish & Accessibility
- [ ] Add ARIA labels to all interactive elements
- [ ] Test keyboard navigation
- [ ] Verify color contrast ratios
- [ ] Test mobile responsive layout
- [ ] Add loading states
- [ ] Implement error boundaries

### Phase 6: Export Functionality
- [ ] Implement Excel export
- [ ] Implement PDF export
- [ ] Add export configuration modal

---

## 13. Database Schema Recommendations

```sql
-- Inventory movements table
CREATE TABLE inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID REFERENCES materials(id),
  movement_type VARCHAR(20), -- reception, consumption, transfer, adjustment, return, waste
  quantity DECIMAL(10, 3),
  unit VARCHAR(10),
  location_from VARCHAR(100), -- For transfers
  location_to VARCHAR(100),
  reference VARCHAR(100), -- Order ID, production shift, etc.
  user_id UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Inventory balances (materialized view or table)
CREATE TABLE inventory_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID REFERENCES materials(id),
  location VARCHAR(100), -- 'warehouse' or work center code
  quantity DECIMAL(10, 3),
  unit VARCHAR(10),
  last_movement_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_movements_material ON inventory_movements(material_id);
CREATE INDEX idx_movements_created_at ON inventory_movements(created_at DESC);
CREATE INDEX idx_movements_type ON inventory_movements(movement_type);
CREATE INDEX idx_balances_material ON inventory_balances(material_id);
CREATE INDEX idx_balances_location ON inventory_balances(location);
```

---

## 14. Performance Optimizations

### Lazy Loading
```tsx
// Lazy load heavy components
const MovementsTable = lazy(() => import('./MovementsTable'))
const BalanceSplitView = lazy(() => import('./BalanceSplitView'))
```

### Virtual Scrolling
For large tables (1000+ rows), use `@tanstack/react-virtual`:
```tsx
import { useVirtualizer } from '@tanstack/react-virtual'

const rowVirtualizer = useVirtualizer({
  count: movements.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 60, // Row height
})
```

### Debounced Filters
```tsx
const [searchTerm, setSearchTerm] = useState('')
const debouncedSearch = useDebounce(searchTerm, 300)
```

### Memoization
```tsx
const filteredMovements = useMemo(() => {
  return movements.filter(/* filter logic */)
}, [movements, filters])
```

---

## 15. Testing Considerations

### Visual Regression Testing
- Test glass effects across different backgrounds
- Verify color contrast in dark theme
- Test responsive layouts at all breakpoints

### Accessibility Testing
- Run axe-core or similar tool
- Test with screen readers (NVDA, JAWS)
- Verify keyboard-only navigation
- Test with high contrast mode

### Performance Testing
- Test with 10,000+ movement records
- Monitor render performance
- Check bundle size impact
- Test real-time updates performance

---

This comprehensive design specification provides all the details needed to implement a sophisticated, professional Kardex module with DarkMouth theme and Liquid Glass effects. The design prioritizes:

1. **Visual Sophistication**: Dark theme with glass effects
2. **Data Density**: Efficient use of space for enterprise data
3. **Accessibility**: WCAG AAA compliance
4. **Performance**: Optimized for large datasets
5. **Responsiveness**: Mobile-first approach
6. **User Experience**: Smooth interactions and clear hierarchy

You can now proceed with implementation using this specification as your complete design guide.
