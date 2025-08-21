# Sistema de Gestión de Panadería Industrial

Sistema integral de gestión empresarial para panaderías industriales, construido con Next.js 14, TypeScript, Tailwind CSS y Supabase.

## 🚀 Características Principales

### 📦 Gestión de Pedidos
- Flujo completo desde recepción hasta entrega
- Sistema de revisión por áreas
- Control de inventario integrado
- Cálculo automático de totales

### 👥 CRM de Ventas
- Pipeline visual estilo Kanban
- Gestión de leads y oportunidades
- Seguimiento de actividades comerciales
- Métricas de conversión en tiempo real

### 📊 Sistema de Inventarios (CountPro)
- Interfaz optimizada para móviles
- Doble conteo con conciliación automática
- Búsqueda ultrarrápida de productos
- Generación de reportes en Excel

### 🏭 **Módulo de Producción (NUEVO)**
- **Centros de trabajo múltiples** con operaciones simultáneas
- **Gestión de turnos** con estado persistente
- **Producciones múltiples** por turno con seguimiento independiente
- **Análisis teórico vs real** con métricas de eficiencia
- **Bill of Materials** con unidades personalizadas
- **Control de materiales** (consumidos vs desperdiciados)
- **Dashboard responsivo** optimizado para tablets/móviles

### 🚛 Gestión de Rutas
- Planificación optimizada de entregas
- Asignación de conductores y vehículos
- Seguimiento GPS en tiempo real
- Control de evidencias de entrega

### 🔐 Sistema de Autenticación
- Múltiples roles de usuario
- Permisos granulares por módulo
- Autenticación segura con Supabase Auth
- Protección de rutas automática

## 🛠️ Tecnologías

- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **Styling**: Tailwind CSS, Radix UI, shadcn/ui
- **Base de Datos**: PostgreSQL con Supabase
- **Autenticación**: Supabase Auth
- **Gestión de Estado**: Custom React Hooks
- **Validación**: React Hook Form + Zod

## 📋 Requisitos Previos

- Node.js 18+
- pnpm (recomendado) o npm
- Cuenta de Supabase configurada

## 🚀 Instalación

1. **Clonar el repositorio**
   ```bash
   git clone <repository-url>
   cd bakery-management-system
   ```

2. **Instalar dependencias**
   ```bash
   pnpm install
   ```

3. **Configurar variables de entorno**
   ```bash
   cp .env.example .env.local
   # Editar .env.local con tus credenciales de Supabase
   ```

4. **Configurar la base de datos**
   - Ejecutar scripts en orden desde la carpeta `scripts/`
   - Ver `PRODUCTION_SETUP.md` para configurar el módulo de producción

5. **Ejecutar en desarrollo**
   ```bash
   pnpm dev
   ```

## 🏭 Configuración del Módulo de Producción

El módulo de producción requiere configuración adicional. Ver [`PRODUCTION_SETUP.md`](./PRODUCTION_SETUP.md) para instrucciones detalladas.

### Pasos Rápidos:
1. Ejecutar `scripts/24-create-production-tables.sql`
2. Ejecutar `scripts/25-configure-produccion-schema-permissions.sql`
3. Agregar `produccion` a "Exposed schemas" en Supabase Dashboard
4. Asignar permisos `production: true` a usuarios

## 🎯 Roles de Usuario

| Rol | Descripción | Permisos |
|-----|-------------|----------|
| `admin` | Administrador completo | Acceso total al sistema |
| `commercial` | Gestión comercial | CRM, clientes, pedidos |
| `reviewer_area1` | Revisor primera área | Revisión de pedidos área 1 |
| `reviewer_area2` | Revisor segunda área | Revisión de pedidos área 2 |
| `dispatcher` | Despachador | Rutas, despachos, devoluciones |
| `driver` | Conductor | Rutas asignadas, entregas |

## 📁 Estructura del Proyecto

```
├── app/                    # Next.js App Router
│   ├── produccion/        # Módulo de Producción
│   ├── crm/               # Módulo CRM
│   ├── inventory/         # Módulo de Inventarios
│   └── ...
├── components/
│   ├── production/        # Componentes de producción
│   ├── ui/               # Componentes UI base
│   └── ...
├── hooks/                 # Custom React Hooks
├── lib/                   # Utilidades y configuración
├── scripts/               # Scripts de base de datos
└── ...
```

## 🔧 Comandos Disponibles

```bash
# Desarrollo
pnpm dev          # Servidor de desarrollo
pnpm build        # Build de producción
pnpm start        # Servidor de producción
pnpm lint         # Linting con ESLint

# Base de datos
# Ver scripts/ para migraciones específicas
```

## 📖 Documentación Adicional

- [`CLAUDE.md`](./CLAUDE.md) - Guía completa del proyecto para desarrollo
- [`PRODUCTION_SETUP.md`](./PRODUCTION_SETUP.md) - Configuración del módulo de producción
- [`AUTHENTICATION_GUIDE.md`](./AUTHENTICATION_GUIDE.md) - Sistema de autenticación
- [`DEPLOYMENT_GUIDE.md`](./DEPLOYMENT_GUIDE.md) - Guía de despliegue

## 🤝 Contribución

1. Fork el proyecto
2. Crear una rama feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit los cambios (`git commit -am 'feat: agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crear un Pull Request

## 🏗️ Arquitectura

- **Database First**: Esquemas PostgreSQL con tipos TypeScript generados
- **Schema Separation**: Módulo de producción en schema dedicado `produccion`
- **Hook Pattern**: Lógica de negocio encapsulada en hooks reutilizables
- **Component Composition**: Componentes modulares con Radix UI
- **Type Safety**: TypeScript estricto en todo el stack

## 📊 Módulos del Sistema

### 🎯 Producción
- Gestión de centros de trabajo
- Control de turnos y producciones
- Análisis de eficiencia en tiempo real
- Bill of materials avanzado

### 💼 CRM
- Pipeline de ventas Kanban
- Gestión de leads y oportunidades  
- Actividades comerciales
- Métricas de conversión

### 📦 Inventarios
- Conteos con interfaz calculadora
- Conciliación automática
- Exportación a Excel
- Optimizado para móviles

### 🚛 Logística
- Rutas optimizadas
- Control de vehículos y conductores
- Seguimiento de entregas
- Gestión de devoluciones

## 📈 Estado del Proyecto

- ✅ **Módulo de Pedidos**: Completo y funcional
- ✅ **Sistema CRM**: Implementado con pipeline Kanban
- ✅ **Inventarios**: CountPro con doble verificación
- ✅ **Módulo de Producción**: Recién implementado
- ✅ **Gestión de Rutas**: Sistema completo de logística
- ✅ **Autenticación**: Supabase Auth con roles granulares

## 📞 Soporte

Para soporte técnico o preguntas sobre implementación, consultar:
- Documentación en [`CLAUDE.md`](./CLAUDE.md)
- Issues del repositorio
- Documentación específica por módulo

---

**Panadería Industrial** - Sistema de gestión integral para operaciones de panificación industrial.