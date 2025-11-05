import { createClient } from '@supabase/supabase-js';
import type { OrdenCompra, ExtractedOrdenData } from '@bakery/database';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function saveOrdenCompra(data: {
  emailId: string;
  emailSubject: string;
  emailFrom: string;
  emailBodyPreview: string;
  receivedAt: string;
  pdfUrl: string;
  pdfFilename: string;
  openaiFileId?: string;
  extractedData: ExtractedOrdenData;
  braintrustLogIds: {
    classification?: string;
    extraction?: string;
  };
}): Promise<OrdenCompra> {
  const { data: orden, error } = await supabase
    .from('workflows.ordenes_compra')
    .insert({
      email_id: data.emailId,
      email_subject: data.emailSubject,
      email_from: data.emailFrom,
      email_body_preview: data.emailBodyPreview,
      received_at: data.receivedAt,
      pdf_url: data.pdfUrl,
      pdf_filename: data.pdfFilename,
      openai_file_id: data.openaiFileId,
      cliente: data.extractedData.CLIENTE,
      sucursal: data.extractedData.SUCURSAL,
      oc_number: data.extractedData.OC,
      direccion: data.extractedData.DIRECCIÓN,
      status: 'processed',
      braintrust_classification_log_id: data.braintrustLogIds.classification,
      braintrust_extraction_log_id: data.braintrustLogIds.extraction,
      processing_logs: [
        {
          step: 'completed',
          timestamp: new Date().toISOString(),
          status: 'success',
          message: 'Orden procesada exitosamente'
        }
      ]
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving orden compra:', error);
    throw error;
  }

  // Guardar productos
  if (data.extractedData.PRODUCTOS?.length) {
    const { error: productosError } = await supabase
      .from('workflows.ordenes_compra_productos')
      .insert(
        data.extractedData.PRODUCTOS.map(p => ({
          orden_compra_id: orden.id,
          producto: p.PRODUCTO,
          cantidad_solicitada: p['CANTIDAD SOLICITADA'],
          fecha_entrega: p['FECHA DE ENTREGA'] || null,
          precio: p.PRECIO || null,
        }))
      );

    if (productosError) {
      console.error('Error saving productos:', productosError);
      throw productosError;
    }
  }

  return orden as OrdenCompra;
}

export async function markOrdenAsError(emailId: string, errorMessage: string) {
  const { error } = await supabase
    .from('workflows.ordenes_compra')
    .update({
      status: 'error',
      error_message: errorMessage,
      processing_logs: [
        {
          step: 'error',
          timestamp: new Date().toISOString(),
          status: 'error',
          message: errorMessage
        }
      ]
    })
    .eq('email_id', emailId);

  if (error) {
    console.error('Error marking orden as error:', error);
  }
}
