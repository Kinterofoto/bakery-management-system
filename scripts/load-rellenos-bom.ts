/**
 * Script para cargar recetas de rellenos/salsas (16 PP).
 * BOM normalizado: is_recipe_by_grams=true, fracciones suman 1.0, original_quantity=null.
 * Ejecutar: npx tsx scripts/load-rellenos-bom.ts
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
  coccion: "7ae1905d-c1bc-4984-99b4-0b38be7de0c8",
}

const WC = {
  pesaje: "eb2f9a65-a380-4dee-841f-88b33c270e4a",
  batidos: "bb971e93-7d42-47a1-b927-74727118be7e",
  // coccion will be created in Step 2
}

// Material map: recipe name → existing material_id (from DB)
const MAT: Record<string, string> = {
  "Azucar":                   "30ee7151-df25-48b1-95da-287e65ef61ef",
  "Agua":                     "6aae2818-3542-4d9b-a455-836f3db6d06b",
  "Acido citrico":            "c4e864ae-8774-4fc9-8715-888c6e53fac9",
  "Almidon de maiz":          "f6feccbb-adb6-424f-bd43-5f7248e1d329",
  "Almidon modificado":       "bdb333d0-9345-40b2-b1c5-d9ec318adc43",
  "Margarina hojaldre":       "b2791fb8-cd57-42b5-9a22-fa1f163de4a2",
  "Mantequilla":              "9fea89cd-c92e-410f-a0bc-c4dfc6600431",
  "Harina galletarina":       "925bfe21-b59f-42e2-92c8-0948063071bb",
  "Chunks chocolate":         "f6a120db-06d8-46d7-af1c-7ac769edcc53",
  "Azucar blanco":            "f0f2b030-16fe-4bf1-81cd-70cacff1c4d6",
  "Azucar morena":            "bbcb19e8-7346-43ef-9697-239e316ad89e",
  "Huevo":                    "7e52612a-15d4-4a8a-8d85-475768e07e93",
  "Esencia vainilla caramelo":"391e36d6-4222-465b-ae27-888c580cc986",
  "Polvo para hornear":       "bef32abf-d8c2-476f-a901-f931fc997253",
  "Sal":                      "88bd5fb5-e834-4415-9ee6-cd81dd737a8e",
  "Bicarbonato":              "b40c81ce-7a7b-4e5c-a5d8-dd07dc3200a2",
  "Canela":                   "4eb09091-b241-473b-be59-cde4a26111cd",
  "Manzana gala":             "f60e603d-c8ed-4b04-bb31-85ebb10ad53a",
  "Espinaca":                 "b02cea3b-9891-400a-bb7f-ab775c7ca6ea",
  "Queso ricotta":            "101f4eee-85ea-493a-882b-b21eb2f44640",
  "Aceite vegetal":           "202fca3e-b6b0-4cd5-9545-1cb7e15f2546",
  "Aceite oliva":             "504667e6-d7b1-498f-b234-4cc9eaa09b11",
  "Ajo":                      "785298e7-6b10-4826-8316-c847600657e3",
  "Ajo en polvo":             "15c206df-e7a0-433f-b11b-348e6eab9061",
  "Cebolla blanca":           "3d93d6dd-ac8c-49c4-ba13-6a42a09f755d",
  "Queso parmesano":          "780a661a-375d-415c-ac80-9fbec79a760b",
  "Albahaca":                 "fe5a3664-64f9-4f5a-abc5-019c09efb887",
  "Pimienta":                 "4baab03e-7b9e-46b6-b8db-b1ef1eb7e69d",
  "Goma guar":                "9ea3b03a-271b-4972-abcb-8ade52622db3",
  "Harina almendra":          "7cbbd305-466a-44a7-a220-81e8b98123ff",
  "Almendra tajada":          "6dbd157f-e3d9-455b-a82e-216c78137757",
  "Sabor almendras":          "22f3319b-7604-4db9-892a-2ac06bd8b3bd",
  "Leche entera":             "1dbe2936-d67a-4288-b1dc-5d26feb15ec1",
  "Crema pastelera polvo":    "159c3022-7125-4d1a-b367-4c233b294554",
  "Cernido guayaba":          "f6cc9ba4-35b0-4a4d-9ba9-a9a0caff1edf",
  "Queso campesino":          "240d349e-14a8-4eb8-8361-8fdc01d32383",
  "Queso doble crema":        "eaf17688-f058-49b2-bfdb-b2caa69e2cdb",
  "Queso crema":              "a60d29a3-0816-4bce-a0f3-0245059a340e",
  "Queso chedar":             "504f505b-e55d-42e5-97c3-be3f0be9d688",
  "Queso mozzarella":         "e8ca67e9-fd56-46ce-a58c-60d98dd7b0fc",
  "Cebollin":                 "b0a9bfa7-a6c4-4e3d-b651-cb664ae21a39",
  "Vinagre":                  "b8c805b4-ecf7-4bd8-a666-5c8adcb688a5",
  "Pasta tomate":             "d24dd930-f67d-4c1e-82c8-0aab5013dd00",
  "Oregano":                  "e064fe7c-2510-4a8b-a954-1b7c829a9ac0",
  "Laurel":                   "4d1b68fa-84e8-4640-9358-26619103f60d",
  "Tomillo":                  "73fd8b2c-0508-40b6-8353-69b52a404de6",
  "Tomate":                   "606f77c9-ed55-4fd2-86f3-5a0fa2363c62",
  "Carne molida":             "ba6f1f0b-04b0-41e2-b6de-046b22e748df",
  "Carne descargue":          "444109bc-92ab-49e1-b52b-63b06e824d59",
  "Proteina soya":            "9f04b558-8cb6-4661-9dd2-4758b779e445",
  "Proteina response":        "24343c04-4d89-4221-a097-443379c2d6f6",
  "Paprika":                  "e2b2b94e-5c8e-4cf1-bb7e-fd007597c6b3",
  "Comino":                   "91078efe-2a1b-476f-aed5-be4129d058c5",
  "Romero":                   "f675feb2-23f7-44bb-8184-c8c46b8a8e13",
  "Chorizo":                  "21d46edf-0d75-467f-9ba5-f742906afc02",
  "Maiz tierno":              "e1ce8072-4256-4c36-ad4c-5dce28921b89",
  "Salsa humo":               "f277f81e-113a-450f-9cc6-c16835304a16",
  "Pollo":                    "07bdcac9-b564-4d48-8672-b2ffff5a41c1",
  "Tocineta":                 "6b0f94e7-ab53-4bcf-bd2b-343c723ec607",
  "Crema leche":              "0012680b-4408-4fa2-9c4b-cfae3a811a87",
  "Polvo salsa carbonara":    "4dc3fdb4-895b-419a-917e-a36aed81328e",
  "Margarina cinco estrellas":"f2329a76-d6b7-466b-80e1-5b1369f1e4b6",
}

// ─── Data: Relleno recipes ─────────────────────────────────
interface Ingredient { name: string; grams: number }
interface RellenoRecipe {
  ingredients: Ingredient[]
  routeType: "planta" | "proteina"
}

const RELLENO_RECIPES: Record<string, RellenoRecipe> = {
  // ═══ PLANTA (11) ═══
  "RELLENO FR": {
    routeType: "planta",
    ingredients: [
      { name: "MIX",                      grams: 3000 },
      { name: "MORA",                     grams: 1119.15 },
      { name: "FRAMBUESA",                grams: 373.05 },
      { name: "Azucar",                   grams: 2446.55 },
      { name: "Agua",                     grams: 1223.83 },
      { name: "Acido citrico",            grams: 24.50 },
      { name: "Almidon de maiz",          grams: 567.93 },
      { name: "Margarina hojaldre",       grams: 255.01 },
      { name: "Mantequilla",              grams: 255.01 },
    ],
  },
  "RELLENO CROOKIES": {
    routeType: "planta",
    ingredients: [
      { name: "Harina galletarina",       grams: 3000 },
      { name: "Margarina hojaldre",       grams: 2000 },
      { name: "Chunks chocolate",         grams: 1700 },
      { name: "Azucar blanco",            grams: 1200 },
      { name: "Azucar morena",            grams: 1200 },
      { name: "Huevo",                    grams: 500 },
      { name: "Almidon de maiz",          grams: 400 },
      { name: "Esencia vainilla caramelo",grams: 280 },
      { name: "Polvo para hornear",       grams: 150 },
      { name: "Sal",                      grams: 20 },
      { name: "Bicarbonato",              grams: 9 },
    ],
  },
  "RELLENO MANZANA": {
    routeType: "planta",
    ingredients: [
      { name: "Manzana gala",    grams: 33526 },
      { name: "Azucar",          grams: 18305 },
      { name: "Agua",            grams: 4576 },
      { name: "Almidon de maiz", grams: 3505 },
      { name: "Canela",          grams: 87 },
    ],
  },
  "ESPINACA QUESO RICOTTA": {
    routeType: "planta",
    ingredients: [
      { name: "Espinaca",        grams: 30946.13 },
      { name: "Queso ricotta",   grams: 11869.07 },
      { name: "Aceite vegetal",  grams: 1192.02 },
      { name: "Aceite oliva",    grams: 1192.02 },
      { name: "Ajo",             grams: 238.41 },
      { name: "Cebolla blanca",  grams: 6191.89 },
      { name: "Queso parmesano", grams: 4768.11 },
      { name: "Albahaca",        grams: 973.44 },
      { name: "Sal",             grams: 476.81 },
      { name: "Pimienta",        grams: 47.68 },
      { name: "Almidon de maiz", grams: 1774 },
      { name: "Goma guar",       grams: 25.44 },
    ],
  },
  "COBERTURA DE ALMENDRAS": {
    routeType: "planta",
    ingredients: [
      { name: "Harina almendra",       grams: 2757 },
      { name: "Mantequilla",           grams: 3676 },
      { name: "Azucar blanco",         grams: 2757 },
      { name: "Leche entera",          grams: 3088 },
      { name: "Crema pastelera polvo", grams: 1323 },
    ],
  },
  "RELLENO CROISSANT ALMENDRAS": {
    routeType: "planta",
    ingredients: [
      { name: "Harina almendra",  grams: 6647 },
      { name: "Almendra tajada",  grams: 2954 },
      { name: "Azucar blanco",    grams: 5908 },
      { name: "Mantequilla",      grams: 2954 },
      { name: "Leche entera",     grams: 1477 },
      { name: "Sabor almendras",  grams: 59 },
    ],
  },
  "RELLENO DE BOCADILLO Y QUESO": {
    routeType: "planta",
    ingredients: [
      { name: "Cernido guayaba",  grams: 15000 },
      { name: "Queso campesino",  grams: 9643 },
      { name: "Sal",              grams: 161 },
    ],
  },
  "RELLENO DE PALITO DE QUESO": {
    routeType: "planta",
    ingredients: [
      { name: "Queso doble crema", grams: 19813 },
      { name: "Agua",              grams: 5000 },
      { name: "Sal",               grams: 33 },
      { name: "Huevo",             grams: 438 },
      { name: "Almidon de maiz",   grams: 438 },
      { name: "Queso parmesano",   grams: 1286.10 },
    ],
  },
  "RELLENO QUESO CREMA": {
    routeType: "planta",
    ingredients: [
      { name: "Queso crema",      grams: 22425 },
      { name: "Almidon de maiz",  grams: 575 },
    ],
  },
  "SALSA DE QUESOS PAÑUELO": {
    routeType: "planta",
    ingredients: [
      { name: "Queso crema",      grams: 39948.30 },
      { name: "Queso chedar",     grams: 3398.96 },
      { name: "Queso mozzarella", grams: 3398.96 },
      { name: "Cebollin",         grams: 1720.46 },
      { name: "Albahaca",         grams: 503.55 },
      { name: "Sal",              grams: 83.92 },
      { name: "Pimienta",         grams: 83.92 },
      { name: "Almidon de maiz",  grams: 1258.88 },
    ],
  },
  "SALSA NAPOLITANA PAÑUELO": {
    routeType: "planta",
    ingredients: [
      { name: "Tomate",           grams: 37540.07 },
      { name: "Pasta tomate",     grams: 3519.85 },
      { name: "Laurel",           grams: 40.28 },
      { name: "Tomillo",          grams: 40.28 },
      { name: "Albahaca",         grams: 50.36 },
      { name: "Sal",              grams: 584.12 },
      { name: "Azucar",           grams: 1279.03 },
      { name: "Oregano",          grams: 50.36 },
      { name: "Pimienta",         grams: 35.25 },
      { name: "Agua",             grams: 5745.57 }, // 3660.85 + 2084.72
      { name: "Almidon de maiz",  grams: 1389.81 },
      { name: "Vinagre",          grams: 75.53 },
      { name: "Acido citrico",    grams: 4.48 },
    ],
  },

  // ═══ PROTEINAS (5) ═══
  "CARNE ECONO": {
    routeType: "proteina",
    ingredients: [
      { name: "Carne molida",      grams: 60000 },
      { name: "PICADILLO",         grams: 35203.84 },
      { name: "Aceite vegetal",    grams: 1394.37 },
      { name: "Almidon modificado",grams: 1207.53 },
      { name: "Proteina soya",    grams: 1207.53 },
      { name: "Sal",               grams: 1100 },
      { name: "Pimienta",          grams: 60.36 },
      { name: "Goma guar",         grams: 21.13 },
      { name: "Paprika",           grams: 15.09 },
      { name: "Comino",            grams: 8.45 },
      { name: "Oregano",           grams: 6.28 },
      { name: "Laurel",            grams: 6.28 },
      { name: "Tomillo",           grams: 6.28 },
      { name: "Agua",              grams: 5041.37 }, // 1811.29 + 211.27 + 3018.81
    ],
  },
  "PASTEL DE CARNE RANCHERO": {
    routeType: "proteina",
    ingredients: [
      { name: "Carne descargue",     grams: 53000 },
      { name: "Cebolla blanca",      grams: 19002.92 }, // 14132.88 + 4870.04
      { name: "Sal",                  grams: 393.90 },
      { name: "Pimienta",             grams: 57.52 },   // 40.75 + 16.77 (adjusted to match)
      { name: "Paprika",              grams: 6.79 },
      { name: "Comino",               grams: 27.17 },
      { name: "Romero",               grams: 33.96 },
      { name: "Laurel",               grams: 6.79 },
      { name: "Tomillo",              grams: 6.79 },
      { name: "Ajo",                  grams: 534.24 },   // 264.86 + 269.38
      { name: "Tomate",               grams: 8081.42 },
      { name: "Agua",                 grams: 7680.87 },   // fondo → agua
      { name: "Chorizo",              grams: 6351.78 },
      { name: "Maiz tierno",          grams: 6351.78 },
      { name: "Almidon modificado",   grams: 1085.34 },
      { name: "Aceite vegetal",       grams: 987.72 },
      { name: "Salsa humo",           grams: 197.97 },
      { name: "ADOBO CARNE ASADA TECNAS", grams: 106.44 },
    ],
  },
  "POLLO CON PROTEINA": {
    routeType: "proteina",
    ingredients: [
      { name: "Pollo",              grams: 60000 },
      { name: "Proteina response",  grams: 8421 },
      { name: "Cebolla blanca",     grams: 5757.98 },
      { name: "Margarina hojaldre", grams: 5945.82 },
      { name: "Sal",                grams: 981.88 },
      { name: "Oregano",            grams: 107.11 },
      { name: "Pimienta",           grams: 71.41 },
      { name: "Ajo en polvo",       grams: 107.11 },
      { name: "Agua",               grams: 27119.87 }, // 17120 + 9999.87
      { name: "HARINA TOSTADA",     grams: 4267.53 },
      { name: "Goma guar",          grams: 15.60 },
    ],
  },
  "POLLO CARBONARA": {
    routeType: "proteina",
    ingredients: [
      { name: "Pollo",                    grams: 60000 },
      { name: "Cebolla blanca",           grams: 19247.52 }, // 5757.98 + 13489.54
      { name: "Margarina hojaldre",       grams: 5945.82 },
      { name: "Sal",                      grams: 981.88 },
      { name: "Oregano",                  grams: 107.11 },
      { name: "Pimienta",                 grams: 98.39 },   // 71.41 + 26.98
      { name: "Ajo en polvo",             grams: 107.11 },
      { name: "Agua",                     grams: 43550.58 }, // 17120 + 26430.58 fondo
      { name: "Tocineta",                 grams: 13556.33 },
      { name: "Queso crema",              grams: 7149.45 },
      { name: "Crema leche",              grams: 7149.45 },
      { name: "Polvo salsa carbonara",    grams: 2643.06 },
      { name: "Margarina cinco estrellas",grams: 1079.16 },
      { name: "Almidon modificado",       grams: 852.60 },
    ],
  },
  "POLLO CON CILANTRO": {
    routeType: "proteina",
    ingredients: [
      { name: "Pollo",              grams: 60000 },
      { name: "Cebolla blanca",     grams: 5757.98 },
      { name: "Margarina hojaldre", grams: 5945.82 },
      { name: "Sal",                grams: 981.88 },
      { name: "Oregano",            grams: 107.11 },
      { name: "Pimienta",           grams: 71.41 },
      { name: "Ajo en polvo",       grams: 107.11 },
      { name: "Agua",               grams: 18170 }, // 17120 + 1050
      { name: "BECHAMEL EN POLVO",  grams: 2340 },
      { name: "Almidon modificado", grams: 585 },
      { name: "CILANTRO",           grams: 600 },
    ],
  },
}

// MP materials that need to be created
const NEW_MP_NAMES = [
  "MIX",
  "MORA",
  "FRAMBUESA",
  "PICADILLO",
  "ADOBO CARNE ASADA TECNAS",
  "HARINA TOSTADA",
  "BECHAMEL EN POLVO",
  "CILANTRO",
]

// ─── Main ──────────────────────────────────────────────────
async function main() {
  console.log("🥘 Cargando recetas de rellenos/salsas (16 PP)...\n")

  // ── Step 1: Create missing MP materials ──
  console.log("═══ PASO 1: Crear materiales MP faltantes ═══")

  for (const matName of NEW_MP_NAMES) {
    try {
      const existing = await supabasePublic(
        `products?select=id,name&name=ilike.${encodeURIComponent(matName)}&category=eq.MP&limit=1`
      )
      if (existing.length > 0) {
        console.log(`  ✓ ${matName} ya existe: ${existing[0].id}`)
        MAT[matName] = existing[0].id
      } else {
        const [created] = await supabasePublic("products", {
          method: "POST",
          body: JSON.stringify({ name: matName, category: "MP", unit: "gramos", is_active: true }),
        })
        console.log(`  + Creado MP: ${matName} → ${created.id}`)
        MAT[matName] = created.id
      }
    } catch (e: any) {
      console.error(`  ✗ Error con ${matName}:`, e.message)
    }
  }

  // ── Step 2: Create work center COCCION ──
  console.log("\n═══ PASO 2: Crear centro de trabajo COCCION ═══")
  let wcCoccionId: string

  try {
    const existing = await supabaseProduccion(
      `work_centers?select=id,name&operation_id=eq.${OP.coccion}&name=ilike.COCCION&limit=1`
    )
    if (existing.length > 0) {
      console.log(`  ✓ WC COCCION ya existe: ${existing[0].id}`)
      wcCoccionId = existing[0].id
    } else {
      const [created] = await supabaseProduccion("work_centers", {
        method: "POST",
        body: JSON.stringify({
          name: "COCCION",
          code: "COCCION",
          operation_id: OP.coccion,
          is_active: true,
        }),
      })
      console.log(`  + Creado WC: COCCION → ${created.id}`)
      wcCoccionId = created.id
    }
  } catch (e: any) {
    console.error(`  ✗ Error creando WC COCCION:`, e.message)
    return
  }

  // ── Step 3: Create 16 PP + routes + BOM ──
  console.log("\n═══ PASO 3: Crear PP rellenos ═══")
  const ppIds: Record<string, string> = {}

  for (const [ppName, recipe] of Object.entries(RELLENO_RECIPES)) {
    const loteMinimo = recipe.ingredients.reduce((sum, i) => sum + i.grams, 0)

    try {
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
        console.log(`  + Creado PP: ${ppName} (lote: ${loteMinimo.toFixed(2)}g) → ${created.id}`)
        ppIds[ppName] = created.id
      }
    } catch (e: any) {
      console.error(`  ✗ Error creando ${ppName}:`, e.message)
    }
  }

  // ── Step 3b: Create routes ──
  console.log("\n═══ PASO 3b: Crear rutas para PP rellenos ═══")
  for (const [ppName, recipe] of Object.entries(RELLENO_RECIPES)) {
    const ppId = ppIds[ppName]
    if (!ppId) { console.log(`  ⚠ Skip ruta: no ppId for ${ppName}`); continue }

    try {
      const existingRoutes = await supabaseProduccion(
        `production_routes?select=id&product_id=eq.${ppId}&limit=1`
      )
      if (existingRoutes.length > 0) {
        console.log(`  ✓ ${ppName} ya tiene rutas`)
        continue
      }

      const secondWc = recipe.routeType === "planta" ? WC.batidos : wcCoccionId
      const secondLabel = recipe.routeType === "planta" ? "Batidos" : "Coccion"

      await supabaseProduccion("production_routes", {
        method: "POST",
        body: JSON.stringify([
          { product_id: ppId, work_center_id: WC.pesaje, sequence_order: 1, is_active: true },
          { product_id: ppId, work_center_id: secondWc, sequence_order: 2, is_active: true },
        ]),
      })
      console.log(`  + Ruta: ${ppName} → Pesaje → ${secondLabel}`)
    } catch (e: any) {
      console.error(`  ✗ Error ruta ${ppName}:`, e.message)
    }
  }

  // ── Step 3c: Create BOM ──
  console.log("\n═══ PASO 3c: Crear BOM para PP rellenos ═══")
  for (const [ppName, recipe] of Object.entries(RELLENO_RECIPES)) {
    const ppId = ppIds[ppName]
    if (!ppId) { console.log(`  ⚠ Skip BOM: no ppId for ${ppName}`); continue }

    try {
      const existingBom = await supabaseProduccion(
        `bill_of_materials?select=id&product_id=eq.${ppId}&limit=1`
      )
      if (existingBom.length > 0) {
        console.log(`  ✓ ${ppName} ya tiene BOM`)
        continue
      }

      const total = recipe.ingredients.reduce((sum, i) => sum + i.grams, 0)
      const bomItems = recipe.ingredients.map(ing => {
        const matId = MAT[ing.name]
        if (!matId) throw new Error(`Material no encontrado: "${ing.name}" para ${ppName}`)
        return {
          product_id: ppId,
          material_id: matId,
          operation_id: OP.pesajes,
          quantity_needed: Math.round((ing.grams / total) * 1000000) / 1000000,
          original_quantity: null,
          unit_name: "GR",
          unit_equivalence_grams: 1,
          is_active: true,
        }
      })

      await supabaseProduccion("bill_of_materials", {
        method: "POST",
        body: JSON.stringify(bomItems),
      })

      // Verify fractions sum to ~1.0
      const fractionSum = bomItems.reduce((s, b) => s + b.quantity_needed, 0)
      console.log(`  + BOM: ${ppName} (${recipe.ingredients.length} items, Σ=${fractionSum.toFixed(6)})`)
    } catch (e: any) {
      console.error(`  ✗ Error BOM ${ppName}:`, e.message)
    }
  }

  console.log("\n🎉 ¡Carga de rellenos completa!")
}

main().catch(console.error)
