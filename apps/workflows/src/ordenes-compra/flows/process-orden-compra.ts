import { task } from "@trigger.dev/sdk/v3";

// TODO: Implementar el workflow completo
// Este es un placeholder para la estructura básica

export const processOrdenCompra = task({
  id: "process-orden-compra",
  run: async (payload: { emailId: string }, { ctx }) => {
    console.log("Processing orden de compra for email:", payload.emailId);
    
    // TODO: Implementar los siguientes pasos:
    // 1. Fetch email from Outlook
    // 2. Classify email con OpenAI
    // 3. Download PDF attachments
    // 4. Upload to Supabase Storage
    // 5. Extract data con OpenAI Vision
    // 6. Save to database
    
    return {
      success: true,
      message: "Placeholder - workflow not yet implemented"
    };
  },
});
