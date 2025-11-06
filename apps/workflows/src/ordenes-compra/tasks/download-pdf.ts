import { task, logger } from "@trigger.dev/sdk/v3";
import { Client } from "@microsoft/microsoft-graph-client";
import { ClientSecretCredential } from "@azure/identity";
import type { OutlookEmail } from "@bakery/database";

interface PDFAttachment {
  id: string;
  name: string;
  contentType: string;
  data: Buffer;
}

export const downloadPDFAttachments = task({
  id: "download-pdf-attachments",
  retry: {
    maxAttempts: 3,
    factor: 2,
  },
  run: async (payload: { email: OutlookEmail }): Promise<PDFAttachment[]> => {
    const { email } = payload;

    logger.info("Downloading PDF attachments", { emailId: email.id });

    if (!email.hasAttachments) {
      logger.info("Email has no attachments", { emailId: email.id });
      return [];
    }

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
      // Get all attachments
      const attachmentsResponse = await client
        .api(`/users/${process.env.OUTLOOK_USER_EMAIL}/messages/${email.id}/attachments`)
        .get();

      const attachments = attachmentsResponse.value || [];
      
      logger.info(`Found ${attachments.length} attachments`);

      // Filter PDFs
      const pdfAttachments: PDFAttachment[] = [];

      for (const attachment of attachments) {
        const contentType = attachment.contentType?.toLowerCase() || "";
        const name = attachment.name || "";

        // Check if it's a PDF
        const isPDF =
          contentType === "application/pdf" ||
          contentType === "application/octet-stream" ||
          name.toLowerCase().endsWith(".pdf");

        if (isPDF && attachment.contentBytes) {
          logger.info(`Downloading PDF: ${name}`);

          pdfAttachments.push({
            id: attachment.id,
            name: name,
            contentType: attachment.contentType,
            data: Buffer.from(attachment.contentBytes, "base64"),
          });
        }
      }

      logger.info(`Downloaded ${pdfAttachments.length} PDF attachments`);

      return pdfAttachments;
    } catch (error) {
      logger.error("Error downloading attachments", { error, emailId: email.id });
      throw error;
    }
  },
});
