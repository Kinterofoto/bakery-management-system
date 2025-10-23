import React from 'react'
import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer'

// Register fonts if needed (optional)
// Font.register({
//   family: 'Roboto',
//   src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-light-webfont.ttf'
// })

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
    borderBottom: 1,
    borderBottomColor: '#000',
    paddingBottom: 15,
    position: 'relative',
  },
  logo: {
    width: 210,
    height: 75,
    objectFit: 'contain',
    position: 'absolute',
    top: -10,
    left: 0,
    zIndex: 1,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginBottom: 10,
    marginTop: 0,
  },
  companyInfo: {
    textAlign: 'center',
    fontSize: 9,
    marginBottom: 15,
  },
  companyName: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 3,
  },
  infoSection: {
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  infoLabel: {
    fontFamily: 'Helvetica-Bold',
    width: 100,
  },
  infoValue: {
    flex: 1,
  },
  twoColumns: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  column: {
    width: '48%',
  },
  clientSection: {
    backgroundColor: '#f5f5f5',
    padding: 10,
    marginBottom: 15,
    borderRadius: 4,
  },
  sectionTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 11,
    marginBottom: 8,
  },
  table: {
    marginTop: 10,
    marginBottom: 15,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#e0e0e0',
    padding: 8,
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    borderBottom: 1,
    borderBottomColor: '#000',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottom: 0.5,
    borderBottomColor: '#ccc',
    fontSize: 9,
  },
  col1: { width: '25%' },
  col2: { width: '12%', textAlign: 'center' },
  col3: { width: '12%', textAlign: 'center' },
  col4: { width: '15%', textAlign: 'center' },
  col5: { width: '18%', textAlign: 'right' },
  col6: { width: '18%' },
  notes: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#fff9e6',
    borderRadius: 4,
  },
  signatures: {
    position: 'absolute',
    bottom: 50,
    left: 30,
    right: 30,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  signatureBox: {
    width: 150,
    alignItems: 'center',
  },
  signatureLine: {
    width: '100%',
    borderTop: 1,
    borderTopColor: '#000',
    marginBottom: 5,
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 8,
    color: '#666',
  },
})

interface RemisionPDFData {
  remision_number: string
  purchase_order_number?: string | null
  branch_name?: string | null
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
    product_description?: string | null
    weight?: string | null
    units_per_package?: number | null
    quantity_delivered: number
    unit_price: number
    total_price: number
    product_unit?: string | null
  }>
  total_amount: number
  notes?: string | null
  created_at: string
}

interface RemisionDocumentProps {
  data: RemisionPDFData
  logoUrl?: string
}

export const RemisionDocument: React.FC<RemisionDocumentProps> = ({ data, logoUrl }) => (
  <Document>
    <Page size="LETTER" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Image src={logoUrl || '/Logo_Pastry_Mesa de trabajo 1 copia 2.png'} style={styles.logo} />
        <Text style={styles.title}>REMISIÓN DE MERCANCÍA</Text>
        <View style={styles.companyInfo}>
          <Text style={styles.companyName}>PASTRY CHEF PASTELERIA Y COCINA GOURMET SAS</Text>
          <Text>NIT: 900.641.244-5</Text>
          <Text>Crr 90 a # 64 c - 47</Text>
          <Text>www.pastrychef.com.co</Text>
        </View>
      </View>

      {/* Document Info */}
      <View style={styles.infoSection}>
        <View style={styles.twoColumns}>
          <View style={styles.column}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Remisión No:</Text>
              <Text style={styles.infoValue}>{data.remision_number || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Pedido No:</Text>
              <Text style={styles.infoValue}>{data.order.order_number}</Text>
            </View>
            {data.purchase_order_number && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}># OC:</Text>
                <Text style={styles.infoValue}>{data.purchase_order_number}</Text>
              </View>
            )}
          </View>
          <View style={styles.column}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Fecha:</Text>
              <Text style={styles.infoValue}>
                {new Date(data.created_at).toLocaleDateString('es-ES')}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Fecha Entrega:</Text>
              <Text style={styles.infoValue}>
                {new Date(data.order.expected_delivery_date).toLocaleDateString('es-ES')}
              </Text>
            </View>
            {data.branch_name && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Sucursal:</Text>
                <Text style={styles.infoValue}>{data.branch_name}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Client Info */}
      <View style={styles.clientSection}>
        <Text style={styles.sectionTitle}>INFORMACIÓN DEL CLIENTE</Text>
        <View style={styles.twoColumns}>
          <View style={styles.column}>
            <Text>{data.client.name}</Text>
            {data.client.razon_social && <Text>{data.client.razon_social}</Text>}
            {data.client.nit && <Text>NIT: {data.client.nit}</Text>}
          </View>
          <View style={styles.column}>
            {data.client.phone && <Text>Tel: {data.client.phone}</Text>}
            {data.client.email && <Text>Email: {data.client.email}</Text>}
            {data.client.address && <Text>Dir: {data.client.address}</Text>}
          </View>
        </View>
      </View>

      {/* Products Table */}
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={styles.col1}>Producto / Descripción</Text>
          <Text style={styles.col2}>Gramaje</Text>
          <Text style={styles.col3}>Und/Paq</Text>
          <Text style={styles.col4}>Cant. Paq</Text>
          <Text style={styles.col5}>Precio</Text>
          <Text style={styles.col6}>Observaciones</Text>
        </View>
        {data.items.map((item, index) => (
          <View key={index} style={styles.tableRow}>
            <View style={styles.col1}>
              <Text style={{ fontFamily: 'Helvetica-Bold' }}>{item.product_name}</Text>
              {item.product_description && (
                <Text style={{ fontSize: 8, color: '#555', marginTop: 2 }}>
                  {item.product_description}
                </Text>
              )}
            </View>
            <Text style={styles.col2}>{item.weight || '-'}</Text>
            <Text style={styles.col3}>{item.units_per_package || '-'}</Text>
            <Text style={styles.col4}>{item.quantity_delivered}</Text>
            <Text style={styles.col5}>${item.total_price.toLocaleString('es-CO')}</Text>
            <Text style={styles.col6}>-</Text>
          </View>
        ))}
      </View>

      {/* Notes */}
      {data.notes && (
        <View style={styles.notes}>
          <Text style={styles.sectionTitle}>OBSERVACIONES</Text>
          <Text>{data.notes}</Text>
        </View>
      )}

      {/* Signatures */}
      <View style={styles.signatures}>
        <View style={styles.signatureBox}>
          <View style={styles.signatureLine} />
          <Text>ENTREGA</Text>
        </View>
        <View style={styles.signatureBox}>
          <View style={styles.signatureLine} />
          <Text>RECIBE</Text>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text>Este documento es una remisión de mercancía y no constituye factura de venta</Text>
      </View>
    </Page>
  </Document>
)

export function getRemisionFileName(remisionNumber: string, clientName: string): string {
  const cleanClientName = clientName.replace(/[^a-zA-Z0-9]/g, '_')
  const date = new Date().toISOString().split('T')[0]
  return `Remision_${remisionNumber}_${cleanClientName}_${date}.pdf`
}

// Helper function to generate PDF blob
export async function generateRemisionPDFBlob(data: RemisionPDFData, logoUrl?: string): Promise<Blob> {
  const { pdf } = await import('@react-pdf/renderer')
  return await pdf(<RemisionDocument data={data} logoUrl={logoUrl} />).toBlob()
}
