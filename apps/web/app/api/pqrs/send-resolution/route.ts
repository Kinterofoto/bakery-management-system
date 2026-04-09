import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export async function POST(request: Request) {
  try {
    const { pqrsId } = await request.json()

    if (!pqrsId) {
      return NextResponse.json({ error: "pqrsId is required" }, { status: 400 })
    }

    // Use service role to read PQRS data
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: pqrs, error } = await supabase
      .schema("qms" as any)
      .from("pqrs")
      .select("*")
      .eq("id", pqrsId)
      .single()

    if (error || !pqrs) {
      return NextResponse.json({ error: "PQRS not found" }, { status: 404 })
    }

    // Call FastAPI to send the email
    const res = await fetch(`${API_URL}/api/pqrs/send-resolution`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_name: pqrs.client_name,
        client_email: pqrs.client_email,
        pqrs_type: pqrs.pqrs_type,
        product_name: pqrs.product_name,
        product_lot: pqrs.product_lot,
        description: pqrs.description,
        resolution_notes: pqrs.resolution_notes,
        resolution_method: pqrs.resolution_method,
        action_plan: pqrs.action_plan,
        pqrs_id: pqrs.id,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error("FastAPI email error:", err)
      return NextResponse.json({ error: "Failed to send email" }, { status: 500 })
    }

    return NextResponse.json({ status: "sent" })
  } catch (err: any) {
    console.error("Error sending PQRS resolution:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
