import { task } from "@trigger.dev/sdk/v3";
import { ordenesCompraWorkflow } from "./ordenes-compra";

interface MicrosoftGraphNotification {
  subscriptionId: string;
  subscriptionExpirationDateTime: string;
  changeType: string;
  resource: string;
  resourceData?: {
    "@odata.type": string;
    "@odata.id": string;
    "@odata.etag": string;
    id: string;
  };
  clientState?: string;
}

interface WebhookPayload {
  validationToken?: string; // For initial webhook validation
  value?: MicrosoftGraphNotification[];
}

/**
 * Webhook endpoint para recibir notificaciones de Microsoft Graph
 * cuando llegan nuevos emails
 */
export const emailWebhookHandler = task({
  id: "email-webhook-handler",
  run: async (payload: WebhookPayload, { ctx }) => {
    console.log("📨 Webhook received from Microsoft Graph");

    // Step 1: Handle validation request (first-time setup)
    if (payload.validationToken) {
      console.log("✅ Webhook validation request received");
      console.log("Validation token:", payload.validationToken);
      
      // Microsoft Graph requires the validation token to be returned
      // This is handled automatically by Trigger.dev
      return {
        validationToken: payload.validationToken,
      };
    }

    // Step 2: Process notification
    if (!payload.value || payload.value.length === 0) {
      console.log("⚠️  No notifications in payload");
      return { processed: 0 };
    }

    console.log(`📬 Received ${payload.value.length} notification(s)`);

    // Step 3: Trigger the main workflow for each notification
    const results = [];
    
    for (const notification of payload.value) {
      console.log(`\n🔔 Processing notification:`);
      console.log(`   Change type: ${notification.changeType}`);
      console.log(`   Resource: ${notification.resource}`);
      
      // Only process "created" events (new emails)
      if (notification.changeType === "created") {
        try {
          // Trigger the main workflow
          const handle = await ordenesCompraWorkflow.triggerAndWait({
            timestamp: new Date().toISOString(),
          });

          if (handle.ok) {
            console.log("✅ Workflow triggered successfully");
            results.push({
              notificationId: notification.subscriptionId,
              success: true,
              result: handle.output,
            });
          } else {
            console.error("❌ Workflow failed:", handle.error);
            results.push({
              notificationId: notification.subscriptionId,
              success: false,
              error: handle.error,
            });
          }
        } catch (error) {
          console.error("❌ Error triggering workflow:", error);
          results.push({
            notificationId: notification.subscriptionId,
            success: false,
            error: String(error),
          });
        }
      } else {
        console.log(`⏭️  Skipping: Not a 'created' event`);
      }
    }

    return {
      processed: results.length,
      results,
    };
  },
});
