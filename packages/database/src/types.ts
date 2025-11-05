// Tipos para Órdenes de Compra
export interface OrdenCompra {
  id: string;
  email_id: string;
  email_subject: string;
  email_from: string;
  email_body_preview: string | null;
  received_at: string;
  
  pdf_url: string;
  pdf_filename: string;
  openai_file_id: string | null;
  
  cliente: string;
  sucursal: string | null;
  oc_number: string;
  direccion: string | null;
  
  status: 'pending' | 'processed' | 'error';
  processing_logs: ProcessingLog[];
  error_message: string | null;
  
  braintrust_classification_log_id: string | null;
  braintrust_extraction_log_id: string | null;
  
  created_at: string;
  updated_at: string;
}

export interface OrdenCompraProducto {
  id: string;
  orden_compra_id: string;
  producto: string;
  cantidad_solicitada: number;
  fecha_entrega: string | null;
  precio: number | null;
  created_at: string;
}

export interface OrdenCompraWithProductos extends OrdenCompra {
  productos: OrdenCompraProducto[];
}

export interface ProcessingLog {
  step: string;
  timestamp: string;
  status: 'success' | 'error';
  message: string;
  metadata?: Record<string, any>;
}

export interface ExtractedOrdenData {
  CLIENTE: string;
  SUCURSAL?: string;
  OC: string;
  PRODUCTOS: Array<{
    PRODUCTO: string;
    'FECHA DE ENTREGA'?: string;
    'CANTIDAD SOLICITADA': number;
    PRECIO?: number;
  }>;
  DIRECCIÓN?: string;
}

// Tipos para emails de Outlook
export interface OutlookEmail {
  id: string;
  subject: string;
  from: string;
  bodyPreview: string;
  receivedDateTime: string;
  hasAttachments: boolean;
}

export interface OutlookAttachment {
  id: string;
  name: string;
  contentType: string;
  size: number;
}
