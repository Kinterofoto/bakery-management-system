#!/bin/bash

# Script para configurar Outlook API con Azure CLI
# Ejecutar desde: bakery-management-system/

set -e

echo "🚀 Setup de Outlook API para Bakery Workflows"
echo "=============================================="
echo ""

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verificar que Azure CLI está instalado
if ! command -v az &> /dev/null; then
    echo -e "${RED}❌ Error: Azure CLI no está instalado${NC}"
    echo "Instala con: brew install azure-cli"
    exit 1
fi

echo -e "${GREEN}✅ Azure CLI instalado${NC}"
echo ""

# Login en Azure
echo -e "${BLUE}📝 Paso 1: Login en Azure${NC}"
echo "Se abrirá un navegador para autenticarte..."
az login

echo ""
echo -e "${GREEN}✅ Login exitoso${NC}"
echo ""

# Crear App Registration
echo -e "${BLUE}📝 Paso 2: Crear App Registration${NC}"
APP_JSON=$(az ad app create \
  --display-name "Bakery Workflows Outlook" \
  --sign-in-audience AzureADMyOrg \
  --output json)

APP_ID=$(echo $APP_JSON | jq -r '.appId')
echo -e "${GREEN}✅ App creada con ID: $APP_ID${NC}"
echo ""

# Crear Client Secret
echo -e "${BLUE}📝 Paso 3: Crear Client Secret${NC}"
SECRET_JSON=$(az ad app credential reset \
  --id $APP_ID \
  --append \
  --display-name "BakeryWorkflowsSecret" \
  --output json)

CLIENT_SECRET=$(echo $SECRET_JSON | jq -r '.password')
TENANT_ID=$(echo $SECRET_JSON | jq -r '.tenant')
echo -e "${GREEN}✅ Secret creado${NC}"
echo ""

# Agregar permisos
echo -e "${BLUE}📝 Paso 4: Agregar permisos de Microsoft Graph${NC}"
az ad app permission add \
  --id $APP_ID \
  --api 00000003-0000-0000-c000-000000000000 \
  --api-permissions 810c84a8-4a9e-49e8-ab35-ee3f8e72f9b4=Role

az ad app permission add \
  --id $APP_ID \
  --api 00000003-0000-0000-c000-000000000000 \
  --api-permissions e2a3a72e-5f79-4c64-b1b1-878b674786c9=Role

echo -e "${GREEN}✅ Permisos agregados (Mail.Read, Mail.ReadWrite)${NC}"
echo ""

# Grant Admin Consent
echo -e "${BLUE}📝 Paso 5: Grant Admin Consent${NC}"
echo -e "${YELLOW}⚠️  Este paso requiere permisos de administrador${NC}"
if az ad app permission admin-consent --id $APP_ID 2>/dev/null; then
    echo -e "${GREEN}✅ Admin consent granted${NC}"
else
    echo -e "${RED}❌ No tienes permisos de admin${NC}"
    echo -e "${YELLOW}⚠️  Pídele a un admin que ejecute:${NC}"
    echo "   az ad app permission admin-consent --id $APP_ID"
fi
echo ""

# Crear archivo .env
echo -e "${BLUE}📝 Paso 6: Crear archivo .env${NC}"
ENV_FILE="apps/workflows/.env"

cat > $ENV_FILE << EOF
# Trigger.dev
TRIGGER_SECRET_KEY=tr_dev_YOUR_KEY_HERE

# Supabase (copiar de apps/web/.env.local)
NEXT_PUBLIC_SUPABASE_URL=https://khwcknapjnhpxfodsahb.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY_HERE

# Braintrust
BRAINTRUST_API_KEY=YOUR_BRAINTRUST_KEY_HERE

# OpenAI
OPENAI_API_KEY=YOUR_OPENAI_KEY_HERE

# Outlook/Microsoft Graph
OUTLOOK_CLIENT_ID=$APP_ID
OUTLOOK_CLIENT_SECRET=$CLIENT_SECRET
OUTLOOK_TENANT_ID=$TENANT_ID
OUTLOOK_USER_EMAIL=comercial@pastrychef.com.co
EOF

echo -e "${GREEN}✅ Archivo .env creado en $ENV_FILE${NC}"
echo ""

# Resumen
echo "=============================================="
echo -e "${GREEN}🎉 Setup completado!${NC}"
echo "=============================================="
echo ""
echo "📋 Credenciales guardadas:"
echo -e "   ${BLUE}CLIENT_ID:${NC} $APP_ID"
echo -e "   ${BLUE}TENANT_ID:${NC} $TENANT_ID"
echo -e "   ${BLUE}CLIENT_SECRET:${NC} ${YELLOW}[GUARDADO EN .env]${NC}"
echo ""
echo "📝 Próximos pasos:"
echo "   1. Edita $ENV_FILE y completa:"
echo "      - TRIGGER_SECRET_KEY"
echo "      - SUPABASE_SERVICE_ROLE_KEY"
echo "      - BRAINTRUST_API_KEY"
echo "      - OPENAI_API_KEY"
echo ""
echo "   2. Verifica que el admin consent fue granted"
echo "      Si no, pide a un admin que ejecute:"
echo "      az ad app permission admin-consent --id $APP_ID"
echo ""
echo "   3. Ejecuta los workflows:"
echo "      cd apps/workflows"
echo "      pnpm trigger:dev"
echo ""
echo -e "${GREEN}✨ Todo listo para empezar!${NC}"
