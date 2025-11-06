import { task, logger } from "@trigger.dev/sdk/v3";
import { supabase } from "@/shared/lib/supabase";
import { bt } from "@/shared/lib/braintrust";

interface ProductMatch {
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  price: number | null;
  confidence: number;
}

interface OrderCreationInput {
  emailId: string;
  pdfUrl: string;
  clientId: string | null;
  clientName: string;
  branchId: string | null;
  branchName: string;
  ocNumber: string;
  orderDate: string;
  orderValue: number | null;
  observations: string;
  products: ProductMatch[];
  braintrustLogIds: string[];
}

interface OrderCreationResult {
  orderId: string;
  orderNumber: string;
  success: boolean;
  braintrustLogId: string;
}

export const createOrder = task({
  id: "create-order",
  retry: {
    maxAttempts: 2,
  },
  run: async (payload: OrderCreationInput): Promise<OrderCreationResult> => {
    const {
      emailId,
      pdfUrl,
      clientId,
      clientName,
      branchId,
      branchName,
      ocNumber,
      orderDate,
      orderValue,
      observations,
      products,
      braintrustLogIds,
    } = payload;

    logger.info("Starting order creation sub-workflow", {
      emailId,
      clientId,
      productsCount: products.length,
    });

    const startTime = Date.now();

    try {
      // Step 1: Generate order number (format: OC-YYYYMMDD-XXX)
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      
      // Get today's order count
      const { data: todayOrders } = await supabase
        .from("workflows.ordenes_compra")
        .select("id")
        .gte("created_at", new Date().toISOString().slice(0, 10))
        .lt("created_at", new Date(Date.now() + 86400000).toISOString().slice(0, 10));

      const orderSequence = ((todayOrders?.length || 0) + 1).toString().padStart(3, "0");
      const orderNumber = `OC-${dateStr}-${orderSequence}`;

      // Step 2: Insert main order record
      const { data: order, error: orderError } = await supabase
        .from("workflows.ordenes_compra")
        .insert({
          email_id: emailId,
          pdf_url: pdfUrl,
          cliente: clientName,
          cliente_id: clientId,
          sucursal: branchName,
          sucursal_id: branchId,
          oc_number: ocNumber,
          order_number: orderNumber,
          fecha_orden: orderDate,
          valor_total: orderValue,
          observaciones: observations,
          status: "pending",
          braintrust_log_ids: braintrustLogIds,
        })
        .select()
        .single();

      if (orderError) {
        logger.error("Error creating order", { error: orderError });
        throw orderError;
      }

      logger.info("Order created", { orderId: order.id, orderNumber });

      // Step 3: Insert order products
      const productInserts = products.map((product) => ({
        orden_compra_id: order.id,
        producto_id: product.productId.startsWith("UNMATCHED") ? null : product.productId,
        producto_nombre: product.productName,
        cantidad: product.quantity,
        unidad: product.unit,
        precio_unitario: product.price,
        confidence_score: product.confidence,
      }));

      const { error: productsError } = await supabase
        .from("workflows.ordenes_compra_productos")
        .insert(productInserts);

      if (productsError) {
        logger.error("Error inserting products", { error: productsError });
        
        // Rollback: mark order as error
        await supabase
          .from("workflows.ordenes_compra")
          .update({ status: "error", error_message: productsError.message })
          .eq("id", order.id);

        throw productsError;
      }

      logger.info("Products inserted", { count: products.length });

      const duration = Date.now() - startTime;

      // Step 4: Log to Braintrust
      const braintrustLogId = await bt.log({
        input: { 
          emailId, 
          clientId, 
          productsCount: products.length 
        },
        output: {
          orderId: order.id,
          orderNumber,
          success: true,
        },
        scores: {
          completeness: 1.0,
          productsMatched: products.filter((p) => !p.productId.startsWith("UNMATCHED")).length / products.length,
        },
        metadata: {
          emailId,
          pdfUrl,
          clientId,
          step: "order-creation",
          duration,
          productsCount: products.length,
          totalValue: orderValue,
          previousLogIds: braintrustLogIds,
        },
      });

      logger.info("Order creation completed", {
        orderId: order.id,
        orderNumber,
        braintrustLogId: braintrustLogId.id,
      });

      return {
        orderId: order.id,
        orderNumber,
        success: true,
        braintrustLogId: braintrustLogId.id,
      };
    } catch (error) {
      logger.error("Order creation failed", { error });

      // Log failure to Braintrust
      const braintrustLogId = await bt.log({
        input: { emailId, clientId },
        output: { success: false, error: String(error) },
        scores: { completeness: 0 },
        metadata: {
          emailId,
          step: "order-creation",
          error: String(error),
        },
      });

      throw error;
    }
  },
});
