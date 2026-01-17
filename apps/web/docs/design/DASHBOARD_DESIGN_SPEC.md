# Dashboard Design Specification
## Panadería Industrial - Analytics & Control System

A sophisticated, modern dashboard following Apple's Human Interface Guidelines and Liquid Glass design principles. Built with React, TypeScript, and Tailwind CSS.

---

## 1. Design Philosophy & Principles

### Apple's Three Core Principles

#### Clarity
- Content hierarchy drives layout decisions
- Text is legible at all sizes with proper contrast
- Metadata and non-essential information is subtle
- Icons support content, never decorate

#### Deference
- Filters and metrics support the data view, not compete with it
- Translucency provides context without distraction
- Minimalist approach: only essential elements visible
- Navigation is intuitive and secondary

#### Depth
- Visual hierarchy through elevation and materials
- Liquid Glass creates spatial relationships
- Motion reinforces interaction feedback
- Shadows subtly indicate elevation levels

---

## 2. Liquid Glass Design System

### Material Thickness Scale

```
ULTRA-THIN (Ephemeral)
├─ Background opacity: 40-50%
├─ Backdrop blur: md-lg
├─ Border opacity: 10-15%
├─ Use case: Overlays, temporary UI, floating elements
└─ Example: bg-white/40 backdrop-blur-lg border border-white/10

STANDARD (Primary)
├─ Background opacity: 60-70%
├─ Backdrop blur: xl-2xl
├─ Border opacity: 15-20%
├─ Use case: Cards, containers, main sections
└─ Example: bg-white/70 backdrop-blur-2xl border border-white/20

THICK (Structural)
├─ Background opacity: 75-85%
├─ Backdrop blur: 3xl
├─ Border opacity: 20-30%
├─ Use case: Navigation, toolbars, persistent UI
└─ Example: bg-white/85 backdrop-blur-3xl border border-white/30
```

### Color Adaptation (Vibrancy)

- Glass surfaces pick up subtle color from content beneath
- Colored glass for emphasized elements: `bg-blue-500/10 backdrop-blur-xl border border-blue-500/20`
- Maintains high contrast: 4.5:1 for text, 3:1 for UI components
- Dark mode variants provided for all materials

---

## 3. Spacing System (8-point Grid)

Based on Apple's 8-point grid for consistency:

```
Space-1  = 4px   (Minimal, tight spacing)
Space-2  = 8px   (Small, related elements)
Space-3  = 12px  (Medium-small spacing)
Space-4  = 16px  (Default, medium spacing)
Space-6  = 24px  (Large spacing between sections)
Space-8  = 32px  (Extra large)
Space-12 = 48px  (Section breaks)
Space-16 = 64px  (Major divisions)
```

### Application in Dashboard

- **Filter inputs**: `gap-4` horizontal spacing
- **Filter rows**: `space-y-4` vertical spacing
- **Metric cards**: `gap-6` (grid layout)
- **Section separation**: `space-y-8`
- **Padding within cards**: `p-6`
- **Label-to-input**: `space-y-2`

---

## 4. Typography Hierarchy

Inspired by SF Pro Display and SF Pro Text:

```
Display (Hero)
├─ Size: 2.25rem (36px)
├─ Weight: 700 (Bold)
├─ Tracking: -0.02em (tight)
└─ Use: Page title, major metrics

Title 1 (Section headers)
├─ Size: 1.875rem (30px)
├─ Weight: 600 (Semibold)
├─ Tracking: -0.01em
└─ Use: Tab names, section headers

Title 2 (Sub-headers)
├─ Size: 1.5rem (24px)
├─ Weight: 600 (Semibold)
├─ Tracking: 0
└─ Use: Card titles, metric labels

Headline (Important content)
├─ Size: 1.125rem (18px)
├─ Weight: 600 (Semibold)
├─ Tracking: 0
└─ Use: Filter labels, button text

Body (Standard)
├─ Size: 1rem (16px)
├─ Weight: 400 (Normal)
├─ Tracking: 0
└─ Use: Body text, descriptions

Callout (Secondary)
├─ Size: 0.875rem (14px)
├─ Weight: 400 (Normal)
├─ Tracking: 0
└─ Use: Metadata, secondary text

Caption (Tertiary)
├─ Size: 0.75rem (12px)
├─ Weight: 500 (Medium)
├─ Tracking: 0.01em
└─ Use: Timestamps, footnotes, labels

Monospace (Data)
├─ Size: 0.875rem (14px)
├─ Weight: 500 (Medium)
├─ Font: SF Mono (or fallback)
└─ Use: Numbers in metrics, codes
```

---

## 5. Color System

### Semantic Colors

```
Primary (Action)
├─ Color: #007AFF (Blue)
├─ Light mode: blue-500
├─ Dark mode variant: blue-400
└─ Use: Buttons, active states, focus rings

Success
├─ Color: #34C759 (Green)
├─ Use: Positive growth, completed states
└─ Text: Combine with gray for neutral

Danger
├─ Color: #FF3B30 (Red)
├─ Use: Negative growth, warning states
└─ Text: Combine with gray for neutral

Secondary
├─ Color: #8E8E93 (Gray)
├─ Use: Secondary text, disabled states
└─ Opacity variants for hierarchy

Glass Materials
├─ Light mode: white with opacity (40-85%)
├─ Dark mode: black with opacity (30-70%)
├─ Border: white with opacity (10-30%)
└─ Shadows: black/5 to black/20
```

### Contrast Requirements

- **Normal text on glass**: 4.5:1 minimum
- **Large text (18px+)**: 3:1 minimum
- **UI components**: 3:1 minimum
- **Metric numbers**: High contrast with background
- **Test tools**: Use WebAIM Contrast Checker for verification

---

## 6. Component Design Patterns

### 6.1 Filter Container (Liquid Glass)

```jsx
<div className="
  bg-white/70 dark:bg-black/50
  backdrop-blur-2xl
  border border-white/20 dark:border-white/10
  rounded-2xl
  shadow-lg shadow-black/5
  p-6
  space-y-6
">
```

**Specifications:**
- Material: Standard glass (70% opacity)
- Backdrop blur: 2xl (20px)
- Border radius: 2xl (16px)
- Padding: 6 (24px)
- Shadow: lg with black/5 tint
- Spacing between rows: 6 (24px)

### 6.2 Input Field (Glass Effect)

```jsx
<input className="
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
  transition-all duration-200
  cursor-pointer
  hover:border-gray-300/70 dark:hover:border-white/20
" />
```

**Specifications:**
- Material: Ultra-thin glass (50% opacity)
- Backdrop blur: md (12px)
- Border radius: xl (12px)
- Padding: px-4 py-3
- Focus ring: 2px blue-500/50
- Transition duration: 200ms
- Touch target: min-h-11 (44px)

### 6.3 Metric Card

```jsx
<div className="
  bg-gradient-to-br from-white/80 to-white/60 dark:from-black/60 dark:to-black/40
  backdrop-blur-xl
  border border-white/25 dark:border-white/15
  rounded-2xl
  shadow-md shadow-black/5
  p-6
  hover:shadow-lg hover:shadow-black/10
  hover:border-white/35 dark:hover:border-white/25
  transition-all duration-200
">
```

**Specifications:**
- Material: Standard glass with gradient
- Gradient: white/80→60 (light), black/60→40 (dark)
- Border radius: 2xl (16px)
- Padding: 6 (24px)
- Hover elevation: shadow-lg
- Transition: all 200ms ease-out

### 6.4 Tab Component

```jsx
// Tab trigger
<button className="
  px-6 py-3
  text-base font-semibold
  text-gray-600 dark:text-gray-400
  border-b-2 border-transparent
  hover:text-gray-900 dark:hover:text-white
  hover:border-blue-500/30
  active:border-blue-500
  transition-all duration-200
  relative
">
```

**Specifications:**
- Padding: px-6 py-3
- Border: 2px bottom (transparent initially)
- Transition: all 200ms
- Active state: blue-500 border
- Hover: subtle border preview

### 6.5 Dropdown/Multi-select

```jsx
<select className="
  w-full
  bg-white/50 dark:bg-black/30
  backdrop-blur-md
  border border-gray-200/50 dark:border-white/10
  rounded-xl
  px-4 py-3
  text-sm
  appearance-none
  bg-[url('data:image/svg+xml;charset=utf-8...')] bg-no-repeat bg-right
  pr-10
  focus:ring-2 focus:ring-blue-500/50
  hover:border-gray-300/70
  transition-all duration-200
" />
```

**Specifications:**
- Material: Ultra-thin glass
- Custom dropdown icon via SVG background
- Padding-right: 10 (40px) for icon
- Rounded: xl (12px)
- Focus ring: blue-500/50

---

## 7. Dashboard Layout Structure

### Layout Flow

```
┌─────────────────────────────────────────────────┐
│ Header                                           │
│ • Page Title: "Dashboard de Ventas"             │
│ • Breadcrumb (if needed)                        │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ Filter Panel (Liquid Glass Container)           │
│ ┌──────────────┬──────────────┬─────────────┐  │
│ │ Clientes     │ Productos    │ Fechas      │  │
│ │ (Multi-sel)  │ (Multi-sel)  │ (Range+Pre) │  │
│ └──────────────┴──────────────┴─────────────┘  │
│ ┌──────────────┬──────────────┬─────────────┐  │
│ │ Vendedor     │ Estado       │ Sucursal*   │  │
│ │ (Multi-sel)  │ (Multi-sel)  │ (Dynamic)   │  │
│ └──────────────┴──────────────┴─────────────┘  │
│ [Aplicar] [Limpiar]                            │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ Metrics Section                                  │
│ ┌────────────────┬────────────────┬──────────┐  │
│ │ Pedidos        │ Crecimiento    │ Crec.    │  │
│ │ Totales        │ vs Día Anterior│ vs Sem.  │  │
│ │ [1,234]        │ +12.5% (green) │ +8.2%    │  │
│ └────────────────┴────────────────┴──────────┘  │
│ ┌────────────────┬────────────────┐            │
│ │ Crec. vs Mes A │ Crec. vs Año A │            │
│ │ -2.1%          │ +24.5%         │            │
│ └────────────────┴────────────────┘            │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ Tab Navigation                                   │
│ [Frecuencias] [Control de Clientes]            │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ Tab Content (Data Table/List)                   │
│ (Dynamic based on selected tab)                 │
└─────────────────────────────────────────────────┘
```

---

## 8. Responsive Design

### Breakpoints

```
Mobile (xs): 0-639px
├─ Single column layout
├─ Full-width filters
├─ Stacked metric cards
├─ Simplified tabs

Tablet (sm/md): 640-1023px
├─ 2-column layout for filters
├─ 2 metric cards per row
├─ Visible scrolling for tabs

Desktop (lg): 1024-1279px
├─ 3-column layout for filters
├─ All metrics visible
├─ Full navigation display

Large Desktop (xl+): 1280px+
├─ Optimal content width (max-w-7xl)
├─ 3 column filters with spacing
├─ Full metrics grid
```

### Mobile-First Approach

```jsx
// Example responsive classes
className="
  space-y-4 sm:space-y-6 md:space-y-8
  grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
  px-4 sm:px-6 lg:px-8
  rounded-xl sm:rounded-2xl
"
```

---

## 9. Interaction & Animation

### Duration Scale

```
Fast:   150ms   - Button press, hover states, quick feedback
Normal: 200ms   - Standard transitions, form interactions
Slow:   300ms   - Modal animations, page transitions
```

### Easing Functions

```
ease-out     - User-initiated actions (buttons, clicks)
ease-in      - Elements leaving/disappearing
ease-in-out  - Independent animations (timing shifts)
```

### Implementation Patterns

```jsx
// Hover effects
className="
  hover:shadow-lg
  hover:shadow-black/10
  hover:scale-[1.02]
  transition-all duration-200 ease-out
"

// Click/Active states
className="
  active:scale-[0.98]
  active:shadow-md
  active:shadow-black/5
  transition-all duration-150
"

// Focus states
className="
  focus:outline-none
  focus:ring-2
  focus:ring-blue-500
  focus:ring-offset-2
  focus:ring-offset-white dark:focus:ring-offset-black
  transition-all duration-200
"
```

---

## 10. Elevation & Shadows

### Shadow System (Depth)

```
Level 1 (Subtle):     shadow-sm shadow-black/5
Level 2 (Default):    shadow shadow-black/5
Level 3 (Medium):     shadow-md shadow-black/5
Level 4 (Large):      shadow-lg shadow-black/10
Level 5 (Extra):      shadow-xl shadow-black/10
Level 6 (Maximum):    shadow-2xl shadow-black/20
```

### Applied to Components

```
Filter container:      shadow-lg shadow-black/5
Metric card:          shadow-md shadow-black/5 → hover: shadow-lg
Input field:          shadow-sm shadow-black/5
Modal/Overlay:        shadow-2xl shadow-black/20
Dropdown:             shadow-lg shadow-black/10
```

---

## 11. Accessibility

### Contrast Ratios

- **Normal text**: 4.5:1 minimum (WCAG AA)
- **Large text (18px+)**: 3:1 minimum
- **UI components**: 3:1 minimum
- **Metric numbers**: 5:1+ recommended
- **Test with**: WebAIM Contrast Checker, Lighthouse

### Focus Management

```jsx
// All interactive elements must have visible focus
className="
  focus:outline-none
  focus:ring-2
  focus:ring-blue-500
  focus:ring-offset-2
  focus:ring-offset-white dark:focus:ring-offset-black
"
```

### ARIA Attributes

- Use `aria-label` for icon-only buttons
- Use `aria-pressed` for toggle states
- Use `aria-selected` for tabs/options
- Use `aria-live="polite"` for metric updates
- Use `aria-current="page"` for active tab

### Keyboard Navigation

- All form fields accessible via Tab key
- Enter to submit filters
- Arrow keys for select options
- Escape to close modals/dropdowns

---

## 12. Dark Mode Implementation

### Color Tokens

```jsx
// Light mode
bg-white/70, bg-white/50, border border-white/20

// Dark mode variants
dark:bg-black/50, dark:bg-black/30, dark:border-white/10
```

### Automatic Adaptation

```jsx
// Combined example
className="
  bg-white/70 dark:bg-black/50
  border border-white/20 dark:border-white/10
  text-gray-900 dark:text-white
"
```

### Testing

- Test all glass effects with both light and dark content
- Verify contrast in both modes
- Test text readability over various backgrounds

---

## 13. Performance Optimization

### Backdrop Filter Considerations

- GPU-intensive: use sparingly and strategically
- Provide solid fallback for unsupported browsers
- Test on lower-end devices
- Consider disabling on mobile for performance

```jsx
// Fallback approach
className="
  bg-white/70 dark:bg-black/50
  backdrop-blur-2xl
  supports-[backdrop-filter]:bg-white/70
  supports-no-[backdrop-filter]:bg-white
"
```

### Animation Performance

- Use `transform` and `opacity` for smooth animations
- Avoid animating `width`, `height`, `top`, `left`
- Use CSS transforms for 60fps performance

---

## 14. Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Backdrop filter support: ~95% of modern browsers
- Fallback to solid backgrounds for older browsers
- Test on iOS Safari and Android Chrome

---

## 15. Implementation Checklist

- [ ] Create reusable glass material component classes
- [ ] Build filter panel with responsive grid layout
- [ ] Implement metric cards with gradient backgrounds
- [ ] Add tab navigation with smooth transitions
- [ ] Create responsive data table/list component
- [ ] Implement filter logic and state management
- [ ] Add keyboard navigation support
- [ ] Test accessibility (contrast, focus, ARIA)
- [ ] Test dark mode with various backgrounds
- [ ] Performance testing on mobile devices
- [ ] Cross-browser compatibility check
- [ ] Create documentation for component usage

---

## 16. File Structure

```
components/dashboard/
├── DashboardContainer.tsx        // Main wrapper
├── DashboardHeader.tsx           // Title and breadcrumbs
├── FilterPanel.tsx               // Filter section (Liquid Glass)
│   ├── FilterRow.tsx             // Row layout helper
│   ├── CustomerFilter.tsx        // Multi-select dropdown
│   ├── ProductFilter.tsx         // Multi-select dropdown
│   ├── DateFilter.tsx            // Date range with presets
│   ├── SellerFilter.tsx          // Multi-select dropdown
│   ├── StatusFilter.tsx          // Multi-select dropdown
│   └── BranchFilter.tsx          // Dynamic sub-filter
├── MetricsSection.tsx            // Metrics cards grid
│   ├── MetricCard.tsx            // Individual metric card
│   ├── TotalOrdersCard.tsx       // Total orders metric
│   ├── GrowthCard.tsx            // Growth comparison card
│   └── TrendIndicator.tsx        // Green/red/gray indicator
├── TabNavigation.tsx             // Tab switcher
├── DataTable.tsx                 // Table component
├── DataList.tsx                  // List fallback
└── styles/
    └── dashboard-glass.css       // Reusable glass classes
```

---

## 17. Usage Example

```tsx
<DashboardContainer>
  <DashboardHeader title="Dashboard de Ventas" />

  <FilterPanel
    onFilterChange={handleFiltersChange}
    dynamicBranchFilter={selectedCustomer}
  />

  <MetricsSection data={metricsData} />

  <TabNavigation
    tabs={["Frecuencias", "Control de Clientes"]}
    activeTab={activeTab}
    onTabChange={setActiveTab}
  >
    {activeTab === "Frecuencias" && <FrequenciesTable />}
    {activeTab === "Control de Clientes" && <CustomerControlTable />}
  </TabNavigation>
</DashboardContainer>
```

---

## 18. Color Reference Guide

### Light Mode
- Background: white/70 (RGB: 255,255,255 @ 70% opacity)
- Border: white/20 (RGB: 255,255,255 @ 20% opacity)
- Text: gray-900 (RGB: 17,24,39)
- Accent: blue-500 (RGB: 0,122,255)

### Dark Mode
- Background: black/50 (RGB: 0,0,0 @ 50% opacity)
- Border: white/10 (RGB: 255,255,255 @ 10% opacity)
- Text: white (RGB: 255,255,255)
- Accent: blue-400 (RGB: 96,165,250)

### Semantic Colors
- Success: green-500 (#34C759)
- Danger: red-500 (#FF3B30)
- Warning: orange-500 (#FF9500)
- Secondary: gray-500 (#8E8E93)

---

## 19. Motion & Microinteractions

### Filter Application
- Subtle fade-in for results
- Smooth height transitions for filter row changes
- Bounce animation for metric updates

### Metric Updates
- Number counter animation (optional)
- Color flash on significant changes
- Trend arrow animation

### Tab Switching
- Fade transition between tab content
- Smooth bottom border animation for active tab
- Stagger animation if showing multiple elements

---

This specification provides a complete, implementable design system for your dashboard that balances sophistication with usability, following Apple's design principles and modern web best practices.
