import { schedules } from "@trigger.dev/sdk/v3";
import { fetchOutlookEmails } from "./tasks/outlook-sync";
import { classifyEmail } from "./tasks/classify-email";
import { processPDF } from "./sub-workflows/1-pdf-processing";
import { resolveClient } from "./sub-workflows/2-client-resolution";
import { extractProducts } from "./sub-workflows/3-product-extraction";
import { createOrder } from "./sub-workflows/4-order-creation";

export const ordenesCompraWorkflow = schedules.task({
  id: "ordenes-compra-workflow",
  // Run every minute
  cron: "* * * * *",
  run: async (payload, { ctx }) => {
    console.log("🚀 Starting Órdenes de Compra Workflow");
    console.log("Timestamp:", new Date().toISOString());

    try {
      // Step 1: Fetch unread emails from Outlook
      console.log("📧 Fetching emails...");
      const emails = await fetchOutlookEmails.triggerAndWait({});

      if (!emails || emails.length === 0) {
        console.log("✅ No new emails to process");
        return { 
          success: true, 
          message: "No new emails",
          processedCount: 0,
        };
      }

      console.log(`📬 Found ${emails.length} emails to process`);

      const results = {
        total: emails.length,
        processed: 0,
        skipped: 0,
        errors: 0,
        orders: [] as string[],
      };

      // Step 2: Process each email
      for (const email of emails) {
        console.log(`\n📨 Processing email: ${email.subject}`);
        console.log(`   From: ${email.from}`);

        try {
          // Step 2.1: Classify email
          const classification = await classifyEmail.triggerAndWait({ email });

          if (classification.category !== "Orden de compra") {
            console.log(`⏭️  Skipping: Not a purchase order (${classification.category})`);
            results.skipped++;
            continue;
          }

          console.log("✅ Classified as: Orden de compra");

          // Step 2.2: Process PDF
          console.log("📄 Processing PDF...");
          const pdfResult = await processPDF.triggerAndWait({ email });

          if (!pdfResult) {
            console.log("⚠️  No PDF found, skipping");
            results.skipped++;
            continue;
          }

          console.log(`✅ PDF processed: ${pdfResult.pdfFilename}`);
          console.log(`   Text length: ${pdfResult.extractedText.length} chars`);

          // Step 2.3: Resolve client
          console.log("🔍 Resolving client...");
          const clientResult = await resolveClient.triggerAndWait({
            extractedText: pdfResult.extractedText,
            emailId: email.id,
            pdfUrl: pdfResult.pdfUrl,
          });

          console.log(`✅ Client resolved: ${clientResult.clientName}`);
          console.log(`   Branch: ${clientResult.branchName}`);
          console.log(`   Confidence: ${(clientResult.confidence * 100).toFixed(1)}%`);
          console.log(`   OC Number: ${clientResult.ocNumber}`);

          // Step 2.4: Extract products
          console.log("🛒 Extracting products...");
          const productsResult = await extractProducts.triggerAndWait({
            extractedText: pdfResult.extractedText,
            clientId: clientResult.clientId,
            emailId: email.id,
          });

          console.log(`✅ Products extracted: ${productsResult.products.length}`);
          console.log(`   Average confidence: ${(productsResult.averageConfidence * 100).toFixed(1)}%`);
          
          productsResult.products.forEach((p, i) => {
            console.log(`   ${i + 1}. ${p.productName} - ${p.quantity} ${p.unit}`);
          });

          // Step 2.5: Create order
          console.log("💾 Creating order...");
          const orderResult = await createOrder.triggerAndWait({
            emailId: email.id,
            pdfUrl: pdfResult.pdfUrl,
            clientId: clientResult.clientId,
            clientName: clientResult.clientName,
            branchId: clientResult.branchId,
            branchName: clientResult.branchName,
            ocNumber: clientResult.ocNumber,
            orderDate: clientResult.orderDate,
            orderValue: clientResult.orderValue,
            observations: clientResult.observations,
            products: productsResult.products,
            braintrustLogIds: [
              classification.braintrustLogId,
              pdfResult.braintrustLogId,
              clientResult.braintrustLogId,
              productsResult.braintrustLogId,
            ],
          });

          console.log(`✅ Order created: ${orderResult.orderNumber}`);
          console.log(`   Order ID: ${orderResult.orderId}`);

          results.processed++;
          results.orders.push(orderResult.orderNumber);

          console.log(`\n🎉 Email processed successfully!`);
          console.log(`   📊 Braintrust logs: 4 steps tracked`);
          console.log(`   🔗 Order: ${orderResult.orderNumber}`);

        } catch (error) {
          console.error(`❌ Error processing email ${email.id}:`, error);
          results.errors++;
        }
      }

      // Summary
      console.log("\n" + "=".repeat(60));
      console.log("📊 WORKFLOW SUMMARY");
      console.log("=".repeat(60));
      console.log(`Total emails: ${results.total}`);
      console.log(`✅ Processed: ${results.processed}`);
      console.log(`⏭️  Skipped: ${results.skipped}`);
      console.log(`❌ Errors: ${results.errors}`);
      
      if (results.orders.length > 0) {
        console.log(`\n📦 Orders created:`);
        results.orders.forEach((order) => console.log(`   - ${order}`));
      }

      console.log("=".repeat(60));

      return {
        success: true,
        ...results,
      };

    } catch (error) {
      console.error("❌ Workflow failed:", error);
      throw error;
    }
  },
});
