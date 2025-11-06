import { task, logger } from "@trigger.dev/sdk/v3";
import { openai } from "@/shared/lib/openai";
import { supabase } from "@/shared/lib/supabase";
import { bt } from "@/shared/lib/braintrust";

interface ProductExtractionInput {
  extractedText: string;
  clientId: string | null;
  emailId: string;
}

interface ProductMatch {
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  price: number | null;
  confidence: number;
}

interface ProductExtractionResult {
  products: ProductMatch[];
  braintrustLogId: string;
  averageConfidence: number;
}

const PRODUCT_EXTRACTION_PROMPT = `Eres un asistente que extrae productos de órdenes de compra.

Extrae TODOS los productos mencionados en el texto, incluyendo:
- Nombre del producto
- Cantidad
- Unidad de medida (kg, unidades, paquetes, etc.)

Devuelve un JSON con este formato:
{
  "productos": [
    {
      "nombre": "Pan Tajado",
      "cantidad": 50,
      "unidad": "unidades"
    }
  ]
}`;

export const extractProducts = task({
  id: "extract-products",
  retry: {
    maxAttempts: 2,
  },
  run: async (payload: ProductExtractionInput): Promise<ProductExtractionResult> => {
    const { extractedText, clientId, emailId } = payload;

    logger.info("Starting product extraction sub-workflow", { 
      emailId, 
      clientId 
    });

    // Step 1: Check client-specific product aliases if client is known
    let aliasesContext = "";
    
    if (clientId) {
      const { data: aliases } = await supabase
        .from("producto_aliases")
        .select("alias, producto_id, productos(nombre)")
        .eq("cliente_id", clientId);

      if (aliases && aliases.length > 0) {
        aliasesContext = `\n\nAlias de productos para este cliente:\n${aliases
          .map((a: any) => `- "${a.alias}" → ${a.productos?.nombre}`)
          .join("\n")}`;
      }
    }

    // Step 2: Extract products using OpenAI
    const startTime = Date.now();

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: PRODUCT_EXTRACTION_PROMPT + aliasesContext,
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
    const extractedProducts = extractedData.productos || [];

    logger.info(`Extracted ${extractedProducts.length} products`);

    // Step 3: RAG Query - Match each product with database
    const productMatches: ProductMatch[] = [];

    for (const product of extractedProducts) {
      // Create embedding for product name
      const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: product.nombre,
      });

      const embedding = embeddingResponse.data[0].embedding;

      // Query vector store using existing productos_rag table
      const { data: similarProducts } = await supabase.rpc("match_productos_rag", {
        query_embedding: embedding,
        match_threshold: 0.7,
        match_count: 3,
      });

      // Find best match
      let productId: string | null = null;
      let productName = product.nombre;
      let confidence = 0.3;
      let price: number | null = null;

      if (similarProducts && similarProducts.length > 0) {
        const bestMatch = similarProducts[0];
        productId = bestMatch.id;
        productName = bestMatch.nombre;
        confidence = bestMatch.similarity || 0.8;

        // Get price from database
        const { data: productData } = await supabase
          .from("productos")
          .select("precio_venta")
          .eq("id", productId)
          .single();

        if (productData) {
          price = productData.precio_venta;
        }
      }

      // Handle unit conversion (packages vs units)
      let finalQuantity = product.cantidad;
      const unit = product.unidad?.toLowerCase() || "unidades";

      if (clientId && productId && unit.includes("paquete")) {
        // Check if client has custom package size
        const { data: clientConfig } = await supabase
          .from("cliente_producto_config")
          .select("unidades_por_paquete")
          .eq("cliente_id", clientId)
          .eq("producto_id", productId)
          .single();

        if (clientConfig?.unidades_por_paquete) {
          finalQuantity = product.cantidad * clientConfig.unidades_por_paquete;
          logger.info("Converted packages to units", {
            product: productName,
            packages: product.cantidad,
            units: finalQuantity,
          });
        }
      }

      productMatches.push({
        productId: productId || `UNMATCHED_${Date.now()}`,
        productName,
        quantity: finalQuantity,
        unit,
        price,
        confidence,
      });
    }

    // Step 4: Calculate average confidence
    const averageConfidence =
      productMatches.reduce((sum, p) => sum + p.confidence, 0) /
      (productMatches.length || 1);

    // Step 5: Log to Braintrust
    const braintrustLogId = await bt.log({
      input: { extractedText, aliasesContext },
      output: { 
        products: productMatches,
        count: productMatches.length,
      },
      scores: {
        averageConfidence,
        completeness: productMatches.length / (extractedProducts.length || 1),
      },
      metadata: {
        emailId,
        clientId,
        step: "product-extraction",
        model: "gpt-4o",
        duration,
        promptTokens: response.usage?.prompt_tokens,
        completionTokens: response.usage?.completion_tokens,
        extractedCount: extractedProducts.length,
        matchedCount: productMatches.filter((p) => !p.productId.startsWith("UNMATCHED")).length,
      },
    });

    logger.info("Product extraction completed", {
      productsCount: productMatches.length,
      averageConfidence,
      braintrustLogId: braintrustLogId.id,
    });

    return {
      products: productMatches,
      braintrustLogId: braintrustLogId.id,
      averageConfidence,
    };
  },
});
