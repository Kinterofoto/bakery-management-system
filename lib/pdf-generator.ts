"use client"

import jsPDF from 'jspdf'
import 'jspdf-autotable'

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF
  }
}

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
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 20
  let yPosition = 30

  // Company header
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('PANADERÍA INDUSTRIAL', pageWidth / 2, yPosition, { align: 'center' })

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

  yPosition += 10

  // Products table
  const tableData = data.items.map(item => [
    item.product_name,
    item.quantity_delivered.toString(),
    item.product_unit || 'UN',
    `$${item.unit_price.toLocaleString()}`,
    `$${item.total_price.toLocaleString()}`
  ])

  doc.autoTable({
    startY: yPosition,
    head: [['Producto', 'Cantidad', 'Unidad', 'Precio Unit.', 'Total']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [100, 100, 100],
      textColor: 255,
      fontStyle: 'bold'
    },
    styles: {
      fontSize: 10,
      cellPadding: 3
    },
    columnStyles: {
      0: { cellWidth: 80 }, // Product name
      1: { cellWidth: 20, halign: 'center' }, // Quantity
      2: { cellWidth: 20, halign: 'center' }, // Unit
      3: { cellWidth: 30, halign: 'right' }, // Unit price
      4: { cellWidth: 30, halign: 'right' } // Total
    }
  })

  // Get final Y position after table
  yPosition = (doc as any).lastAutoTable.finalY + 10

  // Total
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text(`TOTAL: $${data.total_amount.toLocaleString()}`, pageWidth - margin - 60, yPosition)

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
  return new Uint8Array(pdfArrayBuffer)
}

export function getRemisionFileName(remisionNumber: string, clientName: string): string {
  const cleanClientName = clientName.replace(/[^a-zA-Z0-9]/g, '_')
  const date = new Date().toISOString().split('T')[0]
  return `Remision_${remisionNumber}_${cleanClientName}_${date}.pdf`
}