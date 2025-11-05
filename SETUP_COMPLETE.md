# 🎉 Setup Completado - Bakery Workflows

## ✅ Lo que ya está configurado:

### 1. **Monorepo Structure**
- ✅ Apps: `web` (Next.js) y `workflows` (Trigger.dev)
- ✅ Package compartido: `@bakery/database` con tipos
- ✅ pnpm workspaces configurado

### 2. **Azure & Outlook API**
- ✅ App Registration: `Bakery Workflows Outlook`
- ✅ Client ID: `30502fe2-c2b9-438f-8d0e-c5efb490b324`
- ✅ Tenant ID: `98a6e9c7-e03b-4deb-828d-c1266c2cf7df`
- ✅ Admin consent: Granted ✓
- ✅ Permisos: Mail.Read, Mail.ReadWrite

### 3. **Supabase Database**
- ✅ Schema `workflows` creado
- ✅ Tabla `workflows.ordenes_compra` 
- ✅ Tabla `workflows.ordenes_compra_productos`
- ✅ RLS policies configuradas
- ✅ Migración aplicada: `20251105184816_create_workflows_schema_ordenes_compra.sql`

### 4. **API Keys Configuradas**
- ✅ Trigger.dev: `tr_dev_FTzJxKxBuEMvU9KpPeLk`
- ✅ Trigger.dev Project: `proj_abpkfxpfbfaxcouhcktr`
- ✅ Braintrust: Configurado con project ID
- ✅ OpenAI: Configurado
- ✅ Outlook: Client ID y Secret configurados
- ⚠️  **FALTA**: SUPABASE_SERVICE_ROLE_KEY

---

## 🔧 Paso Final: Obtener SUPABASE_SERVICE_ROLE_KEY

1. Ve a: https://supabase.com/dashboard/project/khwcknapjnhpxfodsahb/settings/api

2. En la sección **"Project API keys"**, copia la **service_role** key

3. Actualiza `apps/workflows/.env`:
   ```bash
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...tu_key_aqui
   ```

---

## 🚀 Comandos para Desarrollo

### Desarrollo Local

```bash
# Terminal 1: Next.js app
cd /Users/nicolasquintero/bakery-management-system
pnpm dev

# Terminal 2: Workflows
cd /Users/nicolasquintero/bakery-management-system
pnpm dev:workflows
```

### Deployment

```bash
# Deploy Next.js a Vercel
git push origin feature/monorepo-workflows

# Deploy workflows a Trigger.dev
pnpm deploy:workflows
```

---

## 📊 Verificar que todo funciona

### 1. Verificar Supabase

```sql
-- En Supabase SQL Editor
SELECT * FROM workflows.ordenes_compra LIMIT 1;
```

### 2. Exponer schema workflows

- Ve a: https://supabase.com/dashboard/project/khwcknapjnhpxfodsahb/settings/api
- En **"Exposed schemas"**, agrega `workflows`

### 3. Test Trigger.dev

```bash
cd apps/workflows
pnpm trigger:dev
```

Debería abrir el dashboard local de Trigger.dev.

---

## 🗂️ Estructura de Archivos

```
bakery-management-system/
├── apps/
│   ├── web/                          # Next.js (Puerto 3000)
│   │   ├── app/
│   │   ├── supabase/migrations/
│   │   └── .env.local
│   │
│   └── workflows/                    # Trigger.dev
│       ├── src/
│       │   ├── ordenes-compra/      # Workflow de emails
│       │   └── shared/              # Utils compartidas
│       ├── .env                     # ⚠️ Completar SERVICE_ROLE_KEY
│       └── trigger.config.ts
│
└── packages/
    └── database/                     # Tipos compartidos
        └── src/types.ts
```

---

## 📝 Próximos Pasos (Implementación)

Una vez tengas el `SUPABASE_SERVICE_ROLE_KEY`:

### Fase 4: Implementar Workflows
- [ ] Task: Outlook email sync
- [ ] Task: Email classification con OpenAI
- [ ] Task: PDF download y upload
- [ ] Task: Data extraction con GPT-4 Vision
- [ ] Task: Save to Supabase
- [ ] Main flow: Orquestar todos los tasks

### Fase 5: Frontend Dashboard
- [ ] Hook: `use-ordenes-compra.ts`
- [ ] Página: `/order-management/ordenes-compra`
- [ ] Componentes de UI
- [ ] Realtime updates

---

## 🔗 Links Útiles

- **Supabase Dashboard**: https://supabase.com/dashboard/project/khwcknapjnhpxfodsahb
- **Trigger.dev Dashboard**: https://cloud.trigger.dev/orgs/YOUR_ORG/projects/proj_abpkfxpfbfaxcouhcktr
- **Braintrust Dashboard**: https://www.braintrust.dev/app/p/a0651873-866c-4f37-a68e-cb88e574280b
- **Azure AD Apps**: https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps

---

## 📞 Troubleshooting

### Error: "function uuid_generate_v4() does not exist"
✅ **Resuelto**: Usamos `gen_random_uuid()` en la migración

### Error: "relation public.user_profiles does not exist"
✅ **Resuelto**: Simplificamos las RLS policies

### Error: "schema workflows not found"
❓ Verifica que expongas el schema en Supabase Dashboard

---

**🎊 Setup casi completo! Solo falta el SERVICE_ROLE_KEY**
