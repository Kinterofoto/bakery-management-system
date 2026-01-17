# Dashboard Responsive Design Patterns

Complete guide to responsive layouts and CSS patterns for the dashboard components.

## Breakpoints Reference

```
xs (Mobile):      0px - 639px
sm (Mobile+):     640px - 767px
md (Tablet):      768px - 1023px
lg (Desktop):     1024px - 1279px
xl (Large):       1280px - 1535px
2xl (Extra):      1536px+
```

## Responsive Patterns

### 1. Filter Panel Layout

**Mobile (xs):**
- Single column layout
- Full-width inputs
- Stacked filter groups

```tsx
<div className="
  grid grid-cols-1
  gap-4
">
  {/* Each filter takes full width */}
</div>
```

**Tablet (sm/md):**
- Two column layout
- Better spacing

```tsx
<div className="
  grid grid-cols-1
  sm:grid-cols-2
  gap-4 sm:gap-6
">
  {/* Filters arranged in 2 columns */}
</div>
```

**Desktop (lg+):**
- Three column layout
- Optimal spacing

```tsx
<div className="
  grid grid-cols-1
  sm:grid-cols-2
  lg:grid-cols-3
  gap-4 sm:gap-6
">
  {/* Filters arranged in 3 columns */}
</div>
```

### 2. Metric Cards Grid

**Mobile:**
- Stack vertically (1 column)
- Full width
- Minimum height for touch targets

```
┌─────────────────────┐
│  Metric Card 1      │
├─────────────────────┤
│  Metric Card 2      │
├─────────────────────┤
│  Metric Card 3      │
├─────────────────────┤
│  Metric Card 4      │
├─────────────────────┤
│  Metric Card 5      │
└─────────────────────┘
```

```tsx
<div className="
  grid grid-cols-1
  gap-4 sm:gap-6
">
```

**Tablet (md):**
- 2 columns
- First row: 2 cards
- Second row: 2 cards
- Third row: 1 card

```
┌──────────────┬──────────────┐
│  Metric 1    │  Metric 2    │
├──────────────┼──────────────┤
│  Metric 3    │  Metric 4    │
├──────────────┴──────────────┤
│  Metric 5                    │
└──────────────────────────────┘
```

```tsx
<div className="
  grid grid-cols-1
  sm:grid-cols-2
  gap-4 sm:gap-6
">
```

**Desktop (lg):**
- 3 columns
- First row: 3 cards
- Second row: 2 cards

```
┌──────────┬──────────┬──────────┐
│Metric 1  │Metric 2  │Metric 3  │
├──────────┼──────────┴──────────┤
│Metric 4  │Metric 5              │
└──────────┴──────────────────────┘
```

```tsx
<div className="
  grid grid-cols-1
  sm:grid-cols-2
  lg:grid-cols-3
  xl:grid-cols-5
  gap-4 sm:gap-6
">
```

**Large Desktop (xl+):**
- 5 columns (all in one row)
- Maximum space utilization

```
┌──────┬──────┬──────┬──────┬──────┐
│M1    │M2    │M3    │M4    │M5    │
└──────┴──────┴──────┴──────┴──────┘
```

```tsx
<div className="
  grid grid-cols-1
  sm:grid-cols-2
  lg:grid-cols-3
  xl:grid-cols-5
  gap-4 sm:gap-6 lg:gap-8
">
```

### 3. Data Table Responsive Design

**Mobile (xs):**
- Horizontal scroll
- Simplified columns (show only essential)
- Compact cell padding

```tsx
<div className="overflow-x-auto">
  <table className="
    w-full
    text-sm
  ">
    <thead>
      <tr>
        <th className="px-3 py-2 sm:px-6 sm:py-4">Customer</th>
        <th className="px-3 py-2 sm:px-6 sm:py-4">Product</th>
        <th className="px-3 py-2 sm:px-6 sm:py-4">Amount</th>
      </tr>
    </thead>
  </table>
</div>
```

**Tablet/Desktop (sm+):**
- All columns visible
- More spacious layout
- Normal text size

```tsx
<div className="overflow-x-auto">
  <table className="
    w-full
    text-sm sm:text-base
  ">
    <thead>
      <tr>
        <th className="px-3 py-2 sm:px-6 sm:py-4">Customer</th>
        <th className="px-3 py-2 sm:px-6 sm:py-4">Product</th>
        <th className="px-3 py-2 sm:px-6 sm:py-4">Amount</th>
        <th className="px-3 py-2 sm:px-6 sm:py-4">Date</th>
        <th className="px-3 py-2 sm:px-6 sm:py-4">Status</th>
      </tr>
    </thead>
  </table>
</div>
```

### 4. Header Responsive Layout

**Mobile:**
- Vertical stack
- Title on top, action button below

```
┌──────────────────┐
│                  │
│  Dashboard Title │
│                  │
├──────────────────┤
│  Export Button   │
└──────────────────┘
```

```tsx
<div className="
  flex flex-col
  gap-4
  sm:flex-row
  sm:items-center
  sm:justify-between
">
  <h1>Title</h1>
  <button>Action</button>
</div>
```

**Tablet/Desktop:**
- Horizontal layout
- Title on left, action on right

```
┌────────────────────────────────┐
│ Dashboard Title     ExportBtn   │
└────────────────────────────────┘
```

```tsx
<div className="
  flex flex-col
  gap-4
  sm:flex-row
  sm:items-start
  sm:justify-between
">
  <div>
    <h1>Title</h1>
    <p>Subtitle</p>
  </div>
  <button>Action</button>
</div>
```

### 5. Container Padding

Mobile-first padding approach:

```tsx
<div className="
  px-4        // 16px on mobile
  sm:px-6     // 24px on tablet
  lg:px-8     // 32px on desktop
  py-6        // 24px on mobile
  sm:py-8     // 32px on tablet
  lg:py-10    // 40px on desktop
">
  {/* Content */}
</div>
```

### 6. Gap & Spacing Responsive

Spacing that increases with screen size:

```tsx
<div className="
  space-y-4      // 16px gap on mobile
  sm:space-y-6   // 24px gap on tablet
  lg:space-y-8   // 32px gap on desktop
">
  {/* Stacked content */}
</div>
```

```tsx
<div className="
  grid gap-4     // 16px gap on mobile
  sm:gap-6       // 24px gap on tablet
  lg:gap-8       // 32px gap on desktop
">
  {/* Grid content */}
</div>
```

### 7. Typography Responsive

Text size that adapts to screen:

```tsx
<h1 className="
  text-3xl       // 30px on mobile
  sm:text-4xl    // 36px on tablet
  lg:text-5xl    // 48px on desktop
  font-bold
">
  Page Title
</h1>
```

### 8. Tab Navigation Responsive

```tsx
<div className="
  flex
  overflow-x-auto    // Horizontal scroll on mobile
  sm:overflow-visible
  border-b
  border-gray-200
  dark:border-gray-800
  gap-2
  sm:gap-4
  mb-4
  sm:mb-6
">
  {tabs.map((tab) => (
    <button
      key={tab.id}
      className="
        px-4 py-2     // Compact on mobile
        sm:px-6
        sm:py-3       // More spacious on desktop
        whitespace-nowrap
        text-sm
        sm:text-base
      "
    >
      {tab.label}
    </button>
  ))}
</div>
```

## Complete Responsive Example

```tsx
export default function ResponsiveDashboard() {
  return (
    <div className="
      w-full
      min-h-screen
      bg-gradient-to-br from-gray-50 to-gray-100
      dark:from-gray-950 dark:to-gray-900
      px-4 sm:px-6 lg:px-8
      py-6 sm:py-8 lg:py-10
    ">
      <div className="mx-auto max-w-7xl space-y-8 sm:space-y-10 lg:space-y-12">

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold">
              Dashboard
            </h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-2">
              Analytics overview
            </p>
          </div>
          <button className="
            w-full sm:w-auto
            px-6 py-3
            bg-blue-500 text-white
            rounded-xl
          ">
            Export
          </button>
        </div>

        {/* Filters */}
        <div className="
          bg-white/70 dark:bg-black/50
          backdrop-blur-2xl
          rounded-2xl
          p-4 sm:p-6 lg:p-8
          space-y-4 sm:space-y-6
        ">
          <div className="
            grid grid-cols-1
            sm:grid-cols-2
            lg:grid-cols-3
            gap-4 sm:gap-6
          ">
            {/* Filter inputs here */}
          </div>
        </div>

        {/* Metrics */}
        <div className="
          grid grid-cols-1
          sm:grid-cols-2
          lg:grid-cols-3
          xl:grid-cols-5
          gap-4 sm:gap-6 lg:gap-8
        ">
          {/* Metric cards here */}
        </div>

        {/* Table */}
        <div className="
          bg-white/70 dark:bg-black/50
          backdrop-blur-2xl
          rounded-2xl
          overflow-hidden
          text-sm sm:text-base
        ">
          <div className="overflow-x-auto">
            <table className="w-full">
              {/* Table content here */}
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
```

## Mobile Touch Targets

Ensure touch targets are at least 44x44px:

```tsx
<button className="
  min-w-11  // 44px minimum width
  min-h-11  // 44px minimum height
  px-4
  py-3
  rounded-xl
">
  Touch Button
</button>
```

## Hiding Elements Responsively

Show/hide based on screen size:

```tsx
{/* Hide on mobile, show on tablet+ */}
<div className="hidden sm:block">
  Wide layout content
</div>

{/* Show on mobile, hide on tablet+ */}
<div className="sm:hidden">
  Mobile layout content
</div>

{/* Show on desktop only */}
<div className="hidden lg:flex">
  Desktop advanced filters
</div>
```

## Responsive Text Alignment

```tsx
<div className="
  text-center      // Centered on mobile
  sm:text-left     // Left-aligned on tablet+
">
  Content
</div>
```

## Flexbox Responsive

```tsx
<div className="
  flex flex-col    // Column on mobile
  sm:flex-row      // Row on tablet+
  gap-4
  sm:gap-6
">
  <div className="flex-1">Item 1</div>
  <div className="flex-1">Item 2</div>
</div>
```

## CSS Grid Responsive

```tsx
<div className="
  grid grid-cols-1     // 1 column mobile
  sm:grid-cols-2       // 2 columns tablet
  lg:grid-cols-3       // 3 columns desktop
  xl:grid-cols-4       // 4 columns large
  gap-4 sm:gap-6
">
  {/* Grid items */}
</div>
```

## Maximum Width Container

Wrap content in max-width container for large screens:

```tsx
<div className="
  w-full
  px-4 sm:px-6 lg:px-8
">
  <div className="
    mx-auto
    max-w-7xl
  ">
    {/* Content stays within max-width */}
  </div>
</div>
```

## Testing Responsive Design

### Browser DevTools
1. Open DevTools (F12)
2. Click Device Toggle (Ctrl+Shift+M)
3. Select device or custom dimensions
4. Test at: 375px, 768px, 1024px, 1280px+

### Responsive Checklist
- [ ] Mobile (375px): Single column, stacked
- [ ] Mobile (425px): Still single column
- [ ] Tablet (768px): 2 columns where applicable
- [ ] Desktop (1024px): 3+ columns
- [ ] Large (1280px+): Full layout with max-width
- [ ] Touch targets 44x44px minimum
- [ ] Readable text size at each breakpoint
- [ ] Images scale properly
- [ ] No horizontal scroll (except tables)

## Performance Considerations

### Image Optimization
```tsx
import Image from 'next/image';

<Image
  src="/image.jpg"
  alt="Description"
  width={1200}
  height={600}
  sizes="
    (max-width: 640px) 100vw,
    (max-width: 1024px) 90vw,
    1200px
  "
/>
```

### Lazy Loading Tables
```tsx
<div className="max-h-96 overflow-y-auto">
  {/* Limit visible rows, load more on scroll */}
</div>
```

### Critical CSS
Glass effects use `backdrop-filter` which can impact performance:
```tsx
// Provide fallback for unsupported browsers
className="
  bg-white/70 dark:bg-black/50
  backdrop-blur-2xl
  supports-[backdrop-filter]:bg-white/70
  supports-no-[backdrop-filter]:bg-white
"
```

## Accessibility in Responsive Design

```tsx
// Use semantic HTML
<nav aria-label="Filters">
  {/* Filter controls */}
</nav>

// Ensure focus indicators are visible
<button className="
  focus:outline-none
  focus:ring-2
  focus:ring-blue-500
  focus:ring-offset-2
  sm:focus:ring-offset-4
">
  Action
</button>

// Text contrast in responsive contexts
<p className="
  text-gray-900 dark:text-white
  sm:text-base
  text-sm
">
  High contrast text
</p>
```

## Dark Mode Responsive

Dark mode works across all breakpoints:

```tsx
className="
  bg-white dark:bg-black      // Both sizes
  text-gray-900 dark:text-white
  border border-gray-200 dark:border-gray-800
  text-sm sm:text-base
"
```

This ensures proper styling regardless of screen size and theme preference.

---

## Quick Reference Table

| Breakpoint | Width | Use Case |
|------------|-------|----------|
| xs | 0-639px | Mobile phones |
| sm | 640-767px | Large phones, small tablets |
| md | 768-1023px | Tablets |
| lg | 1024-1279px | Desktop |
| xl | 1280-1535px | Large desktop |
| 2xl | 1536px+ | Ultra-wide screens |

## Common Patterns Summary

```
Mobile:           Single column, large touch targets
Tablet:           2-3 columns, medium spacing
Desktop:          3-4 columns, optimal spacing
Large Desktop:    Max-width container, full feature set
```

Use this guide as reference when implementing responsive dashboard components.
