"use client"

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

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
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 15
  let y = 20

  // HEADER SIMPLE Y LIMPIO
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.text('PASTRY CHEF', pageWidth / 2, y, { align: 'center' })

  y += 8
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text('PASTELERÍA Y COCINA GOURMET S.A.S', pageWidth / 2, y, { align: 'center' })

  y += 6
  doc.setFontSize(10)
  doc.text('NIT: 900.641.244-5 - www.pastrychef.com.co - Crr 90 a # 64 c - 47', pageWidth / 2, y, { align: 'center' })

  y += 15

  // Línea separadora
  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.5)
  doc.line(margin, y, pageWidth - margin, y)

  y += 15

  // TÍTULO DEL DOCUMENTO
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('REMISIÓN DE MERCANCÍA', pageWidth / 2, y, { align: 'center' })

  y += 15

  // INFORMACIÓN EN DOS COLUMNAS
  const leftCol = margin
  const rightCol = pageWidth / 2 + 10

  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('Remisión No:', leftCol, y)
  doc.setFont('helvetica', 'normal')
  const remisionNumber = data.remision_number && data.remision_number.toString().trim() ? data.remision_number.toString() : 'N/A'
  doc.text(remisionNumber, leftCol + 35, y)

  doc.setFont('helvetica', 'bold')
  doc.text('Fecha:', rightCol, y)
  doc.setFont('helvetica', 'normal')
  doc.text(new Date(data.created_at).toLocaleDateString('es-ES'), rightCol + 20, y)

  y += 8

  doc.setFont('helvetica', 'bold')
  doc.text('Pedido No:', leftCol, y)
  doc.setFont('helvetica', 'normal')
  doc.text(data.order.order_number, leftCol + 35, y)

  doc.setFont('helvetica', 'bold')
  doc.text('Fecha Entrega:', rightCol, y)
  doc.setFont('helvetica', 'normal')
  doc.text(new Date(data.order.expected_delivery_date).toLocaleDateString('es-ES'), rightCol + 35, y)

  y += 15

  // DATOS DEL CLIENTE
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('CLIENTE', leftCol, y)

  y += 8
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`${data.client.name}`, leftCol, y)

  if (data.client.nit) {
    doc.text(`NIT: ${data.client.nit}`, rightCol, y)
  }

  y += 6

  if (data.client.razon_social) {
    doc.text(`${data.client.razon_social}`, leftCol, y)
    y += 6
  }

  if (data.client.phone || data.client.email) {
    let contactInfo = ''
    if (data.client.phone) contactInfo += `Tel: ${data.client.phone}`
    if (data.client.email) {
      if (contactInfo) contactInfo += ' - '
      contactInfo += `Email: ${data.client.email}`
    }
    doc.text(contactInfo, leftCol, y)
    y += 6
  }

  if (data.client.address) {
    doc.text(`Dir: ${data.client.address}`, leftCol, y)
    y += 6
  }

  y += 10

  // TABLA DE PRODUCTOS SIMPLIFICADA
  const tableData = data.items.map(item => [
    item.product_name,
    item.quantity_delivered.toString()
  ])

  autoTable(doc, {
    startY: y,
    head: [['Producto', 'Cantidad Paquetes']],
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 9,
      cellPadding: 2,
      lineColor: [0, 0, 0],
      lineWidth: 0.3
    },
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      cellPadding: 3
    },
    columnStyles: {
      0: { cellWidth: 120, fontStyle: 'bold' }, // Producto
      1: { cellWidth: 50, halign: 'center' } // Cantidad Paquetes
    },
    margin: { left: margin, right: margin }
  })

  // Obtener la posición después de la tabla
  y = (doc as any).lastAutoTable.finalY + 15

  // OBSERVACIONES (solo si existen)
  if (data.notes) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('OBSERVACIONES:', leftCol, y)
    y += 6
    doc.setFont('helvetica', 'normal')
    const noteLines = doc.splitTextToSize(data.notes, pageWidth - 2 * margin)
    doc.text(noteLines, leftCol, y)
    y += noteLines.length * 5 + 10
  }

  // FIRMAS
  const signatureY = Math.max(y + 15, pageHeight - 50)
  const sigWidth = 70

  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.5)

  // Línea izquierda
  doc.line(margin, signatureY, margin + sigWidth, signatureY)
  doc.setFontSize(9)
  doc.text('ENTREGA', margin + sigWidth/2, signatureY + 8, { align: 'center' })

  // Línea derecha
  const rightSigX = pageWidth - margin - sigWidth
  doc.line(rightSigX, signatureY, rightSigX + sigWidth, signatureY)
  doc.text('RECIBE', rightSigX + sigWidth/2, signatureY + 8, { align: 'center' })

  // FOOTER
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text('Este documento es una remisión de mercancía y no constituye factura de venta',
    pageWidth / 2, pageHeight - 15, { align: 'center' })

  // Convertir a Uint8Array
  const pdfArrayBuffer = doc.output('arraybuffer')
  return new Uint8Array(pdfArrayBuffer)
}

export function getRemisionFileName(remisionNumber: string, clientName: string): string {
  const cleanClientName = clientName.replace(/[^a-zA-Z0-9]/g, '_')
  const date = new Date().toISOString().split('T')[0]
  return `Remision_${remisionNumber}_${cleanClientName}_${date}.pdf`
}