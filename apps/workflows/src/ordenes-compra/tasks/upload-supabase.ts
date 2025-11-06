import { task, logger } from "@trigger.dev/sdk/v3";
import { supabase } from "@/shared/lib/supabase";

interface PDFAttachment {
  id: string;
  name: string;
  contentType: string;
  data: Buffer;
}

interface UploadedPDF {
  url: string;
  filename: string;
  path: string;
}

export const uploadPDFToSupabase = task({
  id: "upload-pdf-to-supabase",
  retry: {
    maxAttempts: 3,
    factor: 2,
  },
  run: async (payload: { 
    pdf: PDFAttachment; 
    emailId: string;
  }): Promise<UploadedPDF> => {
    const { pdf, emailId } = payload;

    logger.info("Uploading PDF to Supabase Storage", { 
      filename: pdf.name,
      emailId 
    });

    // Normalize filename
    let filename = pdf.name.toLowerCase();
    if (!filename.endsWith('.pdf')) {
      filename += '.pdf';
    }

    // Generate unique path
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const randomStr = Math.random().toString(36).substring(2, 11);
    const cleanName = filename
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9\-._]/g, '')
      .replace(/\.pdf$/i, '');
    
    const path = `oc/${timestamp}_${Date.now()}_${randomStr}_${cleanName}.pdf`;

    try {
      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('ordenesdecompra')
        .upload(path, pdf.data, {
          contentType: 'application/pdf',
          upsert: false,
        });

      if (error) {
        logger.error("Error uploading to Supabase", { error });
        throw error;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('ordenesdecompra')
        .getPublicUrl(path);

      logger.info("PDF uploaded successfully", { 
        path,
        url: urlData.publicUrl 
      });

      return {
        url: urlData.publicUrl,
        filename: `${cleanName}.pdf`,
        path,
      };
    } catch (error) {
      logger.error("Error uploading PDF", { error, filename: pdf.name });
      throw error;
    }
  },
});
