import { task, logger } from "@trigger.dev/sdk/v3";
import { openai } from "@/shared/lib/openai";
import { supabase } from "@/shared/lib/supabase";
import { bt } from "@/shared/lib/braintrust";
import { EXTRACTION_PROMPT } from "../lib/prompts";

interface ClientResolutionInput {
  extractedText: string;
  emailId: string;
  pdfUrl: string;
}

interface ClientResolutionResult {
  clientId: string | null;
  clientName: string;
  branchId: string | null;
  branchName: string;
  confidence: number;
  braintrustLogId: string;
  orderDate: string;
  orderValue: number | null;
  observations: string;
  ocNumber: string;
}

export const resolveClient = task({
  id: "resolve-client",
  retry: {
    maxAttempts: 2,
  },
  run: async (payload: ClientResolutionInput): Promise<ClientResolutionResult> => {
    const { extractedText, emailId, pdfUrl } = payload;

    logger.info("Starting client resolution sub-workflow", { emailId });

    // Step 1: RAG Query - Get similar clients from vector store
    logger.info("Querying client vector store");
    
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: extractedText.substring(0, 8000), // Limit for embeddings
    });

    const embedding = embeddingResponse.data[0].embedding;

    // Query Supabase vector store using existing clientes_rag table
    const { data: similarClients, error: vectorError } = await supabase.rpc(
      "match_clientes_rag",
      {
        query_embedding: embedding,
        match_threshold: 0.7,
        match_count: 5,
      }
    );

    if (vectorError) {
      logger.error("Error querying vector store", { error: vectorError });
    }

    // Step 2: Use OpenAI to extract client info + match with RAG results
    const clientContext = similarClients
      ? `Posibles clientes encontrados:\n${similarClients.map((c: any) => `- ${c.nombre} (ID: ${c.id})`).join("\n")}`
      : "No se encontraron clientes similares en la base de datos.";

    const startTime = Date.now();

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: EXTRACTION_PROMPT + `\n\nContexto de clientes:\n${clientContext}`,
        },
        {
          role: "user",
          content: extractedText,
        },
      ],
      temperature: 0.1,
      response_format: { type: "json_object" },
    });

    const duration = Date.now() - startTime;
    const extractedData = JSON.parse(response.choices[0].message.content || "{}");

    // Step 3: Match extracted client name with database
    let clientId: string | null = null;
    let confidence = 0.5;

    if (extractedData.cliente && similarClients && similarClients.length > 0) {
      // Simple fuzzy matching (you could use a library like fuzzball)
      const matchedClient = similarClients.find(
        (c: any) =>
          c.nombre.toLowerCase().includes(extractedData.cliente.toLowerCase()) ||
          extractedData.cliente.toLowerCase().includes(c.nombre.toLowerCase())
      );

      if (matchedClient) {
        clientId = matchedClient.id;
        confidence = 0.9;
        logger.info("Client matched", { clientId, clientName: matchedClient.nombre });
      }
    }

    // Step 4: Resolve branch if client found
    let branchId: string | null = null;
    let branchName = extractedData.sucursal || "Principal";

    if (clientId && extractedData.sucursal) {
      const { data: branches } = await supabase
        .from("sucursales")
        .select("id, nombre")
        .eq("cliente_id", clientId);

      if (branches && branches.length > 0) {
        const matchedBranch = branches.find(
          (b) =>
            b.nombre.toLowerCase().includes(extractedData.sucursal.toLowerCase()) ||
            extractedData.sucursal.toLowerCase().includes(b.nombre.toLowerCase())
        );

        if (matchedBranch) {
          branchId = matchedBranch.id;
          branchName = matchedBranch.nombre;
        }
      }
    }

    // Step 5: Log to Braintrust
    const braintrustLogId = await bt.log({
      input: { extractedText, clientContext },
      output: {
        clientId,
        clientName: extractedData.cliente,
        branchId,
        branchName,
        confidence,
      },
      scores: {
        confidence,
      },
      metadata: {
        emailId,
        pdfUrl,
        step: "client-resolution",
        model: "gpt-4o",
        duration,
        promptTokens: response.usage?.prompt_tokens,
        completionTokens: response.usage?.completion_tokens,
        similarClientsCount: similarClients?.length || 0,
      },
    });

    logger.info("Client resolution completed", {
      clientId,
      confidence,
      braintrustLogId: braintrustLogId.id,
    });

    return {
      clientId,
      clientName: extractedData.cliente || "Desconocido",
      branchId,
      branchName,
      confidence,
      braintrustLogId: braintrustLogId.id,
      orderDate: extractedData.fecha || new Date().toISOString(),
      orderValue: extractedData.valor_total || null,
      observations: extractedData.observaciones || "",
      ocNumber: extractedData.numero_oc || "",
    };
  },
});
