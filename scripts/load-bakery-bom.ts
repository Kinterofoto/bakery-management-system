/**
 * Script para cargar recetas de panadería: PP masas, PP rellenos/decorados, y PT.
 * Ejecutar: npx tsx scripts/load-bakery-bom.ts
 */

const SUPABASE_URL = "https://khwcknapjnhpxfodsahb.supabase.co"
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtod2NrbmFwam5ocHhmb2RzYWhiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjUzMTk4NywiZXhwIjoyMDY4MTA3OTg3fQ.-qZa2anhBkOjRF4V8Anr5kFT05StD3vBeYwOpATTZ44"

// ─── Helpers ───────────────────────────────────────────────
async function supabasePublic(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": "return=representation",
      ...(opts.headers || {}),
    },
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`${res.status} ${path}: ${text}`)
  return text ? JSON.parse(text) : null
}

async function supabaseProduccion(path: string, opts: RequestInit = {}) {
  return supabasePublic(path, {
    ...opts,
    headers: { "Accept-Profile": "produccion", "Content-Profile": "produccion", ...(opts.headers || {}) },
  })
}

// ─── IDs ───────────────────────────────────────────────────
const OP = {
  pesajes: "d63acd22-79e5-4c20-b6ff-b8931cc706b8",
  amasado: "3f4805cf-1e0c-47f2-b869-412a66ebd164",
  armado: "bd5854bf-c2f2-487e-be72-7504a22a09cb",
  decorado: "cec157f8-1e5e-4c89-a8cc-ea5d943df247",
  fermentacion: "69678f1e-91e4-4ddf-8814-8119107ae36b",
  ultracongelacion: "fe1534d7-7638-451a-9624-8fa81956925e",
  empaque: "3610ef5b-1a5f-4f81-a9b6-e8852de801e9",
}

const WC = {
  pesaje: "eb2f9a65-a380-4dee-841f-88b33c270e4a",
  amasado: "ef87800c-1bcf-46ae-a85d-bc9372789fc6",
  panaderia: "e5d01ccd-d375-4a3a-858a-49b6adb4932f", // Armado
  decorado: "5afec362-9d7c-459f-92dc-5431e42dc81b",
  fermentacion: "a6e95b73-19ba-47e8-9a86-3790d3ebb8a0",
  ultracongelador: "1b9a2c36-6eea-435f-88cc-143557cc71a5",
  empaque: "7ee993ff-462f-4556-8bea-a8ce3127ac54",
}

// Material map: recipe name → existing material_id
const MAT: Record<string, string> = {
  "Almidon de maiz":      "f6feccbb-adb6-424f-bd43-5f7248e1d329",
  "Almidon de yuca":      "cea90daa-0140-4c97-91e6-90d974a4793c",
  "Queso Costeño":        "0e4343b7-15af-410f-8e03-3a24a844b2fb",
  "Azucar":               "30ee7151-df25-48b1-95da-287e65ef61ef",
  "Polvo para hornear":   "bef32abf-d8c2-476f-a901-f931fc997253",
  "Polvo para Hornear":   "bef32abf-d8c2-476f-a901-f931fc997253",
  "Polvo de Hornear":     "bef32abf-d8c2-476f-a901-f931fc997253",
  "Sal":                  "88bd5fb5-e834-4415-9ee6-cd81dd737a8e",
  "Huevo":                "7e52612a-15d4-4a8a-8d85-475768e07e93",
  "Leche":                "107c086b-ed1c-4fd2-8ec0-c33f03b6cf18",
  "Fecula de yuca":       "1e327092-3eec-4c3d-850f-74948ec1fbc1",
  "Queso doblecrema":     "eaf17688-f058-49b2-bfdb-b2caa69e2cdb",
  "Margarina":            "b2791fb8-cd57-42b5-9a22-fa1f163de4a2",
  "Harina Multiproposito":"6023738a-5bb5-493e-819c-1b380cd0993b",
  "Harina de Maiz":       "6a064e49-dd94-43b4-a4f6-5deeaa819eee",
  "Harina de maiz":       "6a064e49-dd94-43b4-a4f6-5deeaa819eee",
  "Harina integral":      "8129ea89-8efb-4622-aa00-5ee9b3138406",
  "Levadura Fresca":      "c5b84919-47e0-4168-86e3-b7c094c8999c",
  "Levadura fresca":      "c5b84919-47e0-4168-86e3-b7c094c8999c",
  "Levadura":             "8d9e8e45-ace3-4244-bdcb-f9f1c9b3b8f3",
  "Leche en polvo":       "97c13413-9222-42b9-b6da-bb2643a6b6e5",
  "Agua":                 "6aae2818-3542-4d9b-a455-836f3db6d06b",
  "Cuajada":              "8168cba1-1814-4d8d-8d1b-55d12ed1c4ac",
  "Esencia de banano":    "6d1d6342-64cc-4b8f-8854-4de88d99c3f8",
  "Esencia de coco":      "d94f0de4-d543-446c-a461-0c75c4ce84f0",
  "Esencia de Mantequilla":"64dfa0f0-5b40-4ded-8663-72c52206d586",
  "Color Caramelo":       "8819e34d-3692-4bbf-9aee-e07c499ab85d",
  "Color caramelo":       "8819e34d-3692-4bbf-9aee-e07c499ab85d",
  "Aceite de oliva":      "504667e6-d7b1-498f-b234-4cc9eaa09b11",
  "Aceite Vegetal":       "202fca3e-b6b0-4cd5-9545-1cb7e15f2546",
  "Azucar Morena":        "bbcb19e8-7346-43ef-9697-239e316ad89e",
  "Bocarbonato":          "b40c81ce-7a7b-4e5c-a5d8-dd07dc3200a2",
  "Canela en polvo":      "4eb09091-b241-473b-be59-cde4a26111cd",
  "Sabor a nata":         "68ca4334-084c-44ef-a61b-3209b3b50242",
  "Vainilla":             "e9b8b82d-5695-4795-b35b-91b637b5c6ce",
  "Bocadillo liquido":    "f6cc9ba4-35b0-4a4d-9ba9-a9a0caff1edf",
  "Bocadillo solido":     "691db8c9-9835-46ab-8164-210d2f0cde99",
  "Arequipe":             "c1a13a20-44a2-4f1b-a50f-226a0d5d37df",
  "Coco Rallado":         "e21c67f3-cda7-4b2b-beb8-fae96ba34d54",
  "Miga de pan":          "4b0b9d48-627b-4963-a69a-7efeaa9c212b",
  "Semillas":             "98d52d58-6610-45ad-9aa7-f58cbf0ea03e",
  "Ajonjoli negro":       "98d52d58-6610-45ad-9aa7-f58cbf0ea03e",
  "Azucar blanco":        "f0f2b030-16fe-4bf1-81cd-70cacff1c4d6",
  "Queso Costeño (relleno)": "0e4343b7-15af-410f-8e03-3a24a844b2fb",
}

// PT IDs
const PT = {
  "Buñuelo":           "00007969-0000-4000-8000-000079690000",
  "Pan de yuca":       "00007970-0000-4000-8000-000079700000",
  "Pan de bono":       "00008415-0000-4000-8000-000084150000",
  "Almojabana":        "00007972-0000-4000-8000-000079720000",
  "Roscon":            "00007973-0000-4000-8000-000079730000",
  "Peras":             "00007974-0000-4000-8000-000079740000",
  "Pan blando":        "00007975-0000-4000-8000-000079750000",
  "Costeñito":         "00007977-0000-4000-8000-000079770000",
  "Mogolla integral":  "00007978-0000-4000-8000-000079780000",
  "Pan de coco":       "00007979-0000-4000-8000-000079790000",
  "Calentano":         "00007980-0000-4000-8000-000079800000",
  "Mojicon":           "00007981-0000-4000-8000-000079810000",
  "Cucas":             "00007982-0000-4000-8000-000079820000",
}

// ─── Data: PP Masa recipes (only "Batch" items) ───────────
interface Ingredient { name: string; grams: number }

const MASA_RECIPES: Record<string, Ingredient[]> = {
  "MASA DE BUÑUELO": [
    { name: "Almidon de maiz", grams: 768.85 },
    { name: "Almidon de yuca", grams: 95.34 },
    { name: "Queso Costeño", grams: 1506.94 },
    { name: "Azucar", grams: 44.59 },
    { name: "Polvo para hornear", grams: 4.61 },
    { name: "Sal", grams: 3.08 },
    { name: "Huevo", grams: 161.46 },
    { name: "Leche", grams: 515.13 },
  ],
  "MASA DE PAN DE YUCA": [
    { name: "Fecula de yuca", grams: 1100.25 },
    { name: "Queso doblecrema", grams: 965.13 },
    { name: "Leche", grams: 675.59 },
    { name: "Huevo", grams: 193.03 },
    { name: "Margarina", grams: 96.51 },
    { name: "Azucar", grams: 38.61 },
    { name: "Polvo de Hornear", grams: 7.72 },
    { name: "Sal", grams: 23.16 },
  ],
  "MASA DE PAN DE BONO": [
    { name: "Almidon de yuca", grams: 649.32 },
    { name: "Harina de maiz", grams: 125.68 },
    { name: "Sal", grams: 33.51 },
    { name: "Polvo para hornear", grams: 8.38 },
    { name: "Azucar", grams: 62.84 },
    { name: "Queso Costeño", grams: 1675.68 },
    { name: "Huevo", grams: 251.35 },
    { name: "Leche", grams: 251.35 },
    { name: "Margarina", grams: 41.89 },
  ],
  "MASA DE ALMOJABANA": [
    { name: "Harina de Maiz", grams: 590.85 },
    { name: "Cuajada", grams: 1575.60 },
    { name: "Azucar", grams: 118.17 },
    { name: "Sal", grams: 11.82 },
    { name: "Polvo para Hornear", grams: 15.76 },
    { name: "Huevo", grams: 196.95 },
    { name: "Leche", grams: 590.85 },
  ],
  "MASA DE ROSCON": [
    { name: "Harina Multiproposito", grams: 1019.73 },
    { name: "Agua", grams: 431.57 },
    { name: "Levadura Fresca", grams: 30.83 },
    { name: "Azucar", grams: 183.72 },
    { name: "Margarina", grams: 209.62 },
    { name: "Sal", grams: 9.86 },
    { name: "Almibar", grams: 16.03 },
    { name: "Esencia de banano", grams: 12.33 },
    { name: "Leche en polvo", grams: 86.31 },
  ],
  "MASA PAN BLANDO": [
    { name: "Harina Multiproposito", grams: 1010.99 },
    { name: "Agua", grams: 340.66 },
    { name: "Levadura Fresca", grams: 42.74 },
    { name: "Azucar", grams: 153.85 },
    { name: "Margarina", grams: 305.25 },
    { name: "Sal", grams: 19.54 },
    { name: "Huevo", grams: 85.47 },
    { name: "Sabor a nata", grams: 2.44 },
    { name: "Leche en polvo", grams: 39.07 },
  ],
  "MASA MOGOLLA INTEGRAL": [
    { name: "Harina integral", grams: 1771.43 },
    { name: "Sal", grams: 26.96 },
    { name: "Levadura fresca", grams: 127.08 },
    { name: "Agua", grams: 770.19 },
    { name: "Aceite de oliva", grams: 77.02 },
    { name: "Color Caramelo", grams: 77.02 },
    { name: "Azucar", grams: 173.29 },
    { name: "Aceite Vegetal", grams: 77.02 },
  ],
  "MASA DE PAN COCO": [
    { name: "Harina Multiproposito", grams: 1100.58 },
    { name: "Levadura fresca", grams: 69.51 },
    { name: "Azucar", grams: 278.04 },
    { name: "Huevo", grams: 173.78 },
    { name: "Margarina", grams: 196.95 },
    { name: "Leche", grams: 347.55 },
    { name: "Sal", grams: 10.43 },
    { name: "Esencia de coco", grams: 23.17 },
  ],
  "MASA DE CALENTANO": [
    { name: "Harina Multiproposito", grams: 240.53 },
    { name: "Harina de Maiz", grams: 962.14 },
    { name: "Margarina", grams: 481.07 },
    { name: "Leche en polvo", grams: 38.49 },
    { name: "Polvo para hornear", grams: 48.11 },
    // Huevo - Leche split 50/50: 635.01 total
    { name: "Huevo", grams: 317.51 },
    { name: "Leche", grams: 317.50 },
    { name: "Azucar", grams: 153.94 },
    { name: "Sal", grams: 26.94 },
    { name: "Esencia de Mantequilla", grams: 3.85 },
    { name: "Queso Costeño", grams: 481.07 },
    { name: "Levadura fresca", grams: 28.86 },
  ],
  "MASA DE MOJICON": [
    { name: "Harina Multiproposito", grams: 1238.04 },
    { name: "Sal", grams: 2.58 },
    { name: "Margarina", grams: 232.13 },
    { name: "Azucar", grams: 232.13 },
    { name: "Levadura", grams: 41.27 },
    { name: "Vainilla", grams: 9.03 },
    // Huevo - Leche split 50/50: 580.33 total
    { name: "Huevo", grams: 290.17 },
    { name: "Leche", grams: 290.16 },
    { name: "Agua", grams: 64.48 },
  ],
  "MASA DE CUCAS": [
    { name: "Harina Multiproposito", grams: 1748.25 },
    { name: "Agua", grams: 499.50 },
    { name: "Margarina", grams: 312.69 },
    { name: "Azucar Morena", grams: 1248.75 },
    { name: "Huevo", grams: 124.88 },
    { name: "Levadura", grams: 6.99 },
    { name: "Bocarbonato", grams: 3.00 },
    { name: "Sal", grams: 3.00 },
    { name: "Canela en polvo", grams: 2.97 },
    { name: "Clavo", grams: 1.05 },
    { name: "Color caramelo", grams: 79.92 },
  ],
}

// PP rellenos/decorados from "Decoración" items
const PP_RELLENOS_DECORADOS: Record<string, { ingredients: Ingredient[], isRecipeByGrams: boolean }> = {
  "RELLENO DE PAN DE BONO": {
    ingredients: [{ name: "Bocadillo liquido", grams: 1033.33 }],
    isRecipeByGrams: false,
  },
  "RELLENO DE ROSCON": {
    ingredients: [
      { name: "Bocadillo liquido", grams: 600 },
      { name: "Arequipe", grams: 600 },
      { name: "Azucar", grams: 400 },
      { name: "Bocadillo solido", grams: 1000 },
    ],
    isRecipeByGrams: true,
  },
  "RELLENO PAN BLANDO": {
    ingredients: [
      { name: "Relleno de queso", grams: 500 },
      { name: "Queso Costeño", grams: 500 },
    ],
    isRecipeByGrams: true,
  },
  "DECORADO PAN BLANDO": {
    ingredients: [{ name: "Ajonjoli negro", grams: 100 }],
    isRecipeByGrams: false,
  },
  "DECORADO MOGOLLA INTEGRAL": {
    ingredients: [{ name: "Semillas", grams: 620 }],
    isRecipeByGrams: false,
  },
  "DECORADO PAN COCO": {
    ingredients: [{ name: "Coco Rallado", grams: 220 }],
    isRecipeByGrams: false,
  },
  "DECORADO CALENTANO": {
    ingredients: [{ name: "Miga de pan", grams: 620 }],
    isRecipeByGrams: false,
  },
  "DECORADO MOJICON": {
    ingredients: [{ name: "Azucar", grams: 240 }],
    isRecipeByGrams: false,
  },
  "BRILLO 50-50": {
    ingredients: [
      { name: "Huevo", grams: 500 },
      { name: "Leche", grams: 500 },
    ],
    isRecipeByGrams: true,
  },
  "BRILLO AGUA": {
    ingredients: [
      { name: "Agua", grams: 500 },
      { name: "Huevo", grams: 500 },
    ],
    isRecipeByGrams: true,
  },
}

// PT BOM data
interface PTBomItem { materialName: string; operationId: string; quantity: number }
const PT_BOM: Record<string, PTBomItem[]> = {
  "Mogolla integral": [
    { materialName: "MASA MOGOLLA INTEGRAL", operationId: OP.armado, quantity: 15 },
    { materialName: "DECORADO MOGOLLA INTEGRAL", operationId: OP.decorado, quantity: 2 },
  ],
  "Buñuelo": [
    { materialName: "MASA DE BUÑUELO", operationId: OP.armado, quantity: 15 },
  ],
  "Pan de yuca": [
    { materialName: "MASA DE PAN DE YUCA", operationId: OP.armado, quantity: 17 },
  ],
  "Mojicon": [
    { materialName: "MASA DE MOJICON", operationId: OP.armado, quantity: 15 },
    { materialName: "DECORADO MOJICON", operationId: OP.decorado, quantity: 2 },
  ],
  "Cucas": [
    { materialName: "MASA DE CUCAS", operationId: OP.armado, quantity: 15 },
  ],
  "Peras": [
    { materialName: "MASA DE ROSCON", operationId: OP.armado, quantity: 10 },
    { materialName: "RELLENO DE ROSCON", operationId: OP.armado, quantity: 5 },
    { materialName: "AZUCAR BLANCO GENERICO", operationId: OP.decorado, quantity: 2 },
  ],
  "Costeñito": [
    { materialName: "MASA PAN BLANDO", operationId: OP.armado, quantity: 10 },
    { materialName: "RELLENO PAN BLANDO", operationId: OP.armado, quantity: 2.5 },
    { materialName: "QUESO COSTEÑO PT", operationId: OP.armado, quantity: 2.5 },
  ],
}

// PT routes
const PT_ROUTES: Record<string, string[]> = {
  "Buñuelo":          [WC.panaderia, WC.fermentacion, WC.ultracongelador, WC.empaque],
  "Pan de yuca":      [WC.panaderia, WC.fermentacion, WC.ultracongelador, WC.empaque],
  "Mojicon":          [WC.panaderia, WC.decorado, WC.fermentacion, WC.ultracongelador, WC.empaque],
  "Cucas":            [WC.panaderia, WC.fermentacion, WC.ultracongelador, WC.empaque],
  "Peras":            [WC.panaderia, WC.decorado, WC.fermentacion, WC.ultracongelador, WC.empaque],
  "Costeñito":        [WC.panaderia, WC.fermentacion, WC.ultracongelador, WC.empaque],
  "Mogolla integral": [WC.panaderia, WC.decorado, WC.fermentacion, WC.ultracongelador, WC.empaque],
}

// ─── Main ──────────────────────────────────────────────────
async function main() {
  console.log("🍞 Cargando recetas de panadería...\n")

  // ── Step 1: Create missing MP materials ──
  console.log("═══ PASO 1: Crear materiales MP faltantes ═══")
  const newMaterials: Record<string, string> = {}

  for (const matName of ["CLAVO", "ALMIBAR", "RELLENO DE QUESO"]) {
    try {
      const [existing] = await supabasePublic(`products?select=id,name&name=ilike.${encodeURIComponent(matName)}&category=eq.MP&limit=1`)
      if (existing) {
        console.log(`  ✓ ${matName} ya existe: ${existing.id}`)
        newMaterials[matName] = existing.id
      } else {
        const [created] = await supabasePublic("products", {
          method: "POST",
          body: JSON.stringify({ name: matName, category: "MP", unit: "gramos", is_active: true }),
        })
        console.log(`  + Creado MP: ${matName} → ${created.id}`)
        newMaterials[matName] = created.id
      }
    } catch (e: any) {
      console.error(`  ✗ Error con ${matName}:`, e.message)
    }
  }

  // Add to MAT map
  MAT["Clavo"] = newMaterials["CLAVO"]
  MAT["Almibar"] = newMaterials["ALMIBAR"]
  MAT["Relleno de queso"] = newMaterials["RELLENO DE QUESO"]

  // ── Step 2: Create PP masas ──
  console.log("\n═══ PASO 2: Crear PP masas ═══")
  const ppIds: Record<string, string> = {}

  for (const [ppName, ingredients] of Object.entries(MASA_RECIPES)) {
    const loteMinimo = ingredients.reduce((sum, i) => sum + i.grams, 0)

    try {
      // Check if exists
      const existing = await supabasePublic(
        `products?select=id,name&name=ilike.${encodeURIComponent(ppName)}&category=eq.PP&limit=1`
      )
      if (existing.length > 0) {
        console.log(`  ✓ ${ppName} ya existe: ${existing[0].id}`)
        ppIds[ppName] = existing[0].id
      } else {
        const [created] = await supabasePublic("products", {
          method: "POST",
          body: JSON.stringify({
            name: ppName,
            category: "PP",
            unit: "gramos",
            is_recipe_by_grams: true,
            lote_minimo: Math.round(loteMinimo * 100) / 100,
            is_active: true,
          }),
        })
        console.log(`  + Creado PP: ${ppName} (lote: ${loteMinimo.toFixed(2)}) → ${created.id}`)
        ppIds[ppName] = created.id
      }
    } catch (e: any) {
      console.error(`  ✗ Error creando ${ppName}:`, e.message)
    }
  }

  // ── Step 2b: Create routes for PP masas (Pesaje → Amasado) ──
  console.log("\n═══ PASO 2b: Crear rutas para PP masas ═══")
  for (const [ppName, ppId] of Object.entries(ppIds)) {
    try {
      // Check existing routes
      const existingRoutes = await supabaseProduccion(
        `production_routes?select=id&product_id=eq.${ppId}&limit=1`
      )
      if (existingRoutes.length > 0) {
        console.log(`  ✓ ${ppName} ya tiene rutas`)
        continue
      }

      await supabaseProduccion("production_routes", {
        method: "POST",
        body: JSON.stringify([
          { product_id: ppId, work_center_id: WC.pesaje, sequence_order: 1, is_active: true },
          { product_id: ppId, work_center_id: WC.amasado, sequence_order: 2, is_active: true },
        ]),
      })
      console.log(`  + Ruta: ${ppName} → Pesaje → Amasado`)
    } catch (e: any) {
      console.error(`  ✗ Error ruta ${ppName}:`, e.message)
    }
  }

  // ── Step 2c: Create BOM for PP masas ──
  console.log("\n═══ PASO 2c: Crear BOM para PP masas ═══")
  for (const [ppName, ingredients] of Object.entries(MASA_RECIPES)) {
    const ppId = ppIds[ppName]
    if (!ppId) { console.log(`  ⚠ Skip BOM: no ppId for ${ppName}`); continue }

    try {
      // Check existing BOM
      const existingBom = await supabaseProduccion(
        `bill_of_materials?select=id&product_id=eq.${ppId}&limit=1`
      )
      if (existingBom.length > 0) {
        console.log(`  ✓ ${ppName} ya tiene BOM`)
        continue
      }

      const total = ingredients.reduce((sum, i) => sum + i.grams, 0)
      const bomItems = ingredients.map(ing => {
        const matId = MAT[ing.name]
        if (!matId) throw new Error(`Material no encontrado: "${ing.name}"`)
        return {
          product_id: ppId,
          material_id: matId,
          operation_id: OP.pesajes,
          quantity_needed: Math.round((ing.grams / total) * 1000000) / 1000000,
          original_quantity: ing.grams,
          unit_name: "GR",
          unit_equivalence_grams: 1,
          is_active: true,
        }
      })

      await supabaseProduccion("bill_of_materials", {
        method: "POST",
        body: JSON.stringify(bomItems),
      })
      console.log(`  + BOM: ${ppName} (${ingredients.length} items, total ${total.toFixed(2)}g)`)
    } catch (e: any) {
      console.error(`  ✗ Error BOM ${ppName}:`, e.message)
    }
  }

  // ── Step 3: Create PP rellenos/decorados ──
  console.log("\n═══ PASO 3: Crear PP rellenos/decorados ═══")
  const ppRellenoIds: Record<string, string> = {}

  for (const [ppName, data] of Object.entries(PP_RELLENOS_DECORADOS)) {
    try {
      const existing = await supabasePublic(
        `products?select=id,name&name=ilike.${encodeURIComponent(ppName)}&category=eq.PP&limit=1`
      )
      if (existing.length > 0) {
        console.log(`  ✓ ${ppName} ya existe: ${existing[0].id}`)
        ppRellenoIds[ppName] = existing[0].id
      } else {
        const loteMinimo = data.ingredients.reduce((sum, i) => sum + i.grams, 0)
        const [created] = await supabasePublic("products", {
          method: "POST",
          body: JSON.stringify({
            name: ppName,
            category: "PP",
            unit: "gramos",
            is_recipe_by_grams: data.isRecipeByGrams,
            lote_minimo: Math.round(loteMinimo * 100) / 100,
            is_active: true,
          }),
        })
        console.log(`  + Creado PP: ${ppName} (lote: ${loteMinimo}) → ${created.id}`)
        ppRellenoIds[ppName] = created.id
      }
    } catch (e: any) {
      console.error(`  ✗ Error creando ${ppName}:`, e.message)
    }
  }

  // Create BOM for PP rellenos/decorados (no routes for now)
  console.log("\n═══ PASO 3b: Crear BOM para PP rellenos/decorados ═══")
  for (const [ppName, data] of Object.entries(PP_RELLENOS_DECORADOS)) {
    const ppId = ppRellenoIds[ppName]
    if (!ppId) { console.log(`  ⚠ Skip: no id for ${ppName}`); continue }

    try {
      const existingBom = await supabaseProduccion(
        `bill_of_materials?select=id&product_id=eq.${ppId}&limit=1`
      )
      if (existingBom.length > 0) {
        console.log(`  ✓ ${ppName} ya tiene BOM`)
        continue
      }

      const total = data.ingredients.reduce((sum, i) => sum + i.grams, 0)
      const bomItems = data.ingredients.map(ing => {
        const matId = MAT[ing.name]
        if (!matId) throw new Error(`Material no encontrado: "${ing.name}" para ${ppName}`)
        return {
          product_id: ppId,
          material_id: matId,
          operation_id: null, // No operation assigned for these yet
          quantity_needed: data.isRecipeByGrams
            ? Math.round((ing.grams / total) * 1000000) / 1000000
            : ing.grams,
          original_quantity: ing.grams,
          unit_name: "GR",
          unit_equivalence_grams: 1,
          is_active: true,
        }
      })

      await supabaseProduccion("bill_of_materials", {
        method: "POST",
        body: JSON.stringify(bomItems),
      })
      console.log(`  + BOM: ${ppName} (${data.ingredients.length} items)`)
    } catch (e: any) {
      console.error(`  ✗ Error BOM ${ppName}:`, e.message)
    }
  }

  // ── Step 4: Create PT routes ──
  console.log("\n═══ PASO 4: Crear rutas PT ═══")
  for (const [ptName, wcIds] of Object.entries(PT_ROUTES)) {
    const ptId = PT[ptName as keyof typeof PT]
    if (!ptId) { console.log(`  ⚠ No PT id for ${ptName}`); continue }

    try {
      const existingRoutes = await supabaseProduccion(
        `production_routes?select=id&product_id=eq.${ptId}&limit=1`
      )
      if (existingRoutes.length > 0) {
        console.log(`  ✓ ${ptName} ya tiene rutas`)
        continue
      }

      const routes = wcIds.map((wcId, i) => ({
        product_id: ptId,
        work_center_id: wcId,
        sequence_order: i + 1,
        is_active: true,
      }))

      await supabaseProduccion("production_routes", {
        method: "POST",
        body: JSON.stringify(routes),
      })
      console.log(`  + Ruta: ${ptName} → ${wcIds.length} operaciones`)
    } catch (e: any) {
      console.error(`  ✗ Error ruta ${ptName}:`, e.message)
    }
  }

  // ── Step 5: Create PT BOM ──
  console.log("\n═══ PASO 5: Crear BOM para PT ═══")

  // Build a name→id map for all PP products we created
  const allPPMap: Record<string, string> = { ...ppIds, ...ppRellenoIds }
  // Also add AZUCAR BLANCO GENERICO and QUESO COSTEÑO as direct MP refs
  allPPMap["AZUCAR BLANCO GENERICO"] = "f0f2b030-16fe-4bf1-81cd-70cacff1c4d6"
  allPPMap["QUESO COSTEÑO PT"] = "0e4343b7-15af-410f-8e03-3a24a844b2fb"

  for (const [ptName, bomItems] of Object.entries(PT_BOM)) {
    const ptId = PT[ptName as keyof typeof PT]
    if (!ptId) { console.log(`  ⚠ No PT id for ${ptName}`); continue }

    try {
      const existingBom = await supabaseProduccion(
        `bill_of_materials?select=id&product_id=eq.${ptId}&limit=1`
      )
      if (existingBom.length > 0) {
        console.log(`  ✓ ${ptName} ya tiene BOM`)
        continue
      }

      const items = bomItems.map(item => {
        const materialId = allPPMap[item.materialName]
        if (!materialId) throw new Error(`Material/PP no encontrado: "${item.materialName}" para PT ${ptName}`)
        return {
          product_id: ptId,
          material_id: materialId,
          operation_id: item.operationId,
          quantity_needed: item.quantity,
          original_quantity: item.quantity,
          unit_name: "GR",
          unit_equivalence_grams: 1,
          is_active: true,
        }
      })

      await supabaseProduccion("bill_of_materials", {
        method: "POST",
        body: JSON.stringify(items),
      })
      console.log(`  + BOM PT: ${ptName} (${items.length} items)`)
    } catch (e: any) {
      console.error(`  ✗ Error BOM PT ${ptName}:`, e.message)
    }
  }

  console.log("\n🎉 ¡Carga completa!")
}

main().catch(console.error)
