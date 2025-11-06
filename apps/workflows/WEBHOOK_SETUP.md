# Configuración de Webhooks para Órdenes de Compra

Este documento explica cómo configurar webhooks de Microsoft Graph para procesar emails en tiempo real.

## 🚀 Flujo de Webhooks

```
Email llega → Microsoft Graph → Webhook (Trigger.dev) → Workflow → Procesa Orden
```

## 📋 Pasos de Configuración

### 1. Desplegar el Workflow a Trigger.dev (Producción)

Primero necesitas desplegar a producción para obtener una URL pública del webhook:

```bash
cd apps/workflows
npx trigger.dev@latest deploy
```

Esto creará tu workflow en producción y te dará URLs públicas.

### 2. Obtener la URL del Webhook

Después del deploy, ve a tu dashboard de Trigger.dev:
- https://cloud.trigger.dev/projects/proj_abpkfxpfbfaxcouhcktr

Busca el task `email-webhook-handler` y copia su webhook URL. Debería verse así:
```
https://api.trigger.dev/api/v1/webhooks/<tu-endpoint-id>
```

### 3. Configurar la Subscription de Microsoft Graph

Opción A - Desde Trigger.dev Dashboard:

1. Ve al dashboard de Trigger.dev
2. Busca el task `setup-email-subscription`
3. Click en "Test" o "Run"
4. Proporciona el payload:
```json
{
  "webhookUrl": "https://api.trigger.dev/api/v1/webhooks/<tu-endpoint-id>",
  "userEmail": "comercial@pastrychef.com.co"
}
```

Opción B - Desde código (desarrollo local):

```typescript
import { setupEmailSubscription } from "./src/trigger/setup-email-subscription";

await setupEmailSubscription.trigger({
  webhookUrl: "https://tu-webhook-url.trigger.dev",
  userEmail: "comercial@pastrychef.com.co",
});
```

### 4. Guardar el Subscription ID

Cuando se cree la subscription, **guarda el ID** que te retorna. Lo necesitarás para renovar:

```bash
# Agregar al .env
GRAPH_SUBSCRIPTION_ID=tu-subscription-id-aqui
```

## 🔄 Renovación de Subscriptions

Las subscriptions de Microsoft Graph expiran después de 3 días (4230 minutos).

### Renovar manualmente:

Desde el dashboard de Trigger.dev, ejecuta `renew-email-subscription`:

```json
{
  "subscriptionId": "tu-subscription-id",
  "expirationMinutes": 4230
}
```

### Renovar automáticamente (recomendado):

Crea un scheduled task que renueve cada 2 días:

```typescript
import { schedules } from "@trigger.dev/sdk/v3";
import { renewEmailSubscription } from "./setup-email-subscription";

export const renewSubscriptionSchedule = schedules.create({
  task: renewEmailSubscription.id,
  cron: "0 0 */2 * *", // Cada 2 días a medianoche
  deduplicationKey: "renew-email-subscription",
});
```

## 🧪 Testing en Desarrollo

Para testing local, necesitas exponer tu localhost con un túnel:

```bash
# Opción 1: ngrok
ngrok http 3000

# Opción 2: Trigger.dev dev (ya incluye túnel)
npx trigger.dev@latest dev
```

Luego usa la URL pública del túnel para crear la subscription.

## 📊 Verificar Subscriptions Activas

Para ver todas las subscriptions:

```bash
# Ejecuta el task desde el dashboard
list-email-subscriptions
```

O desde CLI:

```bash
az rest --method GET --uri "https://graph.microsoft.com/v1.0/subscriptions"
```

## ⚠️ Troubleshooting

### Error: "Subscription validation request failed"

Microsoft Graph no puede alcanzar tu webhook URL. Verifica:
- ✅ URL es pública y accesible desde internet
- ✅ URL usa HTTPS
- ✅ Firewall permite conexiones de Microsoft (52.244.*, 40.125.*, etc.)

### Error: "Permission denied"

Verifica que el app tiene permisos **Application** (no Delegated):
- Mail.Read
- Mail.ReadWrite

Y que el admin consent está otorgado.

### Subscription expiró

Las subscriptions expiran. Si ves que no llegan webhooks:

1. Listar subscriptions activas
2. Si no hay ninguna o expiró, crear nueva
3. Configurar auto-renovación

## 📝 Notas

- **Máximo de subscriptions**: 1000 por app
- **Duración máxima**: 4230 minutos (~3 días) para mailbox resources
- **Reintentos**: Microsoft Graph reintenta hasta 4 veces si el webhook falla
- **Validación**: El primer request es una validación (debes retornar el validationToken)

## 🔗 Referencias

- [Microsoft Graph Subscriptions](https://learn.microsoft.com/en-us/graph/api/subscription-post-subscriptions)
- [Webhook Notifications](https://learn.microsoft.com/en-us/graph/webhooks)
- [Trigger.dev Webhooks](https://trigger.dev/docs/v3/webhooks)
