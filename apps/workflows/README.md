# Bakery Workflows

Este es el workspace de workflows automatizados usando Trigger.dev.

## 🚀 Setup

### 1. Instalar dependencias

```bash
pnpm install
```

### 2. Configurar variables de entorno

Crea un archivo `.env` en este directorio con:

```env
# Trigger.dev
TRIGGER_SECRET_KEY=tr_dev_xxx

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://khwcknapjnhpxfodsahb.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx

# Braintrust
BRAINTRUST_API_KEY=xxx

# OpenAI
OPENAI_API_KEY=xxx

# Outlook/Microsoft Graph
OUTLOOK_CLIENT_ID=xxx
OUTLOOK_CLIENT_SECRET=xxx
OUTLOOK_TENANT_ID=xxx
OUTLOOK_USER_EMAIL=comercial@pastrychef.com.co
```

### 3. Inicializar Trigger.dev

```bash
# Primero, crea una cuenta en https://cloud.trigger.dev
# Luego ejecuta:
pnpm trigger:dev
```

## 📁 Estructura

```
src/
├── ordenes-compra/     # Workflow de órdenes de compra
│   ├── flows/          # Flujos principales (scheduled tasks)
│   ├── tasks/          # Tareas individuales
│   └── lib/            # Utilidades específicas
├── produccion/         # Futuro: workflows de producción
├── inventario/         # Futuro: workflows de inventario
├── crm/                # Futuro: workflows de CRM
└── shared/             # Código compartido
    ├── lib/            # Utilidades (Supabase, Braintrust, OpenAI)
    └── types/          # Tipos adicionales
```

## 🔧 Comandos

```bash
# Desarrollo local
pnpm trigger:dev

# Deploy a producción
pnpm trigger:deploy

# Build
pnpm build

# Typecheck
pnpm typecheck
```

## 📝 Workflows Implementados

### Órdenes de Compra
- **Trigger**: Scheduled (cada minuto)
- **Flujo**: 
  1. Fetch nuevos emails de Outlook
  2. Clasificar con OpenAI
  3. Descargar PDFs
  4. Upload a Supabase Storage
  5. Extraer datos con GPT-4 Vision
  6. Guardar en base de datos
- **Logging**: Braintrust para monitoreo

## 🔗 Links

- [Trigger.dev Dashboard](https://cloud.trigger.dev)
- [Braintrust Dashboard](https://braintrust.dev)
- [Documentación Trigger.dev](https://trigger.dev/docs)
