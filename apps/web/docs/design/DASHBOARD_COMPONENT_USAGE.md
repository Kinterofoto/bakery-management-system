# Dashboard Component Usage Guide

Complete guide to using the sophisticated Liquid Glass dashboard components.

## Quick Start

### Basic Setup

```tsx
'use client';

import {
  DashboardContainer,
  DashboardHeader,
  FilterPanel,
  MetricsSection,
  SimpleTabNavigation,
  DataTable,
  type FilterValues,
} from '@/components/dashboard';

export default function SalesDashboard() {
  const [filters, setFilters] = React.useState<FilterValues>({
    customers: [],
    products: [],
    dateRange: { preset: 'month' },
    sellers: [],
    statuses: [],
  });

  const handleFilterChange = (newFilters: FilterValues) => {
    setFilters(newFilters);
    // Fetch data based on filters
  };

  return (
    <DashboardContainer>
      <DashboardHeader title="Dashboard de Ventas" />
      <FilterPanel onFilterChange={handleFilterChange} />
      <MetricsSection />
      {/* Tab content below */}
    </DashboardContainer>
  );
}
```

---

## Component Reference

### DashboardContainer

Main wrapper providing consistent layout and spacing.

**Props:**
```tsx
interface DashboardContainerProps {
  children: React.ReactNode;
  className?: string;
}
```

**Example:**
```tsx
<DashboardContainer className="custom-class">
  {/* Dashboard content */}
</DashboardContainer>
```

**Features:**
- Gradient background (light gray to darker gray)
- Responsive padding
- Max-width constraint (7xl)
- Dark mode support

---

### DashboardHeader

Page title, subtitle, breadcrumbs, and optional action button.

**Props:**
```tsx
interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  action?: React.ReactNode;
  className?: string;
}
```

**Example:**
```tsx
<DashboardHeader
  title="Dashboard de Ventas"
  subtitle="Período: Enero 2024"
  breadcrumbs={[
    { label: 'Inicio', href: '/' },
    { label: 'Reportes' },
    { label: 'Ventas' },
  ]}
  action={
    <button className="px-6 py-3 bg-blue-500 text-white rounded-xl">
      Exportar
    </button>
  }
/>
```

**Features:**
- Responsive typography
- Breadcrumb navigation
- Optional action button
- Consistent spacing

---

### FilterPanel

Advanced filtering with Liquid Glass design.

**Props:**
```tsx
interface FilterPanelProps {
  onFilterChange?: (filters: FilterValues) => void;
  showBranchFilter?: boolean;
  className?: string;
}

interface FilterValues {
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
```

**Example:**
```tsx
const [filters, setFilters] = React.useState<FilterValues>({
  customers: [],
  products: [],
  dateRange: { preset: 'month' },
  sellers: [],
  statuses: [],
});

<FilterPanel
  onFilterChange={setFilters}
  showBranchFilter={true}
/>
```

**Features:**
- 6 filter types (Customers, Products, Dates, Sellers, Status, Branch)
- Multi-select dropdowns
- Date range with presets
- Apply/Clear buttons
- Responsive 3-column grid
- Liquid Glass styling

**Customization:**

To modify filter options, edit the component:

```tsx
const customerOptions = [
  'Panadería A',
  'Panadería B',
  // Add more options
];
```

---

### MetricCard

Individual metric display with trend indicators.

**Props:**
```tsx
interface MetricCardProps {
  title: string;
  value: number | string;
  valueFormat?: 'number' | 'percentage' | 'currency';
  trend?: number | null;
  trendLabel?: string;
  trendType?: 'positive' | 'negative' | 'neutral';
  icon?: React.ReactNode;
  subtitle?: string;
  onClick?: () => void;
  className?: string;
  isLoading?: boolean;
}
```

**Example:**
```tsx
<MetricCard
  title="Pedidos Totales"
  value={1234}
  valueFormat="number"
  trend={12.5}
  trendLabel="vs día anterior"
  icon={<Package className="w-5 h-5" />}
  subtitle="En el período seleccionado"
/>
```

**Features:**
- Auto-formatting for numbers, percentages, currency
- Color-coded trend indicators (green/red/gray)
- Loading state with skeleton
- Icon support
- Hover elevation effect
- Click handler support

**Trend Type Auto-Detection:**
- Positive trend: `trend > 0` → Green
- Negative trend: `trend < 0` → Red
- Neutral: `trend = 0 or null` → Gray

---

### MetricsSection

Grid layout for multiple metric cards.

**Props:**
```tsx
interface MetricsSectionProps {
  data?: {
    totalOrders?: number;
    growthVsPreviousDay?: number;
    growthVsPreviousWeek?: number;
    growthVsPreviousMonth?: number;
    growthVsPreviousYear?: number;
  };
  isLoading?: boolean;
  className?: string;
}
```

**Example:**
```tsx
<MetricsSection
  data={{
    totalOrders: 1234,
    growthVsPreviousDay: 12.5,
    growthVsPreviousWeek: 8.2,
    growthVsPreviousMonth: -2.1,
    growthVsPreviousYear: 24.5,
  }}
  isLoading={false}
/>
```

**Features:**
- 5 pre-configured metric cards
- Responsive grid (1-5 columns)
- Loading state for all cards
- Default data provided
- Icon integration

---

### TabNavigation

Tab switcher with smooth transitions.

**Props:**
```tsx
interface Tab {
  id: string;
  label: string;
  content: ReactNode;
  icon?: ReactNode;
}

interface TabNavigationProps {
  tabs: Tab[];
  defaultTabId?: string;
  onTabChange?: (tabId: string) => void;
  className?: string;
}
```

**Example:**
```tsx
<TabNavigation
  defaultTabId="frequencies"
  onTabChange={(tabId) => console.log('Switched to:', tabId)}
  tabs={[
    {
      id: 'frequencies',
      label: 'Frecuencias',
      icon: <BarChart3 className="w-4 h-4" />,
      content: <FrequenciesTable />,
    },
    {
      id: 'control',
      label: 'Control de Clientes',
      icon: <Users className="w-4 h-4" />,
      content: <CustomerControlTable />,
    },
  ]}
/>
```

**Alternative: SimpleTabNavigation**

For simpler use cases without icons:

```tsx
<SimpleTabNavigation
  defaultTabIndex={0}
  tabs={[
    { label: 'Frecuencias', content: <FrequenciesTable /> },
    { label: 'Control de Clientes', content: <CustomerControlTable /> },
  ]}
/>
```

**Features:**
- Icon support (optional)
- Active state styling
- Keyboard accessible
- Smooth fade transitions
- ARIA attributes

---

### DataTable

Responsive table with Liquid Glass styling.

**Props:**
```tsx
interface ColumnDef<T> {
  header: string;
  accessor: keyof T;
  cell?: (value: any, row: T) => ReactNode;
  width?: string;
  sortable?: boolean;
}

interface DataTableProps<T extends Record<string, any>> {
  data: T[];
  columns: ColumnDef<T>[];
  isLoading?: boolean;
  emptyMessage?: string;
  className?: string;
  rowClassName?: (row: T, index: number) => string;
  onRowClick?: (row: T) => void;
}
```

**Example:**
```tsx
interface SaleRecord {
  id: string;
  customer: string;
  product: string;
  quantity: number;
  amount: number;
  date: string;
  status: 'completed' | 'pending' | 'cancelled';
}

const salesData: SaleRecord[] = [
  // Data here
];

const columns: ColumnDef<SaleRecord>[] = [
  {
    header: 'Cliente',
    accessor: 'customer',
  },
  {
    header: 'Producto',
    accessor: 'product',
  },
  {
    header: 'Cantidad',
    accessor: 'quantity',
    cell: (value) => <span className="font-mono">{value}</span>,
  },
  {
    header: 'Monto',
    accessor: 'amount',
    cell: (value) => `$${value.toLocaleString()}`,
    sortable: true,
  },
  {
    header: 'Fecha',
    accessor: 'date',
    cell: (value) => new Date(value).toLocaleDateString('es-ES'),
    sortable: true,
  },
  {
    header: 'Estado',
    accessor: 'status',
    cell: (value) => (
      <span className={`
        px-3 py-1 rounded-lg text-xs font-medium
        ${value === 'completed'
          ? 'bg-green-100 text-green-700'
          : value === 'pending'
          ? 'bg-yellow-100 text-yellow-700'
          : 'bg-red-100 text-red-700'
        }
      `}>
        {value}
      </span>
    ),
  },
];

<DataTable
  data={salesData}
  columns={columns}
  isLoading={false}
  onRowClick={(row) => console.log('Clicked:', row)}
  emptyMessage="No hay datos disponibles"
/>
```

**Features:**
- Generic type support
- Custom cell rendering
- Loading skeleton
- Empty state
- Row click handlers
- Responsive horizontal scroll
- Sortable indicators
- Custom row styling

---

## Glass Styles System

Direct access to Liquid Glass class collections.

```tsx
import { glassStyles } from '@/components/dashboard';
```

### Available Style Groups

```tsx
// Material thickness levels
glassStyles.materials.ultraThin
glassStyles.materials.standard
glassStyles.materials.thick

// Colored glass variants
glassStyles.coloredGlass.blue
glassStyles.coloredGlass.green
glassStyles.coloredGlass.red
glassStyles.coloredGlass.orange

// Container styles
glassStyles.containers.filterPanel
glassStyles.containers.metricCard
glassStyles.containers.card
glassStyles.containers.modal
glassStyles.containers.backdrop

// Input styles
glassStyles.inputs.standard
glassStyles.inputs.select
glassStyles.inputs.textarea

// Button styles
glassStyles.buttons.primary
glassStyles.buttons.secondary
glassStyles.buttons.glass
glassStyles.buttons.icon

// Table styles
glassStyles.table.container
glassStyles.table.header
glassStyles.table.row
glassStyles.table.cell

// Tab styles
glassStyles.tabs.trigger
glassStyles.tabs.active

// Spacing and gap
glassStyles.spacing.xs through 3xl
glassStyles.gap.xs through 3xl

// Typography
glassStyles.typography.display
glassStyles.typography.title1
glassStyles.typography.title2
glassStyles.typography.headline
glassStyles.typography.body
glassStyles.typography.callout
glassStyles.typography.caption
glassStyles.typography.mono
```

### Helper Functions

```tsx
import {
  getMetricCardClass,
  getTabTriggerClass,
  getButtonClass,
  getInputClass,
  getContainerClass,
  getMaterialClass,
  getColoredGlassClass,
} from '@/components/dashboard';

// Usage
className={getButtonClass('primary')}
className={getContainerClass('filterPanel')}
className={getMaterialClass('standard')}
className={getColoredGlassClass('blue')}
```

---

## Complete Example: Sales Dashboard

```tsx
'use client';

import React, { useState } from 'react';
import {
  DashboardContainer,
  DashboardHeader,
  FilterPanel,
  MetricsSection,
  SimpleTabNavigation,
  DataTable,
  type FilterValues,
  type ColumnDef,
} from '@/components/dashboard';

interface SaleRecord {
  id: string;
  customer: string;
  product: string;
  amount: number;
  date: string;
  status: 'completed' | 'pending';
}

export default function SalesDashboard() {
  const [filters, setFilters] = useState<FilterValues>({
    customers: [],
    products: [],
    dateRange: { preset: 'month' },
    sellers: [],
    statuses: [],
  });

  const [isLoading, setIsLoading] = useState(false);

  // Mock data
  const metricsData = {
    totalOrders: 1234,
    growthVsPreviousDay: 12.5,
    growthVsPreviousWeek: 8.2,
    growthVsPreviousMonth: -2.1,
    growthVsPreviousYear: 24.5,
  };

  const salesData: SaleRecord[] = [
    {
      id: '1',
      customer: 'Panadería A',
      product: 'Pan Blanco',
      amount: 1200,
      date: '2024-01-15',
      status: 'completed',
    },
    {
      id: '2',
      customer: 'Panadería B',
      product: 'Croissants',
      amount: 850,
      date: '2024-01-15',
      status: 'pending',
    },
    // More records...
  ];

  const columns: ColumnDef<SaleRecord>[] = [
    { header: 'Cliente', accessor: 'customer' },
    { header: 'Producto', accessor: 'product' },
    {
      header: 'Monto',
      accessor: 'amount',
      cell: (value) => `$${value.toLocaleString()}`,
    },
    {
      header: 'Fecha',
      accessor: 'date',
      cell: (value) => new Date(value).toLocaleDateString('es-ES'),
    },
    {
      header: 'Estado',
      accessor: 'status',
      cell: (value) => (
        <span className={`
          px-2 py-1 rounded text-xs font-medium
          ${value === 'completed'
            ? 'bg-green-100 text-green-700'
            : 'bg-yellow-100 text-yellow-700'
          }
        `}>
          {value === 'completed' ? 'Completado' : 'Pendiente'}
        </span>
      ),
    },
  ];

  const handleFilterChange = async (newFilters: FilterValues) => {
    setFilters(newFilters);
    setIsLoading(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setIsLoading(false);
  };

  return (
    <DashboardContainer>
      <DashboardHeader
        title="Dashboard de Ventas"
        subtitle="Análisis detallado del desempeño de ventas"
        breadcrumbs={[
          { label: 'Inicio', href: '/' },
          { label: 'Reportes' },
        ]}
      />

      <FilterPanel
        onFilterChange={handleFilterChange}
        showBranchFilter={true}
      />

      <MetricsSection
        data={metricsData}
        isLoading={isLoading}
      />

      <SimpleTabNavigation
        defaultTabIndex={0}
        tabs={[
          {
            label: 'Frecuencias',
            content: (
              <DataTable
                data={salesData}
                columns={columns}
                isLoading={isLoading}
                emptyMessage="No hay datos de frecuencias"
              />
            ),
          },
          {
            label: 'Control de Clientes',
            content: (
              <DataTable
                data={salesData}
                columns={columns}
                isLoading={isLoading}
                emptyMessage="No hay datos de control"
              />
            ),
          },
        ]}
      />
    </DashboardContainer>
  );
}
```

---

## Styling Custom Elements

### Using Glass Styles in Custom Components

```tsx
import { glassStyles } from '@/components/dashboard';

function CustomComponent() {
  return (
    <div>
      {/* Filter Container */}
      <div className={glassStyles.containers.filterPanel}>
        {/* Content */}
      </div>

      {/* Button */}
      <button className={glassStyles.buttons.primary}>
        Action
      </button>

      {/* Input */}
      <input className={glassStyles.inputs.standard} />

      {/* Card */}
      <div className={glassStyles.containers.card}>
        {/* Content */}
      </div>
    </div>
  );
}
```

---

## Dark Mode Support

All components automatically support dark mode through Tailwind's `dark:` prefix.

**Ensure your app has dark mode enabled:**

```tsx
// tailwind.config.ts
const config: Config = {
  darkMode: 'class',
  // ... rest of config
};
```

**Toggle dark mode:**

```tsx
// In layout.tsx or app.tsx
document.documentElement.classList.toggle('dark');
```

---

## Performance Tips

1. **Use `React.memo` for metric cards in large lists:**
```tsx
const MemoizedMetricCard = React.memo(MetricCard);
```

2. **Lazy load data table rows:**
```tsx
<DataTable
  data={data.slice(0, 50)} // Start with 50 rows
  // Load more on scroll
/>
```

3. **Debounce filter changes:**
```tsx
import { useDebouncedCallback } from 'use-debounce';

const handleFilterChange = useDebouncedCallback(
  (filters) => {
    // Fetch data
  },
  500
);
```

4. **Use `isLoading` state for better UX:**
```tsx
<MetricsSection isLoading={isLoading} />
<DataTable isLoading={isLoading} data={data} columns={columns} />
```

---

## Accessibility Checklist

- [ ] Test with keyboard navigation (Tab, Enter, Escape)
- [ ] Verify color contrast ratios (4.5:1 for text)
- [ ] Add ARIA labels to buttons and interactive elements
- [ ] Test with screen readers (NVDA, JAWS)
- [ ] Ensure focus indicators are visible
- [ ] Test with dark mode enabled
- [ ] Verify responsive design on mobile
- [ ] Test with reduced motion preferences

---

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- iOS Safari 14+
- Chrome Android 90+
- Backdrop filter fallback for older browsers

---

## Next Steps

1. Import components in your pages
2. Customize filter options for your data
3. Connect to your backend API
4. Test responsiveness on mobile
5. Implement dark mode toggle
6. Add accessibility testing

For questions or custom implementations, refer to the design specification in `DASHBOARD_DESIGN_SPEC.md`.
