import { NextResponse } from "next/server"

interface TemplateAnalytics {
  template_id: string
  template_name: string
  sent: number
  delivered: number
  read: number
  delivery_rate: number
  read_rate: number
}

export async function GET() {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
  const wabaId = process.env.WABA_ID

  if (!accessToken || !wabaId) {
    return NextResponse.json(
      { error: "WhatsApp API credentials not configured" },
      { status: 500 }
    )
  }

  const templates = [
    { id: "1821276051842847", name: "reporte_entregas_diario" },
    { id: "1942460246373491", name: "reporte_recepciones_diario" },
  ]

  // Calculate date range: last 30 days
  const end = Math.floor(Date.now() / 1000)
  const start = end - 30 * 24 * 60 * 60

  try {
    const results: TemplateAnalytics[] = []

    for (const template of templates) {
      const url = new URL(
        `https://graph.facebook.com/v21.0/${wabaId}/template_analytics`
      )
      url.searchParams.set("start", start.toString())
      url.searchParams.set("end", end.toString())
      url.searchParams.set("granularity", "daily")
      url.searchParams.set(
        "template_ids",
        JSON.stringify([template.id])
      )
      url.searchParams.set(
        "metric_types",
        JSON.stringify(["sent", "delivered", "read"])
      )

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        // Revalidate every 5 minutes
        next: { revalidate: 300 },
      })

      if (!response.ok) {
        console.error(
          `Failed to fetch analytics for ${template.name}:`,
          await response.text()
        )
        // Push zeroed-out entry on error so the UI still renders
        results.push({
          template_id: template.id,
          template_name: template.name,
          sent: 0,
          delivered: 0,
          read: 0,
          delivery_rate: 0,
          read_rate: 0,
        })
        continue
      }

      const data = await response.json()

      // Aggregate daily data points into totals
      let sent = 0
      let delivered = 0
      let read = 0

      const dataPoints = data?.data?.[0]?.data_points || []
      for (const point of dataPoints) {
        sent += point.sent || 0
        delivered += point.delivered || 0
        read += point.read || 0
      }

      results.push({
        template_id: template.id,
        template_name: template.name,
        sent,
        delivered,
        read,
        delivery_rate: sent > 0 ? Math.round((delivered / sent) * 100) : 0,
        read_rate: delivered > 0 ? Math.round((read / delivered) * 100) : 0,
      })
    }

    return NextResponse.json({ data: results })
  } catch (error) {
    console.error("Error fetching WhatsApp analytics:", error)
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    )
  }
}
