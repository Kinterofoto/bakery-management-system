import React from 'react'
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import { supabase } from '@/lib/supabase'
import type { TechnicalSpec, StorageTemperatureCondition, BOMIngredient } from '@/hooks/use-nucleo-product'

// --- Types ---

interface RouteStep {
  sequence_order: number
  operation_name: string
  operation_color: string | null
}

interface FichaTecnicaData {
  productName: string
  productWeight: string
  productCategory: string
  productDescription: string
  specs: TechnicalSpec | null
  qualitySpecs: any | null
  ingredients: BOMIngredient[]
  logoUrl?: string
  productPhotoUrl?: string
  routeSteps: RouteStep[]
}

// --- Styles ---

const s = StyleSheet.create({
  page: { padding: 30, fontSize: 8.5, fontFamily: 'Helvetica' },
  // Header
  headerRow: { flexDirection: 'row', borderBottom: 1, borderColor: '#000', paddingBottom: 8, marginBottom: 10 },
  logoBox: { width: 70, justifyContent: 'center', alignItems: 'center' },
  logo: { width: 60, height: 30, objectFit: 'contain' },
  headerCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', textAlign: 'center' },
  headerSub: { fontSize: 8, textAlign: 'center', marginTop: 2 },
  headerRight: { width: 180, alignItems: 'flex-end', justifyContent: 'center' },
  // Section
  sectionHeader: { backgroundColor: '#f0f0f0', padding: 4, marginTop: 8, marginBottom: 4, borderBottom: 1, borderColor: '#ccc' },
  sectionTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold' },
  // Table
  table: { marginBottom: 6 },
  tableRow: { flexDirection: 'row', borderBottom: 0.5, borderColor: '#ddd', minHeight: 16 },
  tableRowAlt: { flexDirection: 'row', borderBottom: 0.5, borderColor: '#ddd', minHeight: 16, backgroundColor: '#fafafa' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#e8e8e8', borderBottom: 1, borderColor: '#999', minHeight: 18 },
  cellSm: { width: '25%', padding: 3, justifyContent: 'center' },
  cellMd: { width: '33%', padding: 3, justifyContent: 'center' },
  cellLg: { width: '50%', padding: 3, justifyContent: 'center' },
  cellFull: { width: '100%', padding: 3, justifyContent: 'center' },
  bold: { fontFamily: 'Helvetica-Bold' },
  // Generic
  row: { flexDirection: 'row' },
  text: { fontSize: 8.5 },
  textSm: { fontSize: 7.5 },
  mb4: { marginBottom: 4 },
  mb8: { marginBottom: 8 },
  p4: { padding: 4 },
  twoCol: { flexDirection: 'row', gap: 10 },
  col: { flex: 1 },
  // Product photo
  photoSection: { marginTop: 8, marginBottom: 8, alignItems: 'center' as const },
  photoLabel: { fontSize: 9, fontFamily: 'Helvetica-Bold', marginBottom: 4, textAlign: 'center' as const },
  photoImage: { width: 160, height: 160, objectFit: 'contain' as const, borderWidth: 1, borderColor: '#ccc' },
  // Footer
  footer: { marginTop: 8, borderTop: 1, borderColor: '#000', paddingTop: 6 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between' },
  signBox: { width: '45%', borderTop: 1, borderColor: '#999', padding: 4 },
  pageNum: { fontSize: 7, textAlign: 'right', position: 'absolute', bottom: 15, right: 30 },
  pageId: { fontSize: 7, position: 'absolute', bottom: 15, left: 30 },
  // Flowchart
  flowContainer: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, paddingHorizontal: 4, gap: 0 },
  flowStep: { width: 90, height: 40, borderRadius: 6, justifyContent: 'center', alignItems: 'center', borderWidth: 1.2, borderColor: '#555' },
  flowStepText: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', textAlign: 'center', color: '#fff' },
  flowStepTextDark: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', textAlign: 'center', color: '#222' },
  flowArrow: { width: 24, justifyContent: 'center', alignItems: 'center', height: 40 },
  flowArrowText: { fontSize: 14, color: '#888', fontFamily: 'Helvetica-Bold' },
  flowNumber: { fontSize: 6, color: '#fff', marginBottom: 1 },
  flowNumberDark: { fontSize: 6, color: '#444', marginBottom: 1 },
})

const formatDate = (d: string | null): string => {
  if (!d) return '-'
  const [year, month, day] = d.split('T')[0].split('-')
  const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
  return `${day}-${months[parseInt(month) - 1]}-${year}`
}

// Default color palette for steps without a color
const STEP_COLORS = ['#4A90D9', '#50B86C', '#E8A838', '#D94F4F', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316']

function isLightColor(hex: string): boolean {
  const c = hex.replace('#', '')
  const r = parseInt(c.substring(0, 2), 16)
  const g = parseInt(c.substring(2, 4), 16)
  const b = parseInt(c.substring(4, 6), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 160
}

function ProcessFlowchart({ steps }: { steps: RouteStep[] }) {
  if (!steps.length) return <View style={s.p4}><Text style={s.text}>-</Text></View>

  return (
    <View style={s.flowContainer}>
      {steps.map((step, i) => {
        const bg = step.operation_color || STEP_COLORS[i % STEP_COLORS.length]
        const light = isLightColor(bg)
        return (
          <React.Fragment key={i}>
            <View style={[s.flowStep, { backgroundColor: bg }]}>
              <Text style={light ? s.flowNumberDark : s.flowNumber}>{step.sequence_order}</Text>
              <Text style={light ? s.flowStepTextDark : s.flowStepText}>{step.operation_name.toUpperCase()}</Text>
            </View>
            {i < steps.length - 1 && (
              <View style={s.flowArrow}>
                <Text style={s.flowArrowText}>→</Text>
              </View>
            )}
          </React.Fragment>
        )
      })}
    </View>
  )
}

function buildIngredientText(ingredients: BOMIngredient[]): string {
  if (!ingredients.length) return ''
  const parts: string[] = []
  for (const ing of ingredients) {
    if (ing.is_pp && ing.pp_ingredients?.length) {
      const sub = ing.pp_ingredients.map(s => s.material_name.toLowerCase()).join(', ')
      parts.push(`${ing.material_name.toLowerCase()} (${sub})`)
    } else {
      parts.push(ing.material_name.toLowerCase())
    }
  }
  return parts.join(', ')
}

// --- Document ---

function FichaTecnicaDocument({ data }: { data: FichaTecnicaData }) {
  const { specs, qualitySpecs, ingredients } = data
  const sensory = (qualitySpecs?.sensory_attributes || {}) as Record<string, string>
  const micro = (qualitySpecs?.microbiological_specs || []) as Array<{ parametro: string; unidades: string; especificacion: string; metodo: string }>
  const tempConds = (specs?.condiciones_almacenamiento_temp || []) as StorageTemperatureCondition[]
  const codigoFicha = specs?.codigo_ficha || 'FO-77'
  const version = specs?.version_ficha || '-'
  const fechaPub = specs?.fecha_publicacion_ficha ? formatDate(specs.fecha_publicacion_ficha) : '-'

  return (
    <Document>
      <Page size="LETTER" style={s.page}>
        {/* Header */}
        <View style={s.headerRow}>
          <View style={s.logoBox}>
            <Image src={data.logoUrl || '/Logo_Pastry-06.jpg'} style={s.logo} />
          </View>
          <View style={s.headerCenter}>
            <Text style={s.headerTitle}>FICHA TECNICA DE PRODUCTO TERMINADO</Text>
            <Text style={s.headerSub}>Codigo: {codigoFicha} Version: {version}</Text>
            <Text style={[s.bold, { fontSize: 9, marginTop: 4 }]}>{data.productName.toUpperCase()} {data.productWeight}</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.textSm}>Fecha de publicacion: {fechaPub}</Text>
            <Text style={s.textSm}>{data.productWeight}</Text>
          </View>
        </View>

        {/* Producto */}
        <View style={s.table}>
          <View style={s.tableHeader}>
            <View style={s.cellMd}><Text style={s.bold}>Producto</Text></View>
            <View style={[s.cellSm, { width: '15%' }]}><Text style={s.bold}>Peso Neto (g)</Text></View>
            <View style={s.cellMd}><Text style={s.bold}>Empaque primario</Text></View>
            <View style={[s.cellSm, { width: '20%' }]}><Text style={s.bold}>Empaque secundario</Text></View>
          </View>
          <View style={s.tableRow}>
            <View style={s.cellMd}><Text>{data.productCategory}: {data.productName.toUpperCase()}</Text></View>
            <View style={[s.cellSm, { width: '15%' }]}><Text>{specs?.peso_medio || data.productWeight?.replace(/[^\d.]/g, '') || '-'}</Text></View>
            <View style={s.cellMd}><Text>{(specs?.empaque_primario || []).join('\n') || '-'}</Text></View>
            <View style={[s.cellSm, { width: '20%' }]}><Text>{(specs?.empaque_secundario || []).join('\n') || '-'}</Text></View>
          </View>
        </View>

        {/* Foto del producto en cruz */}
        {data.productPhotoUrl && (
          <View style={s.photoSection}>
            <Text style={s.photoLabel}>FOTO DEL PRODUCTO</Text>
            <Image src={data.productPhotoUrl} style={s.photoImage} />
          </View>
        )}

        {/* Descripcion */}
        <View style={s.sectionHeader}><Text style={s.sectionTitle}>Descripcion del producto</Text></View>
        <View style={s.p4}><Text style={s.text}>{(specs?.custom_attributes as any)?.descripcion_producto || data.productDescription || '-'}</Text></View>

        {/* Notificacion sanitaria */}
        {specs?.notificacion_sanitaria && (
          <View style={[s.p4, s.mb4]}>
            <Text style={[s.bold, s.text]}>NOTIFICACION SANITARIA No. {specs.notificacion_sanitaria}</Text>
          </View>
        )}

        {/* Uso previsto */}
        <View style={s.sectionHeader}><Text style={s.sectionTitle}>Uso previsto</Text></View>
        <View style={s.p4}><Text style={s.text}>{specs?.uso_previsto || '-'}</Text></View>

        {/* Lista de componentes */}
        <View style={s.sectionHeader}><Text style={s.sectionTitle}>Lista de componentes</Text></View>
        <View style={s.p4}>
          <Text style={s.text}>
            <Text style={s.bold}>INGREDIENTES: </Text>
            {buildIngredientText(ingredients) || '-'}
          </Text>
        </View>

        {/* Alergenos */}
        <View style={s.sectionHeader}><Text style={s.sectionTitle}>ALERGENOS</Text></View>
        <View style={[s.p4, { alignItems: 'center' }]}>
          <Text style={[s.bold, s.text]}>
            ALERGENOS: {(specs?.allergens || []).join(', ') || '-'}
          </Text>
          {(specs?.trazas_alergenos || []).length > 0 && (
            <Text style={[s.bold, s.text, { marginTop: 2 }]}>
              PUEDE CONTENER TRAZAS DE: {specs!.trazas_alergenos!.join(', ')}
            </Text>
          )}
        </View>

        {/* Proceso de elaboracion */}
        <View style={s.sectionHeader}><Text style={s.sectionTitle}>Proceso de elaboracion</Text></View>
        {specs?.proceso_elaboracion && (
          <View style={s.p4}><Text style={s.text}>{specs.proceso_elaboracion}</Text></View>
        )}
        <ProcessFlowchart steps={data.routeSteps} />

        {/* Page number */}
        <Text style={s.pageId}>PG-2</Text>
        <Text style={s.pageNum} render={({ pageNumber, totalPages }) => `Pagina ${pageNumber} de ${totalPages}`} fixed />
      </Page>

      {/* Page 2 */}
      <Page size="LETTER" style={s.page}>
        {/* Repeat header */}
        <View style={[s.row, s.mb8, { justifyContent: 'space-between', borderBottom: 1, borderColor: '#000', paddingBottom: 6 }]}>
          <Text style={s.headerTitle}>FICHA TECNICA DE PRODUCTO TERMINADO</Text>
          <View>
            <Text style={s.textSm}>Codigo: {codigoFicha} Version: {version}</Text>
            <Text style={s.textSm}>{data.productName.toUpperCase()} {data.productWeight}</Text>
          </View>
        </View>

        {/* Condiciones microbiologicas */}
        <View style={s.sectionHeader}><Text style={s.sectionTitle}>Condiciones microbiologicas</Text></View>
        <View style={s.table}>
          <View style={s.tableHeader}>
            <View style={[s.cellSm, { width: '30%' }]}><Text style={s.bold}>Parametro</Text></View>
            <View style={s.cellSm}><Text style={s.bold}>Unidades</Text></View>
            <View style={s.cellSm}><Text style={s.bold}>Especificacion</Text></View>
            <View style={s.cellSm}><Text style={s.bold}>Metodo</Text></View>
          </View>
          {micro.map((row, i) => (
            <View key={i} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
              <View style={[s.cellSm, { width: '30%' }]}><Text style={s.textSm}>{row.parametro}</Text></View>
              <View style={s.cellSm}><Text style={s.textSm}>{row.unidades}</Text></View>
              <View style={s.cellSm}><Text style={s.textSm}>{row.especificacion}</Text></View>
              <View style={s.cellSm}><Text style={s.textSm}>{row.metodo}</Text></View>
            </View>
          ))}
        </View>

        {/* Caracteristicas y Sensoriales side by side */}
        <View style={s.twoCol}>
          {/* Pesos */}
          <View style={s.col}>
            <View style={s.sectionHeader}><Text style={s.sectionTitle}>Caracteristicas del producto</Text></View>
            <View style={s.table}>
              <View style={s.tableRow}><View style={s.cellLg}><Text>Peso (g) medio</Text></View><View style={s.cellLg}><Text style={s.bold}>{specs?.peso_medio || '-'}</Text></View></View>
              <View style={s.tableRowAlt}><View style={s.cellLg}><Text>Peso (g) minimo</Text></View><View style={s.cellLg}><Text style={s.bold}>{specs?.peso_minimo || '-'}</Text></View></View>
              <View style={s.tableRow}><View style={s.cellLg}><Text>Peso (g) maximo</Text></View><View style={s.cellLg}><Text style={s.bold}>{specs?.peso_maximo || '-'}</Text></View></View>
            </View>
          </View>
          {/* Sensoriales */}
          <View style={s.col}>
            <View style={s.sectionHeader}><Text style={s.sectionTitle}>Propiedades sensoriales</Text></View>
            <View style={s.table}>
              {Object.entries(sensory).filter(([_, v]) => v).map(([key, val], i) => (
                <View key={key} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
                  <View style={[s.cellSm, { width: '30%' }]}><Text style={s.bold}>{key.toUpperCase()}</Text></View>
                  <View style={[s.cellSm, { width: '70%' }]}><Text style={s.textSm}>{val}</Text></View>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Condiciones de almacenamiento */}
        <View style={s.sectionHeader}><Text style={s.sectionTitle}>Condiciones de almacenamiento</Text></View>
        <View style={s.table}>
          <View style={s.tableHeader}>
            <View style={s.cellLg}><Text style={s.bold}>Condicion</Text></View>
            <View style={s.cellSm}><Text style={[s.bold, { textAlign: 'center' }]}>Minimo (°C)</Text></View>
            <View style={s.cellSm}><Text style={[s.bold, { textAlign: 'center' }]}>Maximo (°C)</Text></View>
          </View>
          {tempConds.map((c, i) => (
            <View key={i} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
              <View style={s.cellLg}><Text>{c.label}</Text></View>
              <View style={s.cellSm}><Text style={{ textAlign: 'center' }}>{c.min_temp}</Text></View>
              <View style={s.cellSm}><Text style={{ textAlign: 'center' }}>{c.max_temp}</Text></View>
            </View>
          ))}
        </View>

        {/* Manipulacion y transporte */}
        <View style={s.sectionHeader}><Text style={s.sectionTitle}>Manipulacion y transporte</Text></View>
        <View style={s.p4}><Text style={s.text}>{specs?.manipulacion_transporte || '-'}</Text></View>

        {/* Uso no previsto */}
        <View style={s.sectionHeader}><Text style={s.sectionTitle}>Uso no previsto</Text></View>
        <View style={s.p4}>
          <Text style={s.text}>
            Este producto no está destinado para: recongelación una vez atemperado o descongelado, consumo sin cocción previa, consumo por personas alérgicas a gluten, huevo, almendras o lácteos, almacenamiento a temperatura ambiente prolongado, ni calentamiento en microondas directamente desde congelación.
          </Text>
        </View>

        {/* Instrucciones de preparacion */}
        <View style={s.sectionHeader}><Text style={s.sectionTitle}>Instrucciones de preparacion y recomendaciones de uso</Text></View>
        <View style={s.p4}><Text style={s.text}>{specs?.instrucciones_preparacion || '-'}</Text></View>

        {/* Vida util */}
        <View style={s.sectionHeader}><Text style={s.sectionTitle}>Vida util</Text></View>
        <View style={s.table}>
          <View style={s.tableHeader}>
            <View style={s.cellMd}><Text style={s.bold}>Descripcion</Text></View>
            <View style={[s.cellSm, { width: '15%' }]}><Text style={s.bold}>Valor</Text></View>
            <View style={[s.cellSm, { width: '15%' }]}><Text style={s.bold}>UOM</Text></View>
            <View style={s.cellMd}><Text style={s.bold}>Observaciones</Text></View>
          </View>
          <View style={s.tableRow}>
            <View style={s.cellMd}><Text>En congelacion</Text></View>
            <View style={[s.cellSm, { width: '15%' }]}><Text>{specs?.shelf_life_days || '-'}</Text></View>
            <View style={[s.cellSm, { width: '15%' }]}><Text>DIAS</Text></View>
            <View style={s.cellMd}><Text style={s.textSm}>Bajo las condiciones de temperaturas recomendadas de almacenamiento</Text></View>
          </View>
          <View style={s.tableRowAlt}>
            <View style={s.cellMd}><Text>Temperatura ambiente</Text></View>
            <View style={[s.cellSm, { width: '15%' }]}><Text>{specs?.vida_util_ambiente_horas || '-'}</Text></View>
            <View style={[s.cellSm, { width: '15%' }]}><Text>HORAS</Text></View>
            <View style={s.cellMd}><Text style={s.textSm}>Bajo las instrucciones de preparacion recomendadas</Text></View>
          </View>
        </View>

        {/* Elaborado / Aprobado */}
        <View style={s.footer}>
          <View style={s.footerRow}>
            <View style={s.signBox}>
              <Text style={[s.bold, s.text, s.mb4]}>Elaborado y revisado</Text>
              <View style={[s.row, s.mb4]}><Text style={s.bold}>Cargo: </Text><Text>{specs?.cargo_elaborado || '-'}</Text></View>
              <View style={[s.row, s.mb4]}><Text style={s.bold}>Nombre: </Text><Text>{specs?.elaborado_por || '-'}</Text></View>
              <View style={s.row}><Text style={s.bold}>Fecha: </Text><Text>{specs?.fecha_elaboracion ? formatDate(specs.fecha_elaboracion) : '-'}</Text></View>
            </View>
            <View style={s.signBox}>
              <Text style={[s.bold, s.text, s.mb4]}>Aprobado</Text>
              <View style={[s.row, s.mb4]}><Text style={s.bold}>Cargo: </Text><Text>{specs?.cargo_aprobado || '-'}</Text></View>
              <View style={[s.row, s.mb4]}><Text style={s.bold}>Nombre: </Text><Text>{specs?.aprobado_por || '-'}</Text></View>
              <View style={s.row}><Text style={s.bold}>Fecha: </Text><Text>{specs?.fecha_aprobacion ? formatDate(specs.fecha_aprobacion) : '-'}</Text></View>
            </View>
          </View>
        </View>

        <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', textAlign: 'right', marginTop: 8 }}>FIN DEL DOCUMENTO.</Text>
        <Text style={s.pageId}>PG-2</Text>
        <Text style={s.pageNum} render={({ pageNumber, totalPages }) => `Pagina ${pageNumber} de ${totalPages}`} fixed />
      </Page>
    </Document>
  )
}

// --- Data fetcher & generator ---

async function fetchFichaTecnicaData(productId: string): Promise<FichaTecnicaData> {
  // Fetch product
  const { data: product } = await supabase
    .from('products')
    .select('name, weight, category, description')
    .eq('id', productId)
    .single()

  // Fetch technical specs
  const { data: specs } = await supabase
    .from('product_technical_specs')
    .select('*')
    .eq('product_id', productId)
    .maybeSingle()

  // Fetch quality specs
  const { data: qualitySpecs } = await supabase
    .from('product_quality_specs')
    .select('*')
    .eq('product_id', productId)
    .maybeSingle()

  // Fetch BOM with PP recursion
  const { data: bomItems } = await supabase
    .schema('produccion')
    .from('bill_of_materials')
    .select('*')
    .eq('product_id', productId)
    .eq('is_active', true)
    .order('created_at', { ascending: true })

  let ingredients: BOMIngredient[] = []
  if (bomItems && bomItems.length > 0) {
    const materialIds = bomItems.map(b => b.material_id)
    const { data: materials } = await supabase
      .from('products')
      .select('id, name, unit, category')
      .in('id', materialIds)

    for (const bomItem of bomItems) {
      const material = materials?.find(m => m.id === bomItem.material_id)
      const isPP = material?.category === 'PP'
      const ing: BOMIngredient = {
        material_id: bomItem.material_id,
        material_name: material?.name || 'Desconocido',
        quantity_needed: bomItem.original_quantity || bomItem.quantity_needed,
        unit_name: bomItem.unit_name || material?.unit || '',
        category: material?.category || '',
        is_pp: isPP,
      }

      if (isPP) {
        const { data: ppBom } = await supabase
          .schema('produccion')
          .from('bill_of_materials')
          .select('*')
          .eq('product_id', bomItem.material_id)
          .eq('is_active', true)

        if (ppBom && ppBom.length > 0) {
          const ppMatIds = ppBom.map(p => p.material_id)
          const { data: ppMats } = await supabase
            .from('products')
            .select('id, name, unit, category')
            .in('id', ppMatIds)

          ing.pp_ingredients = ppBom.map(p => {
            const m = ppMats?.find(pm => pm.id === p.material_id)
            return {
              material_id: p.material_id,
              material_name: m?.name || 'Desconocido',
              quantity_needed: p.original_quantity || p.quantity_needed,
              unit_name: p.unit_name || m?.unit || '',
              category: m?.category || '',
              is_pp: false,
            }
          })
        }
      }

      ingredients.push(ing)
    }
  }

  // Fetch production route (operations in sequence)
  const { data: routeData } = await supabase
    .schema('produccion')
    .from('production_routes')
    .select(`
      sequence_order,
      work_center:work_centers(
        operation:operations(name, color)
      )
    `)
    .eq('product_id', productId)
    .eq('is_active', true)
    .order('sequence_order')

  const routeSteps: RouteStep[] = (routeData || []).map((r: any) => ({
    sequence_order: r.sequence_order,
    operation_name: r.work_center?.operation?.name || 'Operación',
    operation_color: r.work_center?.operation?.color || null,
  }))

  // Fetch primary product photo
  const { data: primaryMedia } = await supabase
    .from('product_media')
    .select('file_url')
    .eq('product_id', productId)
    .eq('is_primary', true)
    .maybeSingle()

  const categoryName = product?.category === 'PT'
    ? 'PRODUCTO HOJALDRADO Y SEMIHOJALDRADO VARIEDAD'
    : product?.category === 'PP'
    ? 'PRODUCTO EN PROCESO'
    : 'PRODUCTO'

  // Build absolute logo URL for PDF rendering
  const logoUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/Logo_Pastry-06.jpg`
    : '/Logo_Pastry-06.jpg'

  return {
    productName: product?.name || '',
    productWeight: product?.weight || '',
    productCategory: categoryName,
    productDescription: product?.description || '',
    specs: specs as TechnicalSpec | null,
    qualitySpecs,
    ingredients,
    logoUrl,
    productPhotoUrl: primaryMedia?.file_url || undefined,
    routeSteps,
  }
}

export async function generateFichaTecnicaPDF(productId: string) {
  const data = await fetchFichaTecnicaData(productId)
  const { pdf } = await import('@react-pdf/renderer')
  const blob = await pdf(<FichaTecnicaDocument data={data} />).toBlob()

  // Download
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const cleanName = data.productName.replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ ]/g, '').replace(/\s+/g, '_')
  a.href = url
  a.download = `Ficha_Tecnica_${cleanName}_${data.productWeight}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
