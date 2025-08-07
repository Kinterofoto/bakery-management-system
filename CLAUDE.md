# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 14 bakery management system for "Panadería Industrial" built with React, TypeScript, Tailwind CSS, and Supabase. The application manages orders, inventory, client relationships, and delivery routes across multiple user roles.

## Common Commands

### Development
- `pnpm dev` - Start development server
- `pnpm build` - Build for production  
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint

### Package Management
- Uses pnpm for package management
- Dependencies include Radix UI components, Supabase client, React Hook Form, Zod validation

## Architecture

### Database Layer
- **Supabase**: PostgreSQL database with real-time subscriptions
- **Type Safety**: Generated TypeScript types in `lib/database.types.ts`
- **Schema**: Complex relational model with orders, clients, products, routes, and delivery tracking
- **Database Functions**: Custom PL/pgSQL functions like `calculate_order_total()`

### Frontend Structure
- **App Router**: Next.js 14 app directory structure
- **UI Components**: Radix UI + shadcn/ui component library in `components/ui/`
- **Custom Hooks**: Business logic abstracted into hooks (`hooks/use-orders.ts`, `hooks/use-clients.ts`, etc.)
- **Sidebar Navigation**: Responsive layout with role-based navigation

### Data Flow Patterns
- **Custom Hooks**: Each entity (orders, clients, products, routes) has a dedicated hook for CRUD operations
- **Real-time Updates**: Hooks use `useEffect` + manual refetch pattern rather than real-time subscriptions
- **Error Handling**: Consistent error handling with toast notifications
- **Form Validation**: React Hook Form + Zod for complex form validation

### User Roles System
The application supports multiple user roles with different access levels:
- `admin` - Full system access
- `reviewer_area1` - First-stage order review
- `reviewer_area2` - Second-stage order review  
- `dispatcher` - Order dispatch management
- `driver` - Route execution and deliveries
- `commercial` - Client and order management

### Order Management Workflow
Orders follow a defined status progression:
1. `received` - Initial order creation
2. `review_area1` - First review stage
3. `review_area2` - Second review stage
4. `ready_dispatch` - Ready for shipping
5. `dispatched` - Shipped
6. `in_delivery` - En route
7. `delivered` - Completed
8. `partially_delivered` - Partial completion
9. `returned` - Returned items

### Key Business Logic
- **Order Total Calculation**: Database function with manual fallback in hooks
- **Inventory Tracking**: Quantity requested vs available vs missing per order item
- **Route Planning**: Orders assigned to delivery routes with sequence tracking
- **Returns Processing**: Detailed return tracking with reasons and quantities

## Database Scripts
Database setup scripts in `scripts/` directory:
- `01-create-tables.sql` - Core table structure
- `02-seed-data.sql` - Initial data
- `03-seed-vehicles.sql` - Vehicle data
- `04-fix-tables.sql` - Schema adjustments
- `05-add-unit-price-column.sql` - Price tracking
- `06-create-functions.sql` - Custom functions
- `07-fix-existing-data.sql` - Data migrations

## Environment Configuration
- Requires Supabase environment variables:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Recent Updates

### CRM Module - Complete Sales Management System (NEW!)
- **Dual System Architecture**: Main page now offers selection between Orders and CRM modules
- **Lead Management**: Complete pipeline from prospect to client with configurable stages
- **Sales Pipeline**: Visual Kanban interface with drag-and-drop capabilities
- **Activity Tracking**: Schedule and track calls, meetings, emails, and follow-ups
- **Value Metrics**: Real-time value tracking per pipeline stage with conversion rates

### Database Schema Updates
- **New CRM Tables**: `lead_activities`, `pipeline_stages`, `sales_opportunities`, `lead_sources`
- **Enhanced Clients**: Added `lead_status`, `lead_source_id`, `assigned_user_id` columns
- **Pipeline Stages**: Configurable stages with probability percentages and order
- **Activity Types**: Call, email, meeting, note, proposal, follow-up tracking

### CRM Custom Hooks Added
- `hooks/use-leads.ts` - Lead/prospect management with status transitions
- `hooks/use-pipeline.ts` - Sales pipeline and opportunity management
- `hooks/use-activities.ts` - Activity scheduling and completion tracking

### CRM UI Features
- **Kanban Dashboard**: Visual pipeline with value metrics per stage
- **Calendar View**: Ready for activity scheduling (placeholder implemented)
- **Responsive Design**: Large buttons, intuitive interface optimized for sales teams
- **Activity Management**: Today's tasks, upcoming activities, overdue tracking
- **Lead States**: prospect → contacted → qualified → proposal → negotiation → won/lost

### Rutas Module - Complete Management System
- **Vehicle Management**: Create, assign drivers, track capacity and status
- **Driver Management**: Create drivers (users with driver role), assign to vehicles
- **Route Creation**: Full workflow for creating routes with driver and vehicle assignment
- **Manual Data Fetching**: Implemented fallback system due to Supabase foreign key cache issues

### Custom Hooks Added
- `hooks/use-vehicles.ts` - Vehicle CRUD operations and driver assignment
- `hooks/use-drivers.ts` - Driver/user management with role filtering
- Enhanced `hooks/use-routes.ts` - Manual data combination to handle DB relation issues

### UI Components
- Multi-modal interface for creating routes, vehicles, and drivers
- Driver-to-vehicle assignment functionality
- Responsive design with mobile-first approach

## Development Notes
- ESLint and TypeScript errors are ignored during build (see `next.config.mjs`)
- Uses client-side rendering for most components
- Spanish language interface
- No test framework currently configured
- **Important**: Some Supabase foreign key relationships require manual data fetching due to schema cache issues