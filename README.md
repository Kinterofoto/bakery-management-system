# Bakery Management System - Monorepo

Sistema integral de gestión empresarial para panaderías industriales.

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
│   └── api/                    # 🔌 FastAPI Backend
│
└── packages/
    └── database/               # 📦 Shared TypeScript Types
        └── src/types.ts
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.14+
- pnpm (recommended) or npm
- Supabase account

### Installation

```bash
# Install dependencies for all workspaces
pnpm install

# Install Python dependencies for backend
cd apps/api
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cd ../..
```

### Development

#### With Conductor (Recommended)
```bash
# Usa el script de inicio que configura puertos dinámicamente
./start-dev.sh
```

#### Manual
```bash
# Terminal 1 - Backend (FastAPI)
cd apps/api
source venv/bin/activate
uvicorn app.main:app --reload --port 8000

# Terminal 2 - Frontend (Next.js)
pnpm dev
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

### `packages/database` - Shared Types

Tipos TypeScript compartidos.

## 🛠️ Comandos Disponibles

```bash
# Desarrollo
pnpm dev                    # Next.js app

# Build
pnpm build                  # Build Next.js

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
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=xxx
```

### `apps/api/.env`
```env
SUPABASE_URL=xxx
SUPABASE_SERVICE_KEY=xxx
OPENAI_API_KEY=xxx
MS_GRAPH_CLIENT_ID=xxx
MS_GRAPH_CLIENT_SECRET=xxx
MS_GRAPH_TENANT_ID=xxx
```

## 🚢 Deployment

### Next.js App (Vercel)
```bash
git push origin main  # Auto-deploy
```

## 📚 Documentación

- [Web App Documentation](./apps/web/README.md)
- [Database Types](./packages/database/README.md)

## 🏛️ Arquitectura

### Monorepo Benefits
- ✅ Single source of truth
- ✅ Deploys independientes
- ✅ Shared utilities

## 🤝 Contribución

1. Crea una rama feature: `git checkout -b feature/nueva-funcionalidad`
2. Haz commit de cambios: `git commit -am 'feat: agregar nueva funcionalidad'`
3. Push a la rama: `git push origin feature/nueva-funcionalidad`
4. Crea un Pull Request

## 📈 Estado del Proyecto

- ✅ **Monorepo Structure**: Configurado con pnpm workspaces
- ✅ **Next.js App**: Sistema ERP completo funcionando
- ✅ **Database Schema**: Tablas configuradas

## 📞 Soporte

Para soporte técnico o preguntas:
- Documentación en `/docs`
- Issues del repositorio
- README específico por workspace

---

**Bakery Management System** - ERP integral para panaderías
