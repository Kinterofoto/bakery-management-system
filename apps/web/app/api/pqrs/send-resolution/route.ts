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
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase env vars")
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: pqrs, error } = await (supabase
      .schema("qms" as any))
      .from("pqrs")
      .select("*")
      .eq("id", pqrsId)
      .single()

    if (error) {
      console.error("Supabase error fetching PQRS:", error)
      return NextResponse.json({ error: "PQRS not found", detail: error.message }, { status: 404 })
    }

    if (!pqrs) {
      return NextResponse.json({ error: "PQRS not found" }, { status: 404 })
    }

    // Call FastAPI to send the email
    try {
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
        return NextResponse.json({ error: "Failed to send email", detail: err }, { status: 502 })
      }
    } catch (fetchErr: any) {
      console.error("FastAPI connection error:", fetchErr.message)
      return NextResponse.json(
        { error: "Could not connect to email service", detail: fetchErr.message },
        { status: 502 }
      )
    }

    return NextResponse.json({ status: "sent" })
  } catch (err: any) {
    console.error("Error in send-resolution:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
