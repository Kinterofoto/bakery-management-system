"use client"

import { useState, useMemo } from "react"
import { ArrowLeft, Thermometer, Droplets, Gauge, RefreshCw, Wifi, WifiOff } from "lucide-react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useSensorReadings } from "@/hooks/use-sensor-readings"
import { SensorChart } from "@/components/iot/SensorChart"

export default function IoTPage() {
  const [hours, setHours] = useState(4)
  const { readings, loading, refetch } = useSensorReadings({ hours, pollInterval: 30000 })

  const { tempData, humData, latest } = useMemo(() => {
    const last = readings.length > 0 ? readings[readings.length - 1] : null
    return {
      tempData: readings
        .filter(r => r.temperatura != null)
        .map(r => ({
          time: new Date(r.created_at).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }),
          value: r.temperatura!,
        })),
      humData: readings
        .filter(r => r.humedad != null)
        .map(r => ({
          time: new Date(r.created_at).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }),
          value: r.humedad!,
        })),
      latest: last,
    }
  }, [readings])

  const isOnline = latest &&
    (Date.now() - new Date(latest.created_at).getTime()) < 300000

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">IoT Sensores</h1>
            <p className="text-sm text-muted-foreground">Monitoreo en tiempo real</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isOnline ? "default" : "destructive"} className="gap-1">
            {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {isOnline ? "En línea" : "Desconectado"}
          </Badge>
          <Button variant="outline" size="sm" onClick={refetch}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Current Values */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Temperatura</p>
                <p className="text-3xl font-bold">
                  {latest?.temperatura != null ? `${latest.temperatura.toFixed(1)}°C` : "--"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Cuarto de congelación #1</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Thermometer className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Humedad</p>
                <p className="text-3xl font-bold">
                  {latest?.humedad != null ? `${latest.humedad.toFixed(1)}%` : "--"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Cuarto de congelación #1</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-cyan-100 flex items-center justify-center">
                <Droplets className="h-6 w-6 text-cyan-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Índice de Calor</p>
                <p className="text-3xl font-bold">
                  {latest?.indice_calor != null ? `${latest.indice_calor.toFixed(1)}°C` : "--"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Cuarto de congelación #1</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
                <Gauge className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Time Range Filter */}
      <div className="flex gap-2">
        {[1, 4, 12, 24].map(h => (
          <Button
            key={h}
            variant={hours === h ? "default" : "outline"}
            size="sm"
            onClick={() => setHours(h)}
          >
            {h}h
          </Button>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Thermometer className="h-4 w-4 text-blue-600" />
              Temperatura °C
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SensorChart
              data={tempData}
              dataKey="value"
              color="#2563eb"
              label="Temperatura"
              unit="°C"
              loading={loading}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Droplets className="h-4 w-4 text-cyan-600" />
              Humedad %
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SensorChart
              data={humData}
              dataKey="value"
              color="#0891b2"
              label="Humedad"
              unit="%"
              loading={loading}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
