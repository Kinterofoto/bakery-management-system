"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { useTechnicalSpecs, TechnicalSpec, StorageTemperatureCondition, useBOMIngredients } from "@/hooks/use-nucleo-product"
import { useQualitySpecs } from "@/hooks/use-nucleo-product"
import {
  AlertCircle, Edit2, Save, X, Loader2, Plus, Trash2,
  FileText, Package, Thermometer, ShieldCheck, Utensils,
  ClipboardList, Scale, Eye, Microscope, Clock, UserCheck, FileDown,
  Camera, Upload, Star
} from "lucide-react"
import { useProductMedia } from "@/hooks/use-product-media"

const DEFAULT_TEMP_CONDITIONS: StorageTemperatureCondition[] = [
  { label: 'Transporte primer destino (°C)', min_temp: -18, max_temp: -22 },
  { label: 'Transporte segundo destino (°C)', min_temp: -18, max_temp: -22 },
  { label: 'Recepción en cliente (°C)', min_temp: -18, max_temp: -22 },
  { label: 'Recepción en cliente condicionado', min_temp: -18, max_temp: -22 },
  { label: 'Almacenamiento en cliente (°C)', min_temp: -18, max_temp: -22 },
]

const DEFAULT_MICRO_SPECS = [
  { parametro: 'Salmonella sp.', unidades: 'Ausencia/Presencia/25 g ó mL', especificacion: 'Ausencia', metodo: 'ISO 6579-1:2017' },
  { parametro: 'Staphylococcus aureus coagulasa positiva (35°C)', unidades: 'UFC/g ó mL', especificacion: '<100', metodo: 'ISO 6888-1:2021' },
  { parametro: 'Escherichia coli', unidades: 'UFC/g ó mL', especificacion: '<10', metodo: 'NTC 4458:2018' },
  { parametro: 'Bacillus cereus', unidades: 'UFC/g ó mL', especificacion: '<100', metodo: 'AOAC Ed. 22nd,2023. 980.31' },
]

const DEFAULT_MANIPULACION_TRANSPORTE =
  'Durante el transporte y almacenamiento mantener el producto bajo las condiciones de temperatura recomendada. No someter a variaciones de temperatura, mantener alejado de otros productos que puedan generar contaminación cruzada. Evitar dejar caer y golpear el producto.'

interface TechnicalSpecsTabProps {
  productId: string
  productName?: string
  productWeight?: string
  onGeneratePDF?: () => void
}

export function TechnicalSpecsTab({ productId, productName, productWeight, onGeneratePDF }: TechnicalSpecsTabProps) {
  const { specs, loading, upsertSpecs, refetch } = useTechnicalSpecs(productId)
  const { specs: qualitySpecs, loading: loadingQuality, upsertSpecs: upsertQuality } = useQualitySpecs(productId)
  const { ingredients, loading: loadingBOM } = useBOMIngredients(productId)
  const { media, uploading, uploadImage, deleteImage, setPrimaryImage } = useProductMedia(productId)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form state
  const [form, setForm] = useState<Partial<TechnicalSpec>>({
    manipulacion_transporte: DEFAULT_MANIPULACION_TRANSPORTE,
  })
  const [sensoryForm, setSensoryForm] = useState<Record<string, string>>({})
  const [microForm, setMicroForm] = useState<Array<{ parametro: string; unidades: string; especificacion: string; metodo: string }>>(DEFAULT_MICRO_SPECS)
  const [tempConditions, setTempConditions] = useState<StorageTemperatureCondition[]>(DEFAULT_TEMP_CONDITIONS)

  // Initialize form when specs load
  useEffect(() => {
    if (specs) {
      setForm({
        ...specs,
        manipulacion_transporte: specs.manipulacion_transporte || DEFAULT_MANIPULACION_TRANSPORTE,
      })
      const dbTemp = specs.condiciones_almacenamiento_temp
      setTempConditions(Array.isArray(dbTemp) && dbTemp.length > 0 ? dbTemp : DEFAULT_TEMP_CONDITIONS)
    }
  }, [specs])

  useEffect(() => {
    if (qualitySpecs) {
      setSensoryForm((qualitySpecs.sensory_attributes as Record<string, string>) || {
        apariencia: '',
        color: '',
        olor: '',
        textura: '',
      })
      const dbMicro = qualitySpecs.microbiological_specs as any[]
      setMicroForm(Array.isArray(dbMicro) && dbMicro.length > 0 ? dbMicro : DEFAULT_MICRO_SPECS)
    }
  }, [qualitySpecs])

  const handleSave = async () => {
    try {
      setSaving(true)
      await upsertSpecs({
        ...form,
        manipulacion_transporte: form.manipulacion_transporte || DEFAULT_MANIPULACION_TRANSPORTE,
        condiciones_almacenamiento_temp: (tempConditions.length > 0 ? tempConditions : DEFAULT_TEMP_CONDITIONS) as any,
      })
      await upsertQuality({
        sensory_attributes: sensoryForm,
        microbiological_specs: (microForm.length > 0 ? microForm : DEFAULT_MICRO_SPECS) as any,
      })
      setIsEditing(false)
      refetch()
    } catch {
      // errors handled in hooks
    } finally {
      setSaving(false)
    }
  }

  const updateForm = (key: keyof TechnicalSpec, value: any) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const updateArrayField = (key: 'allergens' | 'trazas_alergenos' | 'empaque_primario' | 'empaque_secundario', value: string) => {
    const arr = value.split(',').map(s => s.trim()).filter(Boolean)
    setForm(prev => ({ ...prev, [key]: arr }))
  }

  // Build ingredient list text from BOM
  const buildIngredientList = (): string => {
    if (!ingredients || ingredients.length === 0) return ''
    const parts: string[] = []
    for (const ing of ingredients) {
      if (ing.is_pp && ing.pp_ingredients && ing.pp_ingredients.length > 0) {
        const subParts = ing.pp_ingredients.map(sub => sub.material_name.toLowerCase()).join(', ')
        parts.push(`${ing.material_name.toLowerCase()} (${subParts})`)
      } else {
        parts.push(ing.material_name.toLowerCase())
      }
    }
    return parts.join(', ')
  }

  if (loading || loadingQuality) {
    return <div className="text-center py-12">Cargando...</div>
  }

  const currentAllergens = form.allergens || specs?.allergens || []
  const currentTrazas = form.trazas_alergenos || specs?.trazas_alergenos || []
  const ingredientListText = buildIngredientList()

  return (
    <div className="space-y-4">
      {/* Header with edit/save controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Ficha Técnica de Producto Terminado
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {specs?.codigo_ficha || 'FO-77'} Versión: {specs?.version_ficha || '-'}
                {specs?.fecha_publicacion_ficha && ` | Publicación: ${new Date(specs.fecha_publicacion_ficha).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}`}
              </p>
            </div>
            <div className="flex gap-2">
              {onGeneratePDF && (
                <Button onClick={onGeneratePDF} variant="outline" size="sm">
                  <FileDown className="h-4 w-4 mr-2" />
                  Generar PDF
                </Button>
              )}
              {!isEditing ? (
                <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
                  <Edit2 className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              ) : (
                <>
                  <Button onClick={() => setIsEditing(false)} variant="outline" size="sm" disabled={saving}>
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                  <Button onClick={handleSave} size="sm" disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    {saving ? 'Guardando...' : 'Guardar'}
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Accordion sections */}
      <Card>
        <CardContent className="pt-6">
          <Accordion type="multiple" defaultValue={["foto_producto", "identificacion", "descripcion"]} className="w-full">

            {/* 0. Foto del Producto */}
            <AccordionItem value="foto_producto">
              <AccordionTrigger className="text-base font-semibold hover:no-underline">
                <span className="flex items-center gap-2">
                  <Camera className="h-4 w-4 text-violet-600" />
                  Foto del Producto (en Cruz)
                  {media.length > 0 && <Badge variant="secondary" className="ml-2">{media.length}</Badge>}
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-2">
                  {/* Upload area */}
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 px-4 py-2 border border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                      <Upload className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {uploading ? 'Subiendo...' : 'Cargar foto'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploading}
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (file) await uploadImage(file)
                          e.target.value = ''
                        }}
                      />
                    </label>
                    <p className="text-xs text-muted-foreground">
                      La foto marcada como principal aparecerá en el PDF de la ficha técnica.
                    </p>
                  </div>

                  {/* Photo grid */}
                  {media.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {media.map((item) => (
                        <div key={item.id} className="relative group border rounded-lg overflow-hidden">
                          <img
                            src={item.file_url}
                            alt={item.file_name || 'Foto producto'}
                            className="w-full h-40 object-cover"
                          />
                          {item.is_primary && (
                            <div className="absolute top-2 left-2">
                              <Badge className="bg-yellow-500 text-white text-xs">
                                <Star className="h-3 w-3 mr-1 fill-white" />
                                Principal
                              </Badge>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            {!item.is_primary && (
                              <Button
                                variant="secondary"
                                size="sm"
                                className="text-xs"
                                onClick={() => setPrimaryImage(item.id)}
                              >
                                <Star className="h-3 w-3 mr-1" />
                                Principal
                              </Button>
                            )}
                            <Button
                              variant="destructive"
                              size="sm"
                              className="text-xs"
                              onClick={() => deleteImage(item.id, item.file_url)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                      <Camera className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No hay fotos del producto.</p>
                      <p className="text-xs mt-1">Suba una foto en cruz del producto para incluirla en la ficha técnica.</p>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* 1. Identificación */}
            <AccordionItem value="identificacion">
              <AccordionTrigger className="text-base font-semibold hover:no-underline">
                <span className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-600" />
                  Identificación del Producto
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div>
                    <Label className="text-sm text-muted-foreground">Código Ficha</Label>
                    {isEditing ? (
                      <Input value={form.codigo_ficha || ''} onChange={e => updateForm('codigo_ficha', e.target.value)} placeholder="FO-77" />
                    ) : (
                      <p className="text-sm font-medium">{specs?.codigo_ficha || '-'}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Versión</Label>
                    {isEditing ? (
                      <Input value={form.version_ficha || ''} onChange={e => updateForm('version_ficha', e.target.value)} placeholder="6.0" />
                    ) : (
                      <p className="text-sm font-medium">{specs?.version_ficha || '-'}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Fecha de Publicación</Label>
                    {isEditing ? (
                      <Input type="date" value={form.fecha_publicacion_ficha || ''} onChange={e => updateForm('fecha_publicacion_ficha', e.target.value)} />
                    ) : (
                      <p className="text-sm font-medium">
                        {specs?.fecha_publicacion_ficha ? new Date(specs.fecha_publicacion_ficha).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' }) : '-'}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Notificación Sanitaria</Label>
                    {isEditing ? (
                      <Input value={form.notificacion_sanitaria || ''} onChange={e => updateForm('notificacion_sanitaria', e.target.value)} placeholder="NSA-XXXXXXX-XXXX" />
                    ) : (
                      <p className="text-sm font-medium">{specs?.notificacion_sanitaria || '-'}</p>
                    )}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* 2. Descripción y Uso */}
            <AccordionItem value="descripcion">
              <AccordionTrigger className="text-base font-semibold hover:no-underline">
                <span className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-green-600" />
                  Descripción y Uso Previsto
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-2">
                  <div>
                    <Label className="text-sm text-muted-foreground">Descripción del Producto</Label>
                    {isEditing ? (
                      <Textarea value={form.custom_attributes?.descripcion_producto || ''} onChange={e => updateForm('custom_attributes', { ...form.custom_attributes, descripcion_producto: e.target.value })} rows={3} placeholder="Producto elaborado a partir de..." />
                    ) : (
                      <p className="text-sm">{(specs?.custom_attributes as any)?.descripcion_producto || '-'}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Uso Previsto</Label>
                    {isEditing ? (
                      <Textarea value={form.uso_previsto || ''} onChange={e => updateForm('uso_previsto', e.target.value)} rows={3} placeholder="Producto semielaborado ultracongelado diseñado para..." />
                    ) : (
                      <p className="text-sm">{specs?.uso_previsto || '-'}</p>
                    )}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* 3. Lista de Ingredientes (from BOM) */}
            <AccordionItem value="ingredientes">
              <AccordionTrigger className="text-base font-semibold hover:no-underline">
                <span className="flex items-center gap-2">
                  <Utensils className="h-4 w-4 text-orange-600" />
                  Lista de Componentes / Ingredientes
                  {ingredients.length > 0 && <Badge variant="secondary" className="ml-2">{ingredients.length}</Badge>}
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-2">
                  {loadingBOM ? (
                    <p className="text-sm text-muted-foreground">Cargando BOM...</p>
                  ) : ingredients.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                      <Utensils className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No hay BOM configurado para este producto.</p>
                      <p className="text-xs mt-1">Configure el BOM en el módulo de Producción.</p>
                    </div>
                  ) : (
                    <>
                      {/* Ingredient table */}
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-muted/50">
                            <tr>
                              <th className="text-left px-3 py-2 font-medium">Material</th>
                              <th className="text-left px-3 py-2 font-medium">Tipo</th>
                              <th className="text-right px-3 py-2 font-medium">Cantidad</th>
                              <th className="text-left px-3 py-2 font-medium">Unidad</th>
                            </tr>
                          </thead>
                          <tbody>
                            {ingredients.map((ing, idx) => (
                              <React.Fragment key={ing.material_id}>
                                <tr className={idx % 2 === 0 ? 'bg-white' : 'bg-muted/20'}>
                                  <td className="px-3 py-2 font-medium">{ing.material_name}</td>
                                  <td className="px-3 py-2">
                                    <Badge variant={ing.is_pp ? 'default' : 'outline'} className="text-xs">
                                      {ing.category}
                                    </Badge>
                                  </td>
                                  <td className="px-3 py-2 text-right font-mono">{ing.quantity_needed.toFixed(2)}</td>
                                  <td className="px-3 py-2">{ing.unit_name}</td>
                                </tr>
                                {/* PP sub-ingredients */}
                                {ing.is_pp && ing.pp_ingredients?.map(sub => (
                                  <tr key={`${ing.material_id}-${sub.material_id}`} className="bg-blue-50/50">
                                    <td className="px-3 py-1.5 pl-8 text-xs text-muted-foreground">↳ {sub.material_name}</td>
                                    <td className="px-3 py-1.5">
                                      <Badge variant="outline" className="text-xs">{sub.category}</Badge>
                                    </td>
                                    <td className="px-3 py-1.5 text-right font-mono text-xs">{sub.quantity_needed.toFixed(2)}</td>
                                    <td className="px-3 py-1.5 text-xs">{sub.unit_name}</td>
                                  </tr>
                                ))}
                              </React.Fragment>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Text format ingredient list */}
                      <div>
                        <Label className="text-sm text-muted-foreground">Lista de ingredientes (texto)</Label>
                        <p className="text-xs mt-1 p-3 bg-muted/30 rounded-lg leading-relaxed">
                          <strong>INGREDIENTES:</strong> {ingredientListText || 'No disponible'}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* 4. Alérgenos */}
            <AccordionItem value="alergenos">
              <AccordionTrigger className="text-base font-semibold hover:no-underline">
                <span className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-red-600" />
                  Alérgenos
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-2">
                  <div>
                    <Label className="text-sm text-muted-foreground">Alérgenos (separados por coma)</Label>
                    {isEditing ? (
                      <Input
                        value={(form.allergens || []).join(', ')}
                        onChange={e => updateArrayField('allergens', e.target.value)}
                        placeholder="GLUTEN, LACTOSA, ALMENDRAS, HUEVO"
                      />
                    ) : (
                      <div className="flex flex-wrap gap-2 mt-1">
                        {currentAllergens.length > 0 ? currentAllergens.map((a, i) => (
                          <Badge key={i} variant="destructive">{a}</Badge>
                        )) : <p className="text-sm text-muted-foreground">No especificados</p>}
                      </div>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Puede contener trazas de (separados por coma)</Label>
                    {isEditing ? (
                      <Input
                        value={(form.trazas_alergenos || []).join(', ')}
                        onChange={e => updateArrayField('trazas_alergenos', e.target.value)}
                        placeholder="SOYA, MANÍ, AVELLANAS, APIO, AJONJOLÍ"
                      />
                    ) : (
                      <div className="flex flex-wrap gap-2 mt-1">
                        {currentTrazas.length > 0 ? currentTrazas.map((t, i) => (
                          <Badge key={i} variant="secondary">{t}</Badge>
                        )) : <p className="text-sm text-muted-foreground">No especificados</p>}
                      </div>
                    )}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* 5. Proceso de Elaboración */}
            <AccordionItem value="proceso">
              <AccordionTrigger className="text-base font-semibold hover:no-underline">
                <span className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-purple-600" />
                  Proceso de Elaboración
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="pt-2">
                  {isEditing ? (
                    <Textarea
                      value={form.proceso_elaboracion || ''}
                      onChange={e => updateForm('proceso_elaboracion', e.target.value)}
                      rows={4}
                      placeholder="Recepción de materias primas, pesaje y adición..."
                    />
                  ) : (
                    <p className="text-sm">{specs?.proceso_elaboracion || 'No especificado'}</p>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* 6. Empaque */}
            <AccordionItem value="empaque">
              <AccordionTrigger className="text-base font-semibold hover:no-underline">
                <span className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-amber-600" />
                  Empaque
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div>
                    <Label className="text-sm text-muted-foreground">Empaque Primario (separados por coma)</Label>
                    {isEditing ? (
                      <Input
                        value={(form.empaque_primario || []).join(', ')}
                        onChange={e => updateArrayField('empaque_primario', e.target.value)}
                        placeholder="BOPP, PEAD, PP"
                      />
                    ) : (
                      <div className="flex flex-wrap gap-2 mt-1">
                        {(specs?.empaque_primario || []).length > 0 ? specs!.empaque_primario!.map((e, i) => (
                          <Badge key={i} variant="outline">{e}</Badge>
                        )) : <p className="text-sm text-muted-foreground">-</p>}
                      </div>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Empaque Secundario (separados por coma)</Label>
                    {isEditing ? (
                      <Input
                        value={(form.empaque_secundario || []).join(', ')}
                        onChange={e => updateArrayField('empaque_secundario', e.target.value)}
                        placeholder="Cartón corrugado, Canastilla plástica"
                      />
                    ) : (
                      <div className="flex flex-wrap gap-2 mt-1">
                        {(specs?.empaque_secundario || []).length > 0 ? specs!.empaque_secundario!.map((e, i) => (
                          <Badge key={i} variant="outline">{e}</Badge>
                        )) : <p className="text-sm text-muted-foreground">-</p>}
                      </div>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Tipo de Empaque</Label>
                    {isEditing ? (
                      <Input value={form.packaging_type || ''} onChange={e => updateForm('packaging_type', e.target.value)} />
                    ) : (
                      <p className="text-sm">{specs?.packaging_type || '-'}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Unidades por Caja</Label>
                    {isEditing ? (
                      <Input type="number" value={form.packaging_units_per_box || ''} onChange={e => updateForm('packaging_units_per_box', parseInt(e.target.value) || null)} />
                    ) : (
                      <p className="text-sm">{specs?.packaging_units_per_box || '-'}</p>
                    )}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* 7. Características del Producto (Pesos) */}
            <AccordionItem value="pesos">
              <AccordionTrigger className="text-base font-semibold hover:no-underline">
                <span className="flex items-center gap-2">
                  <Scale className="h-4 w-4 text-teal-600" />
                  Características del Producto
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div>
                    <Label className="text-sm text-muted-foreground">Peso Medio (g)</Label>
                    {isEditing ? (
                      <Input type="number" step="0.1" value={form.peso_medio || ''} onChange={e => updateForm('peso_medio', parseFloat(e.target.value) || null)} />
                    ) : (
                      <p className="text-sm font-medium">{specs?.peso_medio || '-'}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Peso Mínimo (g)</Label>
                    {isEditing ? (
                      <Input type="number" step="0.1" value={form.peso_minimo || ''} onChange={e => updateForm('peso_minimo', parseFloat(e.target.value) || null)} />
                    ) : (
                      <p className="text-sm font-medium">{specs?.peso_minimo || '-'}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Peso Máximo (g)</Label>
                    {isEditing ? (
                      <Input type="number" step="0.1" value={form.peso_maximo || ''} onChange={e => updateForm('peso_maximo', parseFloat(e.target.value) || null)} />
                    ) : (
                      <p className="text-sm font-medium">{specs?.peso_maximo || '-'}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Peso Neto (kg)</Label>
                    {isEditing ? (
                      <Input type="number" step="0.01" value={form.net_weight || ''} onChange={e => updateForm('net_weight', parseFloat(e.target.value) || null)} />
                    ) : (
                      <p className="text-sm font-medium">{specs?.net_weight || '-'}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Peso Bruto (kg)</Label>
                    {isEditing ? (
                      <Input type="number" step="0.01" value={form.gross_weight || ''} onChange={e => updateForm('gross_weight', parseFloat(e.target.value) || null)} />
                    ) : (
                      <p className="text-sm font-medium">{specs?.gross_weight || '-'}</p>
                    )}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* 8. Propiedades Sensoriales */}
            <AccordionItem value="sensoriales">
              <AccordionTrigger className="text-base font-semibold hover:no-underline">
                <span className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-pink-600" />
                  Propiedades Sensoriales
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  {['apariencia', 'color', 'olor', 'textura'].map(key => (
                    <div key={key}>
                      <Label className="text-sm text-muted-foreground capitalize">{key === 'textura' ? 'Textura Congelado' : key.charAt(0).toUpperCase() + key.slice(1)}</Label>
                      {isEditing ? (
                        <Input
                          value={sensoryForm[key] || ''}
                          onChange={e => setSensoryForm(prev => ({ ...prev, [key]: e.target.value }))}
                          placeholder={`Descripción de ${key}`}
                        />
                      ) : (
                        <p className="text-sm">{sensoryForm[key] || '-'}</p>
                      )}
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* 9. Condiciones Microbiológicas */}
            <AccordionItem value="microbiologicas">
              <AccordionTrigger className="text-base font-semibold hover:no-underline">
                <span className="flex items-center gap-2">
                  <Microscope className="h-4 w-4 text-emerald-600" />
                  Condiciones Microbiológicas
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="pt-2">
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium">Parámetro</th>
                          <th className="text-left px-3 py-2 font-medium">Unidades</th>
                          <th className="text-left px-3 py-2 font-medium">Especificación</th>
                          <th className="text-left px-3 py-2 font-medium">Método</th>
                          {isEditing && <th className="w-10" />}
                        </tr>
                      </thead>
                      <tbody>
                        {microForm.map((row, idx) => (
                          <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-muted/20'}>
                            {isEditing ? (
                              <>
                                <td className="px-2 py-1.5"><Input className="h-8 text-xs" value={row.parametro} onChange={e => { const n = [...microForm]; n[idx].parametro = e.target.value; setMicroForm(n) }} /></td>
                                <td className="px-2 py-1.5"><Input className="h-8 text-xs" value={row.unidades} onChange={e => { const n = [...microForm]; n[idx].unidades = e.target.value; setMicroForm(n) }} /></td>
                                <td className="px-2 py-1.5"><Input className="h-8 text-xs" value={row.especificacion} onChange={e => { const n = [...microForm]; n[idx].especificacion = e.target.value; setMicroForm(n) }} /></td>
                                <td className="px-2 py-1.5"><Input className="h-8 text-xs" value={row.metodo} onChange={e => { const n = [...microForm]; n[idx].metodo = e.target.value; setMicroForm(n) }} /></td>
                                <td className="px-1">
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setMicroForm(prev => prev.filter((_, i) => i !== idx))}>
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="px-3 py-2">{row.parametro}</td>
                                <td className="px-3 py-2">{row.unidades}</td>
                                <td className="px-3 py-2 font-medium">{row.especificacion}</td>
                                <td className="px-3 py-2 text-xs text-muted-foreground">{row.metodo}</td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {isEditing && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => setMicroForm(prev => [...prev, { parametro: '', unidades: '', especificacion: '', metodo: '' }])}
                    >
                      <Plus className="h-3 w-3 mr-1" /> Agregar parámetro
                    </Button>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* 10. Condiciones de Almacenamiento */}
            <AccordionItem value="almacenamiento">
              <AccordionTrigger className="text-base font-semibold hover:no-underline">
                <span className="flex items-center gap-2">
                  <Thermometer className="h-4 w-4 text-cyan-600" />
                  Condiciones de Almacenamiento
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="pt-2">
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium">Condición</th>
                          <th className="text-center px-3 py-2 font-medium">Mínimo (°C)</th>
                          <th className="text-center px-3 py-2 font-medium">Máximo (°C)</th>
                          {isEditing && <th className="w-10" />}
                        </tr>
                      </thead>
                      <tbody>
                        {tempConditions.map((cond, idx) => (
                          <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-muted/20'}>
                            {isEditing ? (
                              <>
                                <td className="px-2 py-1.5"><Input className="h-8 text-xs" value={cond.label} onChange={e => { const n = [...tempConditions]; n[idx] = { ...n[idx], label: e.target.value }; setTempConditions(n) }} /></td>
                                <td className="px-2 py-1.5"><Input type="number" className="h-8 text-xs text-center" value={cond.min_temp} onChange={e => { const n = [...tempConditions]; n[idx] = { ...n[idx], min_temp: parseFloat(e.target.value) }; setTempConditions(n) }} /></td>
                                <td className="px-2 py-1.5"><Input type="number" className="h-8 text-xs text-center" value={cond.max_temp} onChange={e => { const n = [...tempConditions]; n[idx] = { ...n[idx], max_temp: parseFloat(e.target.value) }; setTempConditions(n) }} /></td>
                                <td className="px-1">
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setTempConditions(prev => prev.filter((_, i) => i !== idx))}>
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="px-3 py-2">{cond.label}</td>
                                <td className="px-3 py-2 text-center font-mono">{cond.min_temp}°C</td>
                                <td className="px-3 py-2 text-center font-mono">{cond.max_temp}°C</td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {isEditing && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => setTempConditions(prev => [...prev, { label: '', min_temp: -18, max_temp: -22 }])}
                    >
                      <Plus className="h-3 w-3 mr-1" /> Agregar condición
                    </Button>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* 11. Manipulación y Transporte */}
            <AccordionItem value="manipulacion">
              <AccordionTrigger className="text-base font-semibold hover:no-underline">
                <span className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-indigo-600" />
                  Manipulación y Transporte
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="pt-2">
                  {isEditing ? (
                    <Textarea
                      value={form.manipulacion_transporte || ''}
                      onChange={e => updateForm('manipulacion_transporte', e.target.value)}
                      rows={5}
                      placeholder="* Durante el transporte y almacenamiento mantener el producto bajo..."
                    />
                  ) : (
                    <div className="text-sm whitespace-pre-line">{specs?.manipulacion_transporte || 'No especificado'}</div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* 11.5 Uso No Previsto (fijo) */}
            <AccordionItem value="uso_no_previsto">
              <AccordionTrigger className="text-base font-semibold hover:no-underline">
                <span className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  Uso No Previsto
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="pt-2 p-4 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-sm text-red-800">
                    Este producto no está destinado para: recongelación una vez atemperado o descongelado, consumo sin cocción previa, consumo por personas alérgicas a gluten, huevo, almendras o lácteos, almacenamiento a temperatura ambiente prolongado, ni calentamiento en microondas directamente desde congelación.
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">Este campo es fijo y se incluye automáticamente en el PDF.</p>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* 12. Instrucciones de Preparación */}
            <AccordionItem value="preparacion">
              <AccordionTrigger className="text-base font-semibold hover:no-underline">
                <span className="flex items-center gap-2">
                  <Utensils className="h-4 w-4 text-yellow-600" />
                  Instrucciones de Preparación
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="pt-2">
                  {isEditing ? (
                    <Textarea
                      value={form.instrucciones_preparacion || ''}
                      onChange={e => updateForm('instrucciones_preparacion', e.target.value)}
                      rows={5}
                      placeholder="* Atemperar el producto antes del horneo de 10 a 15 minutos..."
                    />
                  ) : (
                    <div className="text-sm whitespace-pre-line">{specs?.instrucciones_preparacion || 'No especificado'}</div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* 13. Vida Útil */}
            <AccordionItem value="vida_util">
              <AccordionTrigger className="text-base font-semibold hover:no-underline">
                <span className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-600" />
                  Vida Útil
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div>
                    <Label className="text-sm text-muted-foreground">En congelación (días)</Label>
                    {isEditing ? (
                      <Input type="number" value={form.shelf_life_days || ''} onChange={e => updateForm('shelf_life_days', parseInt(e.target.value) || null)} />
                    ) : (
                      <p className="text-sm font-medium">{specs?.shelf_life_days ? `${specs.shelf_life_days} días` : '-'}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Temperatura ambiente (horas)</Label>
                    {isEditing ? (
                      <Input type="number" value={form.vida_util_ambiente_horas || ''} onChange={e => updateForm('vida_util_ambiente_horas', parseInt(e.target.value) || null)} />
                    ) : (
                      <p className="text-sm font-medium">{specs?.vida_util_ambiente_horas ? `${specs.vida_util_ambiente_horas} horas` : '-'}</p>
                    )}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* 14. Normatividad */}
            <AccordionItem value="normatividad">
              <AccordionTrigger className="text-base font-semibold hover:no-underline">
                <span className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-slate-600" />
                  Normatividad Vigente
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="pt-2">
                  {isEditing ? (
                    <Textarea
                      value={form.normatividad || ''}
                      onChange={e => updateForm('normatividad', e.target.value)}
                      rows={4}
                      placeholder="INOCUIDAD: Ley 9 de 1979. BPM..."
                    />
                  ) : (
                    <div className="text-sm whitespace-pre-line">{specs?.normatividad || 'No especificado'}</div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* 15. Elaborado / Aprobado */}
            <AccordionItem value="firmas">
              <AccordionTrigger className="text-base font-semibold hover:no-underline">
                <span className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-stone-600" />
                  Elaborado y Aprobado
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm">Elaborado y Revisado</h4>
                    <div>
                      <Label className="text-sm text-muted-foreground">Cargo</Label>
                      {isEditing ? (
                        <Input value={form.cargo_elaborado || ''} onChange={e => updateForm('cargo_elaborado', e.target.value)} placeholder="Analista de calidad" />
                      ) : (
                        <p className="text-sm">{specs?.cargo_elaborado || '-'}</p>
                      )}
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Nombre</Label>
                      {isEditing ? (
                        <Input value={form.elaborado_por || ''} onChange={e => updateForm('elaborado_por', e.target.value)} />
                      ) : (
                        <p className="text-sm font-medium">{specs?.elaborado_por || '-'}</p>
                      )}
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Fecha</Label>
                      {isEditing ? (
                        <Input type="date" value={form.fecha_elaboracion || ''} onChange={e => updateForm('fecha_elaboracion', e.target.value)} />
                      ) : (
                        <p className="text-sm">{specs?.fecha_elaboracion ? new Date(specs.fecha_elaboracion).toLocaleDateString('es-CO') : '-'}</p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm">Aprobado</h4>
                    <div>
                      <Label className="text-sm text-muted-foreground">Cargo</Label>
                      {isEditing ? (
                        <Input value={form.cargo_aprobado || ''} onChange={e => updateForm('cargo_aprobado', e.target.value)} placeholder="Director de operaciones" />
                      ) : (
                        <p className="text-sm">{specs?.cargo_aprobado || '-'}</p>
                      )}
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Nombre</Label>
                      {isEditing ? (
                        <Input value={form.aprobado_por || ''} onChange={e => updateForm('aprobado_por', e.target.value)} />
                      ) : (
                        <p className="text-sm font-medium">{specs?.aprobado_por || '-'}</p>
                      )}
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Fecha</Label>
                      {isEditing ? (
                        <Input type="date" value={form.fecha_aprobacion || ''} onChange={e => updateForm('fecha_aprobacion', e.target.value)} />
                      ) : (
                        <p className="text-sm">{specs?.fecha_aprobacion ? new Date(specs.fecha_aprobacion).toLocaleDateString('es-CO') : '-'}</p>
                      )}
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* 16. Certificaciones */}
            <AccordionItem value="certificaciones">
              <AccordionTrigger className="text-base font-semibold hover:no-underline">
                <span className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-green-600" />
                  Certificaciones
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="pt-2">
                  <Label className="text-sm text-muted-foreground">Certificaciones (separadas por coma)</Label>
                  {isEditing ? (
                    <Input
                      value={(form.certifications || []).join(', ')}
                      onChange={e => {
                        const arr = e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                        setForm(prev => ({ ...prev, certifications: arr }))
                      }}
                      placeholder="ISO 22000, HACCP, BPM"
                    />
                  ) : (
                    <div className="flex flex-wrap gap-2 mt-1">
                      {(specs?.certifications || []).length > 0 ? specs!.certifications!.map((c, i) => (
                        <Badge key={i} variant="default">{c}</Badge>
                      )) : <p className="text-sm text-muted-foreground">No especificadas</p>}
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

          </Accordion>
        </CardContent>
      </Card>
    </div>
  )
}
