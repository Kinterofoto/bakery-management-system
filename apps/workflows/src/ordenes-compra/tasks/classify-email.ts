import { task, logger } from "@trigger.dev/sdk/v3";
import { openai } from "@/shared/lib/openai";
import { logEmailClassification } from "@/shared/lib/braintrust";
import { CLASSIFICATION_PROMPT } from "../lib/prompts";
import type { OutlookEmail } from "@bakery/database";

interface ClassificationResult {
  category: "Orden de compra" | "Otro";
  braintrustLogId: string;
  confidence: number;
}

export const classifyEmail = task({
  id: "classify-email",
  retry: {
    maxAttempts: 2,
    factor: 1.5,
  },
  run: async (payload: { email: OutlookEmail }): Promise<ClassificationResult> => {
    const { email } = payload;
    const input = `${email.subject}\n\n${email.bodyPreview}`;

    logger.info("Classifying email", { emailId: email.id, subject: email.subject });

    const startTime = Date.now();
    
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: CLASSIFICATION_PROMPT },
          { role: "user", content: input },
        ],
        temperature: 0.1,
      });

      const duration = Date.now() - startTime;
      const output = response.choices[0].message.content?.trim() || "Otro";
      
      // Normalize category
      const category = output.includes("Orden de compra") 
        ? "Orden de compra" 
        : "Otro";

      // Log to Braintrust
      const braintrustLogId = await logEmailClassification({
        input,
        output: category,
        metadata: {
          emailId: email.id,
          emailFrom: email.from,
          emailSubject: email.subject,
          model: "gpt-4o-mini",
          duration,
          promptTokens: response.usage?.prompt_tokens,
          completionTokens: response.usage?.completion_tokens,
        },
      });

      logger.info("Email classified", { 
        category, 
        braintrustLogId,
        duration 
      });

      return {
        category,
        braintrustLogId,
        confidence: 0.9, // Could extract from OpenAI response if needed
      };
    } catch (error) {
      logger.error("Error classifying email", { error, emailId: email.id });
      throw error;
    }
  },
});
