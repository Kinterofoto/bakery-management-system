"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useCommercialInfo, usePriceLists } from "@/hooks/use-nucleo-product"
import { AlertCircle, DollarSign } from "lucide-react"

interface CommercialTabProps {
  productId: string
}

export function CommercialTab({ productId }: CommercialTabProps) {
  const { info, loading: loadingInfo } = useCommercialInfo(productId)
  const { priceLists, loading: loadingPrices } = usePriceLists(productId)

  if (loadingInfo || loadingPrices) {
    return <div className="text-center py-12">Cargando...</div>
  }

  return (
    <div className="space-y-4">
      {/* Commercial Information */}
      <Card>
        <CardHeader>
          <CardTitle>Información Comercial</CardTitle>
          <CardDescription>Datos de marketing y ventas</CardDescription>
        </CardHeader>
        <CardContent>
          {!info ? (
            <div className="py-8 text-center text-gray-500">
              <p>No hay información comercial configurada</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {info.commercial_name && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Nombre comercial</label>
                  <p className="text-base">{info.commercial_name}</p>
                </div>
              )}

              {info.brand && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Marca</label>
                  <p className="text-base">{info.brand}</p>
                </div>
              )}

              {info.marketing_description && (
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-600">Descripción de marketing</label>
                  <p className="text-base">{info.marketing_description}</p>
                </div>
              )}

              {info.usp && (
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-600">Propuesta única de valor</label>
                  <p className="text-base">{info.usp}</p>
                </div>
              )}

              {info.target_market && info.target_market.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Mercado objetivo</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {info.target_market.map((market, idx) => (
                      <Badge key={idx} variant="outline">{market}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {info.sales_channel && info.sales_channel.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Canales de venta</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {info.sales_channel.map((channel, idx) => (
                      <Badge key={idx} variant="outline">{channel}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {info.seasonality && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Estacionalidad</label>
                  <p className="text-base">{info.seasonality}</p>
                </div>
              )}

              {info.promotional_tags && info.promotional_tags.length > 0 && (
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-600">Etiquetas promocionales</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {info.promotional_tags.map((tag, idx) => (
                      <Badge key={idx} variant="secondary">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {info.sales_notes && (
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-600">Notas de venta</label>
                  <p className="text-base">{info.sales_notes}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Price Lists */}
      <Card>
        <CardHeader>
          <CardTitle>Listas de Precios</CardTitle>
          <CardDescription>Precios por segmento o categoría de cliente</CardDescription>
        </CardHeader>
        <CardContent>
          {priceLists.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p>No hay listas de precios configuradas</p>
            </div>
          ) : (
            <div className="space-y-3">
              {priceLists.map((priceList) => (
                <div 
                  key={priceList.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{priceList.price_list_name}</h4>
                      {!priceList.is_active && (
                        <Badge variant="secondary">Inactiva</Badge>
                      )}
                    </div>
                    {priceList.client_category && (
                      <p className="text-sm text-gray-600 mt-1">
                        Categoría: {priceList.client_category}
                      </p>
                    )}
                    {priceList.min_quantity > 1 && (
                      <p className="text-sm text-gray-600">
                        Cantidad mínima: {priceList.min_quantity}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">
                      ${priceList.price.toLocaleString('es-CO')}
                    </p>
                    {priceList.discount_percentage && (
                      <p className="text-sm text-gray-600">
                        {priceList.discount_percentage}% descuento
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
