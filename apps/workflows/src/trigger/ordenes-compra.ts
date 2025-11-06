import { task } from "@trigger.dev/sdk/v3";
import { fetchOutlookEmails } from "../ordenes-compra/tasks/outlook-sync";
import { classifyEmail } from "../ordenes-compra/tasks/classify-email";
import { processPDF } from "../ordenes-compra/sub-workflows/1-pdf-processing";
import { resolveClient } from "../ordenes-compra/sub-workflows/2-client-resolution";
import { extractProducts } from "../ordenes-compra/sub-workflows/3-product-extraction";
import { createOrder } from "../ordenes-compra/sub-workflows/4-order-creation";

export const ordenesCompraWorkflow = task({
  id: "ordenes-compra-workflow",
  run: async (payload: { timestamp?: string }, { ctx }) => {
    console.log("🚀 Starting Órdenes de Compra Workflow");
    console.log("Timestamp:", payload.timestamp || new Date().toISOString());

    try {
      // Step 1: Fetch unread emails from Outlook
      console.log("📧 Fetching emails...");
      const emailsHandle = await fetchOutlookEmails.triggerAndWait();
      const emailsResult = emailsHandle;
      
      if (!emailsResult.ok) {
        throw new Error(`Failed to fetch emails: ${emailsResult.error}`);
      }
      
      const emails = emailsResult.output;

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
          const classificationHandle = await classifyEmail.triggerAndWait({ email });
          const classificationResult = classificationHandle;
          
          if (!classificationResult.ok) {
            throw new Error(`Classification failed: ${classificationResult.error}`);
          }
          
          const classification = classificationResult.output;

          if (classification.category !== "Orden de compra") {
            console.log(`⏭️  Skipping: Not a purchase order (${classification.category})`);
            results.skipped++;
            continue;
          }

          console.log("✅ Classified as: Orden de compra");

          // Step 2.2: Process PDF
          console.log("📄 Processing PDF...");
          const pdfHandle = await processPDF.triggerAndWait({ email });
          const pdfResultTask = pdfHandle;
          
          if (!pdfResultTask.ok) {
            throw new Error(`PDF processing failed: ${pdfResultTask.error}`);
          }
          
          const pdfResult = pdfResultTask.output;

          // Si no hay PDF, usar el bodyPreview del email como texto
          const extractedText = pdfResult 
            ? pdfResult.extractedText 
            : email.bodyPreview;
          
          const pdfUrl = pdfResult?.pdfUrl || "";

          if (pdfResult) {
            console.log(`✅ PDF processed: ${pdfResult.pdfFilename}`);
            console.log(`   Text length: ${pdfResult.extractedText.length} chars`);
          } else {
            console.log("ℹ️  No PDF found, using email body as text");
            console.log(`   Text length: ${extractedText.length} chars`);
          }

          // Step 2.3: Resolve client
          console.log("🔍 Resolving client...");
          const clientHandle = await resolveClient.triggerAndWait({
            extractedText,
            emailId: email.id,
            pdfUrl,
          });
          const clientResultTask = clientHandle;
          
          if (!clientResultTask.ok) {
            throw new Error(`Client resolution failed: ${clientResultTask.error}`);
          }
          
          const clientResult = clientResultTask.output;

          console.log(`✅ Client resolved: ${clientResult.clientName}`);
          console.log(`   Branch: ${clientResult.branchName}`);
          console.log(`   Confidence: ${(clientResult.confidence * 100).toFixed(1)}%`);
          console.log(`   OC Number: ${clientResult.ocNumber}`);

          // Step 2.4: Extract products
          console.log("🛒 Extracting products...");
          const productsHandle = await extractProducts.triggerAndWait({
            extractedText,
            clientId: clientResult.clientId,
            emailId: email.id,
          });
          const productsResultTask = productsHandle;
          
          if (!productsResultTask.ok) {
            throw new Error(`Product extraction failed: ${productsResultTask.error}`);
          }
          
          const productsResult = productsResultTask.output;

          console.log(`✅ Products extracted: ${productsResult.products.length}`);
          console.log(`   Average confidence: ${(productsResult.averageConfidence * 100).toFixed(1)}%`);
          
          productsResult.products.forEach((p: any, i: number) => {
            console.log(`   ${i + 1}. ${p.productName} - ${p.quantity} ${p.unit}`);
          });

          // Step 2.5: Create order
          console.log("💾 Creating order...");
          const orderHandle = await createOrder.triggerAndWait({
            emailId: email.id,
            pdfUrl,
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
              ...(pdfResult ? [pdfResult.braintrustLogId] : []),
              clientResult.braintrustLogId,
              productsResult.braintrustLogId,
            ],
          });
          const orderResultTask = orderHandle;
          
          if (!orderResultTask.ok) {
            throw new Error(`Order creation failed: ${orderResultTask.error}`);
          }
          
          const orderResult = orderResultTask.output;

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
