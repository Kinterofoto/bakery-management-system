# Conductor Setup Guide

Esta guía explica cómo configurar y ejecutar el proyecto Bakery Management System con Conductor para correr agentes en paralelo.

## Problema Inicial

Al ejecutar el proyecto con Conductor, se presentaban dos problemas:

1. **Dependencias faltantes**: El backend no iniciaba debido a `ModuleNotFoundError: No module named 'pydantic_settings'`
2. **Configuración de puertos**: El frontend no se conectaba al backend porque usaba puertos diferentes

## Solución

### 1. Instalación de Dependencias

Las dependencias de Python deben instalarse en el entorno virtual del proyecto original (no en el workspace de Conductor):

```bash
cd /Users/nicolasquintero/bakery-management-system/apps/api
source venv/bin/activate
pip install -r requirements.txt
```

### 2. Script de Inicio Automático

Se creó `start-dev.sh` que:

- Calcula dinámicamente el puerto del backend basado en `$CONDUCTOR_PORT`
- Actualiza automáticamente `NEXT_PUBLIC_API_URL` en `.env.local`
- Inicia el backend FastAPI en segundo plano
- Inicia el frontend Next.js
- Restaura la configuración al salir

### 3. Uso con Conductor

```bash
# Desde el directorio del workspace
./start-dev.sh
```

El script usa las siguientes variables de entorno:
- `$CONDUCTOR_PORT`: Puerto base del workspace de Conductor
- `$CONDUCTOR_ROOT_PATH`: Ruta al proyecto original (usado para acceder al venv)

## Arquitectura de Puertos

```
CONDUCTOR_PORT           = Puerto base del workspace (ej: 55010)
BACKEND_PORT             = CONDUCTOR_PORT + 1000 (ej: 56010)
FRONTEND_PORT            = 3000 (fijo)
```

## Configuración de Symlinks

Conductor crea symlinks desde el workspace al proyecto original:

```
cape-town/apps/api/.env -> /Users/nicolasquintero/bakery-management-system/apps/api/.env
cape-town/apps/web/.env.local -> /Users/nicolasquintero/bakery-management-system/apps/web/.env.local
```

El script `start-dev.sh` modifica temporalmente estos archivos y los restaura al salir.

## Verificación

Después de iniciar los servicios, verifica:

1. **Backend funcionando**:
   ```bash
   curl http://localhost:$BACKEND_PORT/health
   ```

2. **Frontend accediendo al backend correcto**:
   - Abre http://localhost:3000
   - Verifica en las DevTools → Network que las peticiones van a `http://localhost:$BACKEND_PORT`

## Troubleshooting

### El backend no inicia

**Error**: `ModuleNotFoundError`

**Solución**: Verifica que las dependencias estén instaladas en el venv correcto:
```bash
cd /Users/nicolasquintero/bakery-management-system/apps/api
source venv/bin/activate
pip list | grep pydantic-settings
```

### El frontend no conecta al backend

**Error**: Network errors en el navegador, peticiones a puerto incorrecto

**Solución**: Verifica que `NEXT_PUBLIC_API_URL` esté configurado correctamente:
```bash
grep NEXT_PUBLIC_API_URL /Users/nicolasquintero/bakery-management-system/apps/web/.env.local
```

Debería mostrar: `NEXT_PUBLIC_API_URL=http://localhost:$BACKEND_PORT`

### Restaurar configuración original

Si el script se interrumpe sin limpiar, puedes restaurar manualmente:
```bash
cd /Users/nicolasquintero/bakery-management-system/apps/web
mv .env.local.backup .env.local
```

## Referencias

- [Documentación de Conductor](https://docs.conductor.build/)
- [README del Proyecto](./README.md)
- [CLAUDE.md](./CLAUDE.md) - Guía para Claude Code
