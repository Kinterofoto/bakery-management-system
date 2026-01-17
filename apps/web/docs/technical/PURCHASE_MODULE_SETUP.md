# Purchase Module Setup Guide

This guide provides step-by-step instructions for setting up the Purchase Management Module in your bakery management system.

## Overview

The Purchase Module uses a dedicated `compras` schema for better organization and includes:

- **Suppliers Management**: Track supplier information and contacts
- **Material-Supplier Relationships**: Manage pricing, packaging, and lead times per supplier
- **Material Explosion**: Calculate raw material requirements from BOM (Bill of Materials)
- **Purchase Orders**: Create, track, and manage purchase orders with automated status updates

## Database Setup

### 1. Apply Migrations

The purchase module migrations are located in:
- `apps/web/supabase/migrations/20251113000001_create_purchase_module.sql` - Creates schema and tables
- `apps/web/supabase/migrations/20251113000002_configure_compras_schema_permissions.sql` - Sets up permissions

To apply these migrations, run from the `apps/web` directory:

```bash
cd apps/web
supabase db push
```

Or apply them manually through the Supabase Dashboard → SQL Editor.

### 2. Expose Compras Schema in Supabase API

**IMPORTANT**: You must expose the `compras` schema in your Supabase project settings.

1. Go to your Supabase Dashboard
2. Navigate to **Settings** → **API**
3. Scroll down to **"Exposed schemas"**
4. Add `compras` to the list of exposed schemas (comma-separated)
5. Click **Save**

Example: `public, produccion, compras`

This step is **required** for the frontend to access tables in the `compras` schema via the Supabase client.

### 3. Verify Setup

Run this query in Supabase SQL Editor to verify the schema was created correctly:

```sql
SELECT schema_name
FROM information_schema.schemata
WHERE schema_name = 'compras';

-- Check tables
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'compras';
```

You should see 6 tables:
- `suppliers`
- `material_suppliers`
- `purchase_orders`
- `purchase_order_items`
- `material_explosion_history`
- `material_explosion_items`

### 4. Verify Permissions

```sql
-- Check schema permissions
SELECT grantee, privilege_type
FROM information_schema.schema_privileges
WHERE schema_name = 'compras';

-- Check table permissions
SELECT grantee, table_name, privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'compras';
```

## Schema Structure

### Compras Schema Tables

#### `compras.suppliers`
Stores supplier information:
- Company name, NIT (tax ID)
- Contact person and details
- Address, phone, email
- Status (active/inactive)

#### `compras.material_suppliers`
Many-to-many relationship between materials and suppliers:
- Links materials (from `public.products` with category 'mp') to suppliers
- Stores pricing, packaging unit, presentation
- Lead time in days
- Preferred supplier flag
- Status (active/inactive)

#### `compras.purchase_orders`
Purchase order headers:
- Auto-generated order number (format: OCYY####)
- Supplier reference
- Status: pending → ordered → partially_received → received → cancelled
- Order date, expected delivery, actual delivery
- Auto-calculated total amount
- Created by user tracking

#### `compras.purchase_order_items`
Line items for each purchase order:
- Material reference
- Material-supplier relationship
- Quantity ordered vs quantity received
- Unit price and auto-calculated subtotal
- Notes per item

#### `compras.material_explosion_history`
Tracks BOM calculations for production planning:
- Product and quantity requested
- Calculation date
- Created by user
- Notes

#### `compras.material_explosion_items`
Detailed results of BOM calculations:
- Material quantities per unit (from BOM)
- Total quantity needed
- Suggested supplier
- Links to explosion history

## Automated Features

### 1. Purchase Order Number Generation
- Automatically generates unique order numbers: `OCYY####`
- Format: OC + Year (2 digits) + Sequential number (4 digits)
- Example: `OC250001`, `OC250002`

### 2. Order Total Calculation
- Automatically updates when items are added/modified/deleted
- Sums all item subtotals

### 3. Status Management
- Auto-updates order status based on received quantities:
  - All items received → `received`
  - Some items received → `partially_received`
- Sets actual delivery date when completed

### 4. Timestamp Tracking
- `created_at` set automatically
- `updated_at` updates on every modification

## Row Level Security (RLS)

All tables have RLS enabled with policies for authenticated users:
- SELECT, INSERT, UPDATE, DELETE allowed for all authenticated users
- Service role has full access

## Integration with Existing System

### Products Table
The purchase module references `public.products` for materials:
- Only products with category `'mp'` (materia prima) are used
- The `bill_of_materials` table in `produccion` schema links finished products to raw materials

### Users Table
- Purchase orders track `created_by` user
- References `auth.users(id)`

### BOM Integration
Material explosion calculations use:
- `produccion.bill_of_materials` for quantity per unit
- Product information from `public.products`
- Supplier pricing from `compras.material_suppliers`

## Next Steps

After database setup:

1. **Generate TypeScript Types**:
   ```bash
   # If using Supabase CLI
   supabase gen types typescript --local > lib/database.types.ts
   ```

2. **Create Custom Hooks** (in progress):
   - `hooks/use-suppliers.ts`
   - `hooks/use-material-suppliers.ts`
   - `hooks/use-material-explosion.ts`
   - `hooks/use-purchase-orders.ts`

3. **Build UI Components** (in progress):
   - Materials Management (parametrization)
   - Suppliers Management (parametrization)
   - Material-Supplier Assignment
   - Material Explosion Calculator
   - Purchase Orders Dashboard

## Module Features

### Parametrization Submodule
- **Materials**: CRUD for raw materials (mp category products)
- **Suppliers**: Complete supplier management
- **Assignments**: Link materials to suppliers with pricing

### Material Explosion
- Select finished product
- Enter quantity needed
- System calculates required raw materials from BOM
- Suggests suppliers based on pricing and preferences
- Adjusts quantities to packaging units

### Purchase Orders
- Create orders from material explosion
- Group materials by supplier
- Track order status through workflow
- Record partial and complete deliveries
- Maintain delivery history

## Design System

The Purchase Module follows Apple's Liquid Glass design principles:
- Translucent glass cards with backdrop blur
- Consistent spacing using 8-point grid
- Typography hierarchy with proper weights
- Accessible color contrast
- Touch-friendly interactive elements
- Smooth transitions and animations
- Responsive design for desktop and tablets

Refer to `.claude/agents/apple-design-expert.md` for complete design guidelines.

## Troubleshooting

### "relation does not exist" errors
- Verify the `compras` schema is exposed in API settings
- Check migrations were applied successfully
- Restart your development server

### Permission denied errors
- Run migration `27_configure_compras_schema_permissions.sql`
- Verify RLS policies are created
- Check user is authenticated

### Foreign key errors
- Ensure `public.products` table has materials with category 'mp'
- Verify `produccion.bill_of_materials` is configured
- Check supplier and material IDs are valid UUIDs

## Support

For issues or questions:
- Check existing migrations in `supabase/migrations/`
- Review hooks in `hooks/use-*.ts`
- Consult `CLAUDE.md` for project structure
- See `.claude/agents/apple-design-expert.md` for UI guidelines
