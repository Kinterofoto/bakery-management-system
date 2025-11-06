import { task, logger } from "@trigger.dev/sdk/v3";
import { Client } from "@microsoft/microsoft-graph-client";
import { ClientSecretCredential } from "@azure/identity";
import type { OutlookEmail } from "@bakery/database";

interface OutlookMessage {
  id: string;
  subject: string;
  from: { emailAddress: { address: string } };
  bodyPreview: string;
  receivedDateTime: string;
  hasAttachments: boolean;
}

export const fetchOutlookEmails = task({
  id: "fetch-outlook-emails",
  retry: {
    maxAttempts: 3,
    factor: 2,
  },
  run: async (): Promise<OutlookEmail[]> => {
    logger.info("Fetching new emails from Outlook");

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
      // Fetch unread emails from the last 7 days (for testing)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      
      const response = await client
        .api(`/users/${process.env.OUTLOOK_USER_EMAIL}/messages`)
        .filter(`receivedDateTime ge ${sevenDaysAgo}`)
        .select("id,subject,from,bodyPreview,receivedDateTime,hasAttachments")
        .top(50)
        .get();

      const messages: OutlookMessage[] = response.value || [];
      
      logger.info(`Found ${messages.length} unread emails`);

      // Transform to our format
      const emails: OutlookEmail[] = messages.map((msg) => ({
        id: msg.id,
        subject: msg.subject || "",
        from: msg.from?.emailAddress?.address || "",
        bodyPreview: msg.bodyPreview || "",
        receivedDateTime: msg.receivedDateTime,
        hasAttachments: msg.hasAttachments,
      }));

      return emails;
    } catch (error) {
      logger.error("Error fetching emails", { error });
      throw error;
    }
  },
});
