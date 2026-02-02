#!/bin/bash

# Script de inicio para desarrollo con Conductor
# Inicia el backend FastAPI y el frontend Next.js en paralelo

set -e  # Salir si algún comando falla

# Calcular el puerto del backend basado en CONDUCTOR_PORT
BACKEND_PORT=$((CONDUCTOR_PORT + 1000))

echo "🚀 Iniciando servicios de desarrollo..."
echo "📡 Backend API: http://localhost:$BACKEND_PORT"
echo "🌐 Frontend: http://localhost:3000"
echo ""

# Actualizar .env.local con el puerto correcto
ENV_FILE="$CONDUCTOR_ROOT_PATH/apps/web/.env.local"
if [ -f "$ENV_FILE" ]; then
  # Crear respaldo
  cp "$ENV_FILE" "$ENV_FILE.backup"

  # Actualizar NEXT_PUBLIC_API_URL
  if grep -q "NEXT_PUBLIC_API_URL=" "$ENV_FILE"; then
    # Reemplazar la línea existente
    sed -i.tmp "s|NEXT_PUBLIC_API_URL=.*|NEXT_PUBLIC_API_URL=http://localhost:$BACKEND_PORT|" "$ENV_FILE"
    rm -f "$ENV_FILE.tmp"
    echo "✓ Actualizado NEXT_PUBLIC_API_URL en .env.local"
  else
    # Agregar la línea si no existe
    echo "NEXT_PUBLIC_API_URL=http://localhost:$BACKEND_PORT" >> "$ENV_FILE"
    echo "✓ Agregado NEXT_PUBLIC_API_URL a .env.local"
  fi
fi

# Función para limpiar procesos al salir
cleanup() {
  echo ""
  echo "🛑 Deteniendo servicios..."
  # Restaurar .env.local
  if [ -f "$ENV_FILE.backup" ]; then
    mv "$ENV_FILE.backup" "$ENV_FILE"
    echo "✓ Restaurado .env.local"
  fi
  # Matar procesos hijos
  jobs -p | xargs -r kill 2>/dev/null
  exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# Iniciar backend en segundo plano
echo "🔧 Iniciando backend..."
(
  cd "$CONDUCTOR_ROOT_PATH/apps/api" && \
  source venv/bin/activate && \
  uvicorn app.main:app --reload --port $BACKEND_PORT
) &

BACKEND_PID=$!

# Esperar un momento para que el backend inicie
sleep 2

# Verificar que el backend esté corriendo
if ! kill -0 $BACKEND_PID 2>/dev/null; then
  echo "❌ Error: El backend no pudo iniciar"
  exit 1
fi

echo "✓ Backend iniciado (PID: $BACKEND_PID)"

# Iniciar frontend
echo "🔧 Iniciando frontend..."
cd "$CONDUCTOR_ROOT_PATH" && pnpm dev

# Si llegamos aquí, el frontend se detuvo (no debería pasar en modo dev)
wait
