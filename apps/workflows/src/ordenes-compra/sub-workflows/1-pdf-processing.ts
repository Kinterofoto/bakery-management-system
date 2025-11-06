import { task, logger } from "@trigger.dev/sdk/v3";
import { downloadPDFAttachments } from "../tasks/download-pdf";
import { uploadPDFToSupabase } from "../tasks/upload-supabase";
import { openai } from "@/shared/lib/openai";
import { bt } from "@/shared/lib/braintrust";
import type { OutlookEmail } from "@bakery/database";

interface PDFProcessingResult {
  pdfUrl: string;
  pdfFilename: string;
  extractedText: string;
  openaiFileId: string;
  braintrustLogId: string;
}

export const processPDF = task({
  id: "process-pdf",
  retry: {
    maxAttempts: 2,
  },
  run: async (payload: { email: OutlookEmail }): Promise<PDFProcessingResult | null> => {
    const { email } = payload;

    logger.info("Starting PDF processing sub-workflow", { emailId: email.id });

    // Step 1: Download PDFs
    const pdfs = await downloadPDFAttachments.triggerAndWait({ email });

    if (!pdfs || pdfs.length === 0) {
      logger.warn("No PDF attachments found", { emailId: email.id });
      return null;
    }

    const pdf = pdfs[0]; // Process first PDF only

    // Step 2: Upload to Supabase Storage
    const uploaded = await uploadPDFToSupabase.triggerAndWait({ 
      pdf, 
      emailId: email.id 
    });

    // Step 3: Upload to OpenAI Files API
    logger.info("Uploading PDF to OpenAI", { filename: uploaded.filename });
    
    const file = await openai.files.create({
      file: new File([pdf.data], uploaded.filename, { type: "application/pdf" }),
      purpose: "assistants",
    });

    // Step 4: Extract text using OpenAI
    logger.info("Extracting text from PDF", { fileId: file.id });

    const startTime = Date.now();
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extrae TODO el texto de este PDF y devuélvelo sin modificaciones. NO lo analices, solo extrae el texto completo.",
            },
            {
              type: "image_url",
              image_url: {
                url: `data:application/pdf;base64,${pdf.data.toString('base64')}`,
              },
            },
          ],
        },
      ],
    });

    const duration = Date.now() - startTime;
    const extractedText = response.choices[0].message.content || "";

    // Step 5: Log to Braintrust
    const braintrustLogId = await bt.log({
      input: { pdfUrl: uploaded.url, filename: uploaded.filename },
      output: { textLength: extractedText.length, fileId: file.id },
      metadata: {
        emailId: email.id,
        step: "pdf-text-extraction",
        model: "gpt-4o",
        duration,
        promptTokens: response.usage?.prompt_tokens,
        completionTokens: response.usage?.completion_tokens,
      },
    });

    logger.info("PDF processing completed", {
      textLength: extractedText.length,
      braintrustLogId: braintrustLogId.id,
    });

    return {
      pdfUrl: uploaded.url,
      pdfFilename: uploaded.filename,
      extractedText,
      openaiFileId: file.id,
      braintrustLogId: braintrustLogId.id,
    };
  },
});
