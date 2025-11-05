# Bakery Management System - Monorepo

Sistema integral de gestión empresarial para panaderías industriales con workflows automatizados.

## 🏗️ Estructura del Monorepo

```
bakery-management-system/
├── apps/
│   ├── web/                    # 📱 Next.js Application
│   │   ├── app/               # Next.js App Router
│   │   ├── components/        # React components
│   │   ├── hooks/             # Custom hooks
│   │   └── lib/               # Utilities
│   │
│   └── workflows/              # ⚙️ Trigger.dev Workflows
│       ├── src/
│       │   ├── ordenes-compra/     # Email → PDF → DB automation
│       │   ├── produccion/         # Future: Production workflows
│       │   ├── inventario/         # Future: Inventory workflows
│       │   ├── crm/                # Future: CRM workflows
│       │   └── shared/             # Shared utilities
│       └── trigger.config.ts
│
└── packages/
    └── database/               # 📦 Shared TypeScript Types
        └── src/types.ts
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- pnpm (recommended) or npm
- Supabase account

### Installation

```bash
# Install dependencies for all workspaces
pnpm install

# Development - Next.js app
pnpm dev

# Development - Workflows (requires Trigger.dev setup)
pnpm dev:workflows
```

## 📦 Workspaces

### `apps/web` - Next.js Application

Sistema ERP completo con módulos de:
- 📦 Gestión de Pedidos
- 👥 CRM de Ventas
- 📊 Inventarios (CountPro)
- 🏭 Producción
- 🚛 Rutas y Logística

Ver [apps/web/README.md](./apps/web/README.md) para más detalles.

### `apps/workflows` - Automation Workflows

Workflows automatizados usando Trigger.dev:
- **Órdenes de Compra**: Procesa emails automáticamente
  - Clasifica emails con OpenAI
  - Extrae datos de PDFs
  - Guarda en Supabase
  - Logging con Braintrust

Ver [apps/workflows/README.md](./apps/workflows/README.md) para configuración.

### `packages/database` - Shared Types

Tipos TypeScript compartidos entre web y workflows.

## 🛠️ Comandos Disponibles

```bash
# Desarrollo
pnpm dev                    # Next.js app
pnpm dev:workflows          # Workflows en modo dev

# Build
pnpm build                  # Build Next.js
pnpm build:workflows        # Build workflows

# Deploy
git push origin main        # Auto-deploy de Next.js a Vercel
pnpm deploy:workflows       # Deploy workflows a Trigger.dev

# Utilidades
pnpm lint                   # Lint del proyecto web
pnpm typecheck              # Typecheck de todos los workspaces
```

## 🔐 Variables de Entorno

### `apps/web/.env.local`
```env
NEXT_PUBLIC_SUPABASE_URL=xxx
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
```

### `apps/workflows/.env`
```env
TRIGGER_SECRET_KEY=xxx
NEXT_PUBLIC_SUPABASE_URL=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
BRAINTRUST_API_KEY=xxx
OPENAI_API_KEY=xxx
OUTLOOK_CLIENT_ID=xxx
OUTLOOK_CLIENT_SECRET=xxx
OUTLOOK_TENANT_ID=xxx
```

## 🗄️ Base de Datos

### Setup de Órdenes de Compra

1. Ejecuta el script de migración:
```bash
# En Supabase SQL Editor
psql < apps/web/scripts/26-create-ordenes-compra-tables.sql
```

2. Verifica las tablas:
- `public.ordenes_compra`
- `public.ordenes_compra_productos`

## 🚢 Deployment

### Next.js App (Vercel)
```bash
git push origin main  # Auto-deploy
```

### Workflows (Trigger.dev)
```bash
cd apps/workflows
pnpm deploy:workflows
```

## 📚 Documentación

- [Web App Documentation](./apps/web/README.md)
- [Workflows Documentation](./apps/workflows/README.md)
- [Database Types](./packages/database/README.md)

## 🏛️ Arquitectura

### Monorepo Benefits
- ✅ Tipos compartidos entre web y workflows
- ✅ Single source of truth
- ✅ Deploys independientes
- ✅ Shared utilities

### Data Flow
```
Outlook Email → Trigger.dev Workflow → Supabase DB → Next.js Dashboard
                      ↓
                 Braintrust (Logging & Monitoring)
```

## 🤝 Contribución

1. Crea una rama feature: `git checkout -b feature/nueva-funcionalidad`
2. Haz commit de cambios: `git commit -am 'feat: agregar nueva funcionalidad'`
3. Push a la rama: `git push origin feature/nueva-funcionalidad`
4. Crea un Pull Request

## 📈 Estado del Proyecto

- ✅ **Monorepo Structure**: Configurado con pnpm workspaces
- ✅ **Next.js App**: Sistema ERP completo funcionando
- ✅ **Database Schema**: Tablas de órdenes de compra creadas
- 🚧 **Workflows**: En implementación (Fase 4-5)
- 🚧 **Frontend Dashboard**: Pendiente (Fase 6)

## 📞 Soporte

Para soporte técnico o preguntas:
- Documentación en `/docs`
- Issues del repositorio
- README específico por workspace

---

**Bakery Management System** - ERP integral con automatización inteligente
