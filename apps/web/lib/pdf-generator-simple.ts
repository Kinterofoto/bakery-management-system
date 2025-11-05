"use client"

import jsPDF from 'jspdf'

interface RemisionPDFData {
  remision_number: string
  client: {
    name: string
    razon_social?: string | null
    nit?: string | null
    phone?: string | null
    email?: string | null
    address?: string | null
  }
  order: {
    order_number: string
    expected_delivery_date: string
  }
  items: Array<{
    product_name: string
    quantity_delivered: number
    unit_price: number
    total_price: number
    product_unit?: string | null
  }>
  total_amount: number
  notes?: string | null
  created_at: string
}

export function generateRemisionPDF(data: RemisionPDFData): Uint8Array {
  console.log('Generating PDF with data:', {
    remisionNumber: data.remision_number,
    clientName: data.client?.name,
    itemsCount: data.items?.length,
    totalAmount: data.total_amount,
    items: data.items
  })

  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 20
  let yPosition = 30

  // Company header
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('PASTRYAPP', pageWidth / 2, yPosition, { align: 'center' })

  yPosition += 10
  doc.setFontSize(16)
  doc.text('REMISIÓN DE MERCANCÍA', pageWidth / 2, yPosition, { align: 'center' })

  yPosition += 20

  // Remision info
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text(`Remisión No: ${data.remision_number}`, margin, yPosition)

  yPosition += 10
  doc.text(`Pedido No: ${data.order.order_number}`, margin, yPosition)

  yPosition += 10
  doc.text(`Fecha: ${new Date(data.created_at).toLocaleDateString('es-ES')}`, margin, yPosition)

  yPosition += 10
  doc.text(`Fecha de Entrega: ${new Date(data.order.expected_delivery_date).toLocaleDateString('es-ES')}`, margin, yPosition)

  yPosition += 20

  // Client info
  doc.setFont('helvetica', 'bold')
  doc.text('DATOS DEL CLIENTE', margin, yPosition)
  yPosition += 10

  doc.setFont('helvetica', 'normal')
  doc.text(`Cliente: ${data.client.name}`, margin, yPosition)
  yPosition += 8

  if (data.client.razon_social) {
    doc.text(`Razón Social: ${data.client.razon_social}`, margin, yPosition)
    yPosition += 8
  }

  if (data.client.nit) {
    doc.text(`NIT: ${data.client.nit}`, margin, yPosition)
    yPosition += 8
  }

  if (data.client.phone) {
    doc.text(`Teléfono: ${data.client.phone}`, margin, yPosition)
    yPosition += 8
  }

  if (data.client.email) {
    doc.text(`Email: ${data.client.email}`, margin, yPosition)
    yPosition += 8
  }

  if (data.client.address) {
    doc.text(`Dirección: ${data.client.address}`, margin, yPosition)
    yPosition += 8
  }

  yPosition += 15

  // Products table header
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('PRODUCTOS', margin, yPosition)
  yPosition += 10

  // Table headers
  doc.setFontSize(10)
  doc.text('Producto', margin, yPosition)
  doc.text('Cant.', margin + 100, yPosition)
  doc.text('Unidad', margin + 130, yPosition)
  doc.text('P. Unit.', margin + 160, yPosition)
  doc.text('Total', pageWidth - margin - 30, yPosition)

  // Underline for headers
  doc.line(margin, yPosition + 2, pageWidth - margin, yPosition + 2)
  yPosition += 12

  // Products
  doc.setFont('helvetica', 'normal')
  let itemsTotal = 0

  data.items.forEach((item, index) => {
    // Check if we need a new page
    if (yPosition > 250) {
      doc.addPage()
      yPosition = 30
    }

    // Product name (truncate if too long)
    const productName = item.product_name.length > 30
      ? item.product_name.substring(0, 27) + '...'
      : item.product_name

    doc.text(productName, margin, yPosition)
    doc.text(item.quantity_delivered.toString(), margin + 100, yPosition)
    doc.text(item.product_unit || 'UN', margin + 130, yPosition)
    doc.text(`$${item.unit_price.toLocaleString()}`, margin + 160, yPosition)
    doc.text(`$${item.total_price.toLocaleString()}`, pageWidth - margin - 30, yPosition, { align: 'right' })

    itemsTotal += item.total_price
    yPosition += 8
  })

  yPosition += 10

  // Total line
  doc.line(margin + 140, yPosition, pageWidth - margin, yPosition)
  yPosition += 10

  // Total
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text(`TOTAL: $${data.total_amount.toLocaleString()}`, pageWidth - margin - 60, yPosition, { align: 'right' })

  yPosition += 20

  // Notes
  if (data.notes) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text('OBSERVACIONES:', margin, yPosition)
    yPosition += 10

    doc.setFont('helvetica', 'normal')
    const splitNotes = doc.splitTextToSize(data.notes, pageWidth - 2 * margin)
    doc.text(splitNotes, margin, yPosition)
    yPosition += splitNotes.length * 8
  }

  yPosition += 20

  // Signatures
  const signatureY = Math.max(yPosition, 220) // Ensure signatures are near bottom

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)

  // Signature lines
  doc.line(margin, signatureY, margin + 60, signatureY)
  doc.line(pageWidth - margin - 60, signatureY, pageWidth - margin, signatureY)

  // Signature labels
  yPosition = signatureY + 8
  doc.text('Entrega', margin + 20, yPosition)
  doc.text('Recibe', pageWidth - margin - 40, yPosition)

  // Footer
  doc.setFontSize(8)
  doc.text('Este documento es una remisión de mercancía y no constituye factura de venta',
    pageWidth / 2, doc.internal.pageSize.getHeight() - 20, { align: 'center' })

  // Convert to Uint8Array
  const pdfArrayBuffer = doc.output('arraybuffer')
  const result = new Uint8Array(pdfArrayBuffer)

  console.log('PDF generation completed:', {
    arrayBufferSize: pdfArrayBuffer.byteLength,
    uint8ArrayLength: result.length,
    firstBytes: Array.from(result.slice(0, 10)),
    isValidPDF: result[0] === 37 && result[1] === 80 && result[2] === 68 && result[3] === 70 // %PDF
  })

  return result
}

export function getRemisionFileName(remisionNumber: string, clientName: string): string {
  const cleanClientName = clientName.replace(/[^a-zA-Z0-9]/g, '_')
  const date = new Date().toISOString().split('T')[0]
  return `Remision_${remisionNumber}_${cleanClientName}_${date}.pdf`
}