import { task } from "@trigger.dev/sdk/v3";
import { Client } from "@microsoft/microsoft-graph-client";
import { ClientSecretCredential } from "@azure/identity";

interface SubscriptionParams {
  webhookUrl: string; // URL del webhook de Trigger.dev
  userEmail?: string; // Email a monitorear (default: comercial@pastrychef.com.co)
  expirationMinutes?: number; // Minutos hasta expiración (default: 4230 = ~3 days)
}

interface GraphSubscription {
  id: string;
  resource: string;
  changeType: string;
  notificationUrl: string;
  expirationDateTime: string;
  clientState: string;
}

/**
 * Task para crear/renovar subscription de Microsoft Graph
 * Debe ejecutarse manualmente o mediante un cron para renovar antes de expirar
 */
export const setupEmailSubscription = task({
  id: "setup-email-subscription",
  run: async (params: SubscriptionParams) => {
    const {
      webhookUrl,
      userEmail = process.env.OUTLOOK_USER_EMAIL || "comercial@pastrychef.com.co",
      expirationMinutes = 4230, // Max: 4230 min (~3 days) para mailbox resources
    } = params;

    console.log("🔧 Setting up Microsoft Graph subscription...");
    console.log(`   Webhook URL: ${webhookUrl}`);
    console.log(`   User email: ${userEmail}`);

    // Initialize Microsoft Graph client
    const credential = new ClientSecretCredential(
      process.env.OUTLOOK_TENANT_ID!,
      process.env.OUTLOOK_CLIENT_ID!,
      process.env.OUTLOOK_CLIENT_SECRET!
    );

    const client = Client.initWithMiddleware({
      authProvider: {
        getAccessToken: async () => {
          const token = await credential.getToken(
            "https://graph.microsoft.com/.default"
          );
          return token.token;
        },
      },
    });

    try {
      // Calculate expiration time
      const expirationDateTime = new Date(
        Date.now() + expirationMinutes * 60 * 1000
      ).toISOString();

      // Create subscription
      const subscription: Partial<GraphSubscription> = {
        changeType: "created", // Only new messages
        notificationUrl: webhookUrl,
        resource: `/users/${userEmail}/messages`,
        expirationDateTime,
        clientState: `bakery-workflows-${Date.now()}`, // Random state for validation
      };

      console.log("📤 Creating subscription...");
      
      const result = await client
        .api("/subscriptions")
        .post(subscription);

      console.log("✅ Subscription created successfully!");
      console.log(`   Subscription ID: ${result.id}`);
      console.log(`   Expires: ${result.expirationDateTime}`);
      console.log(`   Resource: ${result.resource}`);

      // Store subscription ID for renewal (you might want to save this to DB)
      console.log("\n⚠️  IMPORTANT: Save this subscription ID to renew before expiration:");
      console.log(`   SUBSCRIPTION_ID=${result.id}`);

      return {
        success: true,
        subscription: {
          id: result.id,
          resource: result.resource,
          expirationDateTime: result.expirationDateTime,
          notificationUrl: result.notificationUrl,
        },
      };
    } catch (error: any) {
      console.error("❌ Error creating subscription:", error);
      
      if (error.statusCode === 400) {
        console.error("\n💡 Common issues:");
        console.error("   1. Webhook URL must be publicly accessible");
        console.error("   2. Webhook URL must use HTTPS");
        console.error("   3. Microsoft Graph must be able to reach the endpoint");
        console.error("   4. Check if a subscription already exists for this resource");
      }

      throw error;
    }
  },
});

/**
 * Task para renovar una subscription existente
 */
export const renewEmailSubscription = task({
  id: "renew-email-subscription",
  run: async (params: { subscriptionId: string; expirationMinutes?: number }) => {
    const { subscriptionId, expirationMinutes = 4230 } = params;

    console.log("🔄 Renewing Microsoft Graph subscription...");
    console.log(`   Subscription ID: ${subscriptionId}`);

    const credential = new ClientSecretCredential(
      process.env.OUTLOOK_TENANT_ID!,
      process.env.OUTLOOK_CLIENT_ID!,
      process.env.OUTLOOK_CLIENT_SECRET!
    );

    const client = Client.initWithMiddleware({
      authProvider: {
        getAccessToken: async () => {
          const token = await credential.getToken(
            "https://graph.microsoft.com/.default"
          );
          return token.token;
        },
      },
    });

    try {
      const expirationDateTime = new Date(
        Date.now() + expirationMinutes * 60 * 1000
      ).toISOString();

      const result = await client
        .api(`/subscriptions/${subscriptionId}`)
        .patch({ expirationDateTime });

      console.log("✅ Subscription renewed successfully!");
      console.log(`   New expiration: ${result.expirationDateTime}`);

      return {
        success: true,
        expirationDateTime: result.expirationDateTime,
      };
    } catch (error) {
      console.error("❌ Error renewing subscription:", error);
      throw error;
    }
  },
});

/**
 * Task para listar todas las subscriptions activas
 */
export const listEmailSubscriptions = task({
  id: "list-email-subscriptions",
  run: async () => {
    console.log("📋 Listing active Microsoft Graph subscriptions...");

    const credential = new ClientSecretCredential(
      process.env.OUTLOOK_TENANT_ID!,
      process.env.OUTLOOK_CLIENT_ID!,
      process.env.OUTLOOK_CLIENT_SECRET!
    );

    const client = Client.initWithMiddleware({
      authProvider: {
        getAccessToken: async () => {
          const token = await credential.getToken(
            "https://graph.microsoft.com/.default"
          );
          return token.token;
        },
      },
    });

    try {
      const result = await client.api("/subscriptions").get();

      const subscriptions = result.value || [];

      console.log(`\nFound ${subscriptions.length} subscription(s):\n`);

      subscriptions.forEach((sub: GraphSubscription, index: number) => {
        console.log(`${index + 1}. ID: ${sub.id}`);
        console.log(`   Resource: ${sub.resource}`);
        console.log(`   Expires: ${sub.expirationDateTime}`);
        console.log(`   Webhook: ${sub.notificationUrl}`);
        console.log("");
      });

      return {
        count: subscriptions.length,
        subscriptions,
      };
    } catch (error) {
      console.error("❌ Error listing subscriptions:", error);
      throw error;
    }
  },
});
