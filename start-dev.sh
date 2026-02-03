#!/bin/bash

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuración de puertos
BACKEND_PORT=$((CONDUCTOR_PORT + 1000))
FRONTEND_PORT=${FRONTEND_PORT:-3000}

echo -e "${BLUE}🚀 Iniciando servicios de desarrollo...${NC}"
echo -e "${BLUE}📡 Backend API: http://localhost:${BACKEND_PORT}${NC}"
echo -e "${BLUE}🌐 Frontend: http://localhost:${FRONTEND_PORT}${NC}"
echo ""

# Paths
ENV_FILE="apps/web/.env.local"

# Resolver symlink si existe
if [ -L "$ENV_FILE" ]; then
    ENV_FILE_REAL=$(readlink "$ENV_FILE")
else
    ENV_FILE_REAL="$ENV_FILE"
fi

ENV_BACKUP="${ENV_FILE_REAL}.backup"

# Función de limpieza
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Deteniendo servicios...${NC}"

    # Matar procesos hijos
    pkill -P $$

    # Restaurar .env.local
    if [ -f "$ENV_BACKUP" ]; then
        mv "$ENV_BACKUP" "$ENV_FILE_REAL"
        echo -e "${GREEN}✓ Restaurado .env.local${NC}"
    fi

    exit 0
}

# Configurar trap para limpieza
trap cleanup SIGINT SIGTERM EXIT

# Backup y actualizar .env.local
if [ -f "$ENV_FILE" ] || [ -f "$ENV_FILE_REAL" ]; then
    cp "$ENV_FILE_REAL" "$ENV_BACKUP"

    # Actualizar NEXT_PUBLIC_API_URL
    if grep -q "NEXT_PUBLIC_API_URL=" "$ENV_FILE_REAL"; then
        # Usar # como delimitador para evitar problemas con / en URLs
        sed -i.tmp "s#NEXT_PUBLIC_API_URL=.*#NEXT_PUBLIC_API_URL=http://localhost:${BACKEND_PORT}#" "$ENV_FILE_REAL"
        rm -f "${ENV_FILE_REAL}.tmp"
    else
        echo "NEXT_PUBLIC_API_URL=http://localhost:${BACKEND_PORT}" >> "$ENV_FILE_REAL"
    fi

    echo -e "${GREEN}✓ Actualizado NEXT_PUBLIC_API_URL en .env.local${NC}"
else
    echo -e "${YELLOW}⚠ No se encontró $ENV_FILE${NC}"
fi

# Iniciar backend
echo -e "${BLUE}🔧 Iniciando backend...${NC}"

# Verificar si existe el virtual environment
if [ -f "apps/api/venv/bin/activate" ]; then
    source apps/api/venv/bin/activate
elif [ -f "$CONDUCTOR_ROOT_PATH/apps/api/venv/bin/activate" ]; then
    source "$CONDUCTOR_ROOT_PATH/apps/api/venv/bin/activate"
else
    echo -e "${YELLOW}⚠ No se encontró virtual environment, ejecutando sin activar${NC}"
fi

cd apps/api
uvicorn app.main:app --reload --port "$BACKEND_PORT" &
BACKEND_PID=$!
cd ../..

# Esperar a que el backend inicie
sleep 2

if ps -p $BACKEND_PID > /dev/null; then
    echo -e "${GREEN}✓ Backend iniciado (PID: $BACKEND_PID)${NC}"
else
    echo -e "${YELLOW}⚠ El backend podría no haber iniciado correctamente${NC}"
fi

# Iniciar frontend
echo -e "${BLUE}🔧 Iniciando frontend...${NC}"
pnpm dev

# El script esperará aquí hasta que se interrumpa (Ctrl+C)
wait
