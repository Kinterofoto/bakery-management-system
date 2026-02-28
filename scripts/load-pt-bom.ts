/**
 * Script para cargar BOM y rutas de producción para ~74 PT (hojaldres, croissants, crookies, panadería mini).
 * Los 8 PT de panadería que ya tienen BOM se saltan por idempotencia.
 *
 * LECCIÓN CLAVE: Los IDs se buscan dinámicamente desde la BD (no se hardcodean UUIDs completos).
 *
 * Ejecutar: npx tsx scripts/load-pt-bom.ts
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

// ─── Constants ───────────────────────────────────────────────
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
  polyline: "028eb924-0824-4678-8414-0d2c1895a749",
  croissomat: "b7ba9233-d43e-4bac-a979-acb8a74bf964",
  decorado: "5afec362-9d7c-459f-92dc-5431e42dc81b",
  fermentacion: "a6e95b73-19ba-47e8-9a86-3790d3ebb8a0",
  ultracongelador: "1b9a2c36-6eea-435f-88cc-143557cc71a5",
  empaque: "7ee993ff-462f-4556-8bea-a8ce3127ac54",
}

// Route templates
const ROUTE_HOJALDRE = [WC.polyline, WC.decorado, WC.ultracongelador, WC.empaque]
const ROUTE_CROISSANT = [WC.croissomat, WC.fermentacion, WC.decorado, WC.ultracongelador, WC.empaque]

// ─── Component alias map: cost-sheet name → DB product name (for dynamic lookup) ───
const COMPONENT_ALIAS: Record<string, string> = {
  // PP mappings
  "HOJALDRE": "MASA HOJALDRE CON RECORTE",
  "SEMIHOJALDRE MANTEQUILLA": "MASA CROISSANT EUROPA CR",
  "SEMIHOJALDRE MULTICEREAL": "MASA CROISSANT MULTICEREAL CR",
  "SEMIHOJALDRE MANTEQUILLA ALMENDRAS": "MASA CROISSANT ALMENDRAS",
  "SEMIHOJALDRE MANT CANELA": "MASA ROLLO DE CANELA",
  "MASA CROISSANT MARGARINA OXXO": "MASA CROISSANT MARGARINA 75G",
  "GALLETA CROOKIE": "RELLENO CROOKIES",
  "BRILLO HUEVO LECHE": "BRILLO 50-50",
  "BRILLO AL 70%": "BRILLO 50-50",
  "BRILLO B2": "BRILLO 50-50",
  "BRILLO DULCES": "BRILLO 50-50",
  "BRILLO SUNZET AGUA AZUCAR": "BRILLO 50-50",
  "BATIDO PALITO QUESO 65 GR": "RELLENO DE PALITO DE QUESO",
  "RELLENO ALMENDRAS": "RELLENO CROISSANT ALMENDRAS",
  "CUBIERTA ALMENDRAS": "COBERTURA DE ALMENDRAS",
  "RELLENO BOCADILLO Y QUESO 65 GR": "RELLENO DE BOCADILLO Y QUESO",
  "RELLENO DE CARNE": "CARNE ECONO",
  "CARNE 120 GR": "CARNE ECONO",
  "RELLENO CARNE RANCHERO": "PASTEL DE CARNE RANCHERO",
  "RELLENO DE POLLO CON PROTEINA": "POLLO CON PROTEINA",
  "RELLENO CARBONARA": "POLLO CARBONARA",
  "RELLENO MANZANA CANELA": "RELLENO MANZANA",
  "RELLENO ESPINACA Y QUESO RICOTTA": "ESPINACA QUESO RICOTTA",
  "RELLENO COSTENO": "RELLENO PAN BLANDO",
  "RELLENO CANELA BADIA": "RELLENO DE CANELA",
  "SALSA NAPOLITANA": "SALSA NAPOLITANA PAÑUELO",
  "SALSA DE QUESOS": "SALSA DE QUESOS PAÑUELO",
  // MP mappings
  "SUPERCREAM AVELLANA PURATOS": "RELLENO DE AVELLANAS",
  "GRANILLO DE CACAO": "GRANILLO CHOCOLATE SEMIAMARGO",
  "JAMON DE CERDO AHUMADO PULLMAN": "JAMON",
  "JAMON VILASECA": "JAMON VILLASECA",
  "AREQUIPE MANJAR BLANCO BUGUENA": "AREQUIPE MANJAR BLANCO",
  "AREQUIPE ALPINA": "AREQUIPE MANJAR BLANCO",
  "ALMENDRA FILETEADA": "ALMENDRA TAJADA",
  "BELCOSTICK 44% 8 CM PURATOS": "CHOCOLATE BELCOSTEAK",
  "QUESO TIPO MOZZARELLA COLANTA": "QUESO MOZZARELLA ENTERO",
  "COCO DESHIDRATADO": "COCO RALLADO",
  // These map to themselves (direct name match in DB)
  "BRILLO 50-50": "BRILLO 50-50",
  "BRILLO HUEVO AGUA": "BRILLO AGUA",
  "RELLENO QUESO CREMA": "RELLENO QUESO CREMA",
  "QUESO PARMESANO": "QUESO PARMESANO",
  "QUESO CAMPESINO": "QUESO CAMPESINO",
  "QUESO COSTENO": "QUESO COSTEÑO",
  "QUESO DOBLE CREMA": "QUESO DOBLE CREMA",
  "AZUCAR BLANCO GENERICO": "AZUCAR BLANCO GENERICO",
  "HUEVOS": "HUEVOS",
  "BOCADILLO SOLIDO": "BOCADILLO SOLIDO",
  "SEMILLAS DE CHIA": "SEMILLAS DE CHIA",
  "AJONJOLI NEGRO": "SEMILLAS AJONJOLI NEGRO",
  "AJONJOLI BLANCO": "SEMILLAS DE AJONJOLI BLANCO",
  "ALBAHACA": "ALBAHACA",
  "MIGA DE PAN": "MIGA DE PAN",
  "QUINUA": "QUINUA",
  // New PP stubs (map to themselves)
  "EMPASTE CROOKIE": "EMPASTE CROOKIE",
  "DECORADO SEMILLAS": "DECORADO SEMILLAS",
  "RELLENO DE BOCADILLO": "RELLENO DE BOCADILLO",
  "RELLENO DE POLLO SIN PROTEINA": "RELLENO DE POLLO SIN PROTEINA",
  "RELLENO DE CANELA": "RELLENO DE CANELA",
  "RELLENO F. ROJOS CROISSANT": "RELLENO F. ROJOS CROISSANT",
  "RELLENO MANZANA VERDE": "RELLENO MANZANA VERDE",
  "RELLENO QUESO DULCE": "RELLENO QUESO DULCE",
  "RELLENO PAN DE CHOCOLATE": "RELLENO PAN DE CHOCOLATE",
  "MASA CROISSANT F. ROJOS": "MASA CROISSANT F. ROJOS",
  "EMPASTE MULTICEREAL MARGARINA": "EMPASTE MULTICEREAL MARGARINA",
  // New MP
  "RELLENO PAN DE CHOCOLATE PREMIUM": "RELLENO PAN DE CHOCOLATE PREMIUM",
}

// ─── PT definitions: key → { ptId, components, routeType } ───
// For duplicates, IDs are sorted ascending and mapped to sizes ascending.
interface BomComponent { alias: string; grams: number }
interface PTDef { ptId: string; components: BomComponent[]; routeType: "hojaldre" | "croissant" | "panaderia" }

const PT_DEFS: PTDef[] = [
  // ══════ HOJALDRE LINE ══════
  // Palito queso 65g
  { ptId: "00005197-0000-4000-8000-000051970000", routeType: "hojaldre", components: [
    { alias: "HOJALDRE", grams: 41 },
    { alias: "BATIDO PALITO QUESO 65 GR", grams: 20 },
    { alias: "QUESO PARMESANO", grams: 1.8 },
    { alias: "BRILLO HUEVO AGUA", grams: 2 },
  ]},
  // Flauta chocolate 25g
  { ptId: "00007642-0000-4000-8000-000076420000", routeType: "hojaldre", components: [
    { alias: "HOJALDRE", grams: 15 },
    { alias: "SUPERCREAM AVELLANA PURATOS", grams: 7 },
    { alias: "GRANILLO DE CACAO", grams: 2.5 },
    { alias: "BRILLO 50-50", grams: 0.5 },
  ]},
  // Flauta chocolate 50g
  { ptId: "00007643-0000-4000-8000-000076430000", routeType: "hojaldre", components: [
    { alias: "HOJALDRE", grams: 35 },
    { alias: "SUPERCREAM AVELLANA PURATOS", grams: 15 },
    { alias: "GRANILLO DE CACAO", grams: 1.5 },
    { alias: "HUEVOS", grams: 1 },
  ]},
  // Flauta chocolate 70g
  { ptId: "00007644-0000-4000-8000-000076440000", routeType: "hojaldre", components: [
    { alias: "HOJALDRE", grams: 55 },
    { alias: "SUPERCREAM AVELLANA PURATOS", grams: 20 },
    { alias: "GRANILLO DE CACAO", grams: 3 },
    { alias: "BRILLO 50-50", grams: 1 },
  ]},
  // Palito bocadillo queso 25g
  { ptId: "00007645-0000-4000-8000-000076450000", routeType: "hojaldre", components: [
    { alias: "HOJALDRE", grams: 18 },
    { alias: "RELLENO BOCADILLO Y QUESO 65 GR", grams: 7 },
    { alias: "BRILLO 50-50", grams: 0.5 },
    { alias: "QUESO PARMESANO", grams: 1 },
  ]},
  // Palito bocadillo queso 50g
  { ptId: "00007646-0000-4000-8000-000076460000", routeType: "hojaldre", components: [
    { alias: "HOJALDRE", grams: 35 },
    { alias: "RELLENO BOCADILLO Y QUESO 65 GR", grams: 15 },
    { alias: "BRILLO 50-50", grams: 1 },
    { alias: "QUESO PARMESANO", grams: 2 },
  ]},
  // Palito bocadillo queso 80g
  { ptId: "00007647-0000-4000-8000-000076470000", routeType: "hojaldre", components: [
    { alias: "HOJALDRE", grams: 55 },
    { alias: "RELLENO BOCADILLO Y QUESO 65 GR", grams: 20 },
    { alias: "BRILLO 50-50", grams: 2 },
    { alias: "QUESO PARMESANO", grams: 3 },
  ]},
  // Palito queso crema 25g
  { ptId: "00007648-0000-4000-8000-000076480000", routeType: "hojaldre", components: [
    { alias: "HOJALDRE", grams: 15 },
    { alias: "RELLENO QUESO CREMA", grams: 7 },
    { alias: "BRILLO HUEVO AGUA", grams: 0.5 },
    { alias: "QUESO PARMESANO", grams: 2.5 },
  ]},
  // Palito queso crema 50g
  { ptId: "00007649-0000-4000-8000-000076490000", routeType: "hojaldre", components: [
    { alias: "HOJALDRE", grams: 35 },
    { alias: "RELLENO QUESO CREMA", grams: 15 },
    { alias: "BRILLO 50-50", grams: 0.5 },
    { alias: "QUESO COSTENO", grams: 1.5 },
  ]},
  // Palito queso crema 80g
  { ptId: "00007650-0000-4000-8000-000076500000", routeType: "hojaldre", components: [
    { alias: "HOJALDRE", grams: 54 },
    { alias: "RELLENO QUESO CREMA", grams: 23 },
    { alias: "BRILLO HUEVO AGUA", grams: 2 },
    { alias: "QUESO PARMESANO", grams: 1.8 },
  ]},
  // Palito queso crema 100g
  { ptId: "00007651-0000-4000-8000-000076510000", routeType: "hojaldre", components: [
    { alias: "HOJALDRE", grams: 68 },
    { alias: "RELLENO QUESO CREMA", grams: 27 },
    { alias: "BRILLO HUEVO AGUA", grams: 2 },
    { alias: "QUESO PARMESANO", grams: 3 },
  ]},
  // Pastel arequipe 20g
  { ptId: "00007655-0000-4000-8000-000076550000", routeType: "hojaldre", components: [
    { alias: "HOJALDRE", grams: 15 },
    { alias: "AREQUIPE MANJAR BLANCO BUGUENA", grams: 5 },
    { alias: "BRILLO 50-50", grams: 1 },
  ]},
  // Pastel arequipe 40g
  { ptId: "00007656-0000-4000-8000-000076560000", routeType: "hojaldre", components: [
    { alias: "HOJALDRE", grams: 28 },
    { alias: "AREQUIPE MANJAR BLANCO BUGUENA", grams: 10 },
    { alias: "BRILLO 50-50", grams: 1 },
    { alias: "AZUCAR BLANCO GENERICO", grams: 1 },
  ]},
  // Pastel arequipe 100g
  { ptId: "00007657-0000-4000-8000-000076570000", routeType: "hojaldre", components: [
    { alias: "HOJALDRE", grams: 80 },
    { alias: "AREQUIPE MANJAR BLANCO BUGUENA", grams: 20 },
    { alias: "BRILLO DULCES", grams: 1 },
  ]},
  // Pastel bocadillo 20g
  { ptId: "00007658-0000-4000-8000-000076580000", routeType: "hojaldre", components: [
    { alias: "HOJALDRE", grams: 15 },
    { alias: "RELLENO DE BOCADILLO", grams: 5 },
    { alias: "BRILLO 50-50", grams: 1 },
    { alias: "AZUCAR BLANCO GENERICO", grams: 1 },
  ]},
  // Pastel bocadillo 40g
  { ptId: "00007659-0000-4000-8000-000076590000", routeType: "hojaldre", components: [
    { alias: "HOJALDRE", grams: 28 },
    { alias: "RELLENO DE BOCADILLO", grams: 10 },
    { alias: "BRILLO 50-50", grams: 1 },
    { alias: "AZUCAR BLANCO GENERICO", grams: 1 },
  ]},
  // Pastel bocadillo 100g
  { ptId: "00007660-0000-4000-8000-000076600000", routeType: "hojaldre", components: [
    { alias: "HOJALDRE", grams: 80 },
    { alias: "RELLENO DE BOCADILLO", grams: 20 },
    { alias: "BRILLO DULCES", grams: 1 },
  ]},
  // Pastel carne 30g
  { ptId: "00007661-0000-4000-8000-000076610000", routeType: "hojaldre", components: [
    { alias: "HOJALDRE", grams: 20 },
    { alias: "RELLENO DE CARNE", grams: 10 },
    { alias: "BRILLO 50-50", grams: 1 },
  ]},
  // Pastel carne 50g
  { ptId: "00007662-0000-4000-8000-000076620000", routeType: "hojaldre", components: [
    { alias: "HOJALDRE", grams: 35 },
    { alias: "RELLENO DE CARNE", grams: 15 },
  ]},
  // Pastel carne 100g
  { ptId: "00007663-0000-4000-8000-000076630000", routeType: "hojaldre", components: [
    { alias: "HOJALDRE", grams: 70 },
    { alias: "RELLENO DE CARNE", grams: 30 },
    { alias: "BRILLO 50-50", grams: 2 },
  ]},
  // Pastel carne 80g (separate PT)
  { ptId: "a91eeeaf-7198-4d74-9e0e-f91a1515d000", routeType: "hojaldre", components: [
    { alias: "HOJALDRE", grams: 50 },
    { alias: "CARNE 120 GR", grams: 18 },
    { alias: "SEMILLAS DE CHIA", grams: 1.5 },
    { alias: "BRILLO AL 70%", grams: 1 },
  ]},
  // Pastel carne ranchero 30g
  { ptId: "00007664-0000-4000-8000-000076640000", routeType: "hojaldre", components: [
    { alias: "HOJALDRE", grams: 20 },
    { alias: "RELLENO CARNE RANCHERO", grams: 10 },
    { alias: "BRILLO 50-50", grams: 0.5 },
    { alias: "SEMILLAS DE CHIA", grams: 0.5 },
  ]},
  // Pastel carne ranchero 60g
  { ptId: "00007665-0000-4000-8000-000076650000", routeType: "hojaldre", components: [
    { alias: "HOJALDRE", grams: 40 },
    { alias: "RELLENO CARNE RANCHERO", grams: 20 },
    { alias: "BRILLO 50-50", grams: 1 },
    { alias: "SEMILLAS DE CHIA", grams: 1 },
  ]},
  // Pastel carne ranchero 100g
  { ptId: "00007666-0000-4000-8000-000076660000", routeType: "hojaldre", components: [
    { alias: "HOJALDRE", grams: 70 },
    { alias: "RELLENO CARNE RANCHERO", grams: 30 },
    { alias: "BRILLO 50-50", grams: 1 },
    { alias: "SEMILLAS DE CHIA", grams: 1 },
    { alias: "QUINUA", grams: 1 },
  ]},
  // Pastel espinaca 30g
  { ptId: "00007667-0000-4000-8000-000076670000", routeType: "hojaldre", components: [
    { alias: "HOJALDRE", grams: 15 },
    { alias: "RELLENO ESPINACA Y QUESO RICOTTA", grams: 10 },
    { alias: "AJONJOLI BLANCO", grams: 2 },
    { alias: "SEMILLAS DE CHIA", grams: 2 },
    { alias: "BRILLO AL 70%", grams: 1 },
  ]},
  // Pastel espinaca 50g
  { ptId: "00007668-0000-4000-8000-000076680000", routeType: "hojaldre", components: [
    { alias: "HOJALDRE", grams: 35 },
    { alias: "RELLENO ESPINACA Y QUESO RICOTTA", grams: 15 },
    { alias: "AJONJOLI BLANCO", grams: 0.75 },
    { alias: "SEMILLAS DE CHIA", grams: 0.75 },
    { alias: "BRILLO AL 70%", grams: 1 },
  ]},
  // Pastel espinaca 95g
  { ptId: "00007669-0000-4000-8000-000076690000", routeType: "hojaldre", components: [
    { alias: "HOJALDRE", grams: 65 },
    { alias: "RELLENO ESPINACA Y QUESO RICOTTA", grams: 27 },
    { alias: "AJONJOLI BLANCO", grams: 0.75 },
    { alias: "SEMILLAS DE CHIA", grams: 0.75 },
    { alias: "BRILLO 50-50", grams: 2 },
  ]},
  // Pastel manzana 30g
  { ptId: "00007670-0000-4000-8000-000076700000", routeType: "hojaldre", components: [
    { alias: "HOJALDRE", grams: 15 },
    { alias: "RELLENO MANZANA CANELA", grams: 10 },
    { alias: "HUEVOS", grams: 1 },
    { alias: "ALMENDRA FILETEADA", grams: 4 },
  ]},
  // Pastel manzana 50g
  { ptId: "00007671-0000-4000-8000-000076710000", routeType: "hojaldre", components: [
    { alias: "HOJALDRE", grams: 35 },
    { alias: "RELLENO MANZANA CANELA", grams: 15 },
    { alias: "HUEVOS", grams: 0.7 },
    { alias: "ALMENDRA FILETEADA", grams: 2 },
  ]},
  // Pastel manzana 105g
  { ptId: "00007672-0000-4000-8000-000076720000", routeType: "hojaldre", components: [
    { alias: "HOJALDRE", grams: 75 },
    { alias: "RELLENO MANZANA CANELA", grams: 25 },
    { alias: "HUEVOS", grams: 0.7 },
    { alias: "ALMENDRA FILETEADA", grams: 3 },
  ]},
  // Pastel pollo 30g
  { ptId: "00007673-0000-4000-8000-000076730000", routeType: "hojaldre", components: [
    { alias: "HOJALDRE", grams: 20 },
    { alias: "RELLENO DE POLLO CON PROTEINA", grams: 10 },
    { alias: "BRILLO 50-50", grams: 1 },
  ]},
  // Pastel pollo 50g
  { ptId: "00007674-0000-4000-8000-000076740000", routeType: "hojaldre", components: [
    { alias: "HOJALDRE", grams: 35 },
    { alias: "RELLENO DE POLLO SIN PROTEINA", grams: 15 },
  ]},
  // Pastel pollo 80g (Vulcanos)
  { ptId: "00008130-0000-4000-8000-000081300000", routeType: "hojaldre", components: [
    { alias: "HOJALDRE", grams: 60 },
    { alias: "RELLENO DE POLLO CON PROTEINA", grams: 20 },
    { alias: "BRILLO 50-50", grams: 0.5 },
  ]},
  // Pastel pollo 100g
  { ptId: "00007675-0000-4000-8000-000076750000", routeType: "hojaldre", components: [
    { alias: "HOJALDRE", grams: 80 },
    { alias: "RELLENO DE POLLO SIN PROTEINA", grams: 23 },
    { alias: "BRILLO SUNZET AGUA AZUCAR", grams: 2 },
  ]},
  // Pastel carbonara 30g
  { ptId: "00007676-0000-4000-8000-000076760000", routeType: "hojaldre", components: [
    { alias: "HOJALDRE", grams: 20 },
    { alias: "RELLENO CARBONARA", grams: 10 },
    { alias: "BRILLO 50-50", grams: 0.5 },
    { alias: "AJONJOLI NEGRO", grams: 0.5 },
  ]},
  // Pastel carbonara 60g
  { ptId: "00007677-0000-4000-8000-000076770000", routeType: "hojaldre", components: [
    { alias: "HOJALDRE", grams: 40 },
    { alias: "RELLENO CARBONARA", grams: 20 },
    { alias: "BRILLO 50-50", grams: 1 },
    { alias: "AJONJOLI NEGRO", grams: 1 },
  ]},
  // Pastel carbonara 100g
  { ptId: "00007678-0000-4000-8000-000076780000", routeType: "hojaldre", components: [
    { alias: "HOJALDRE", grams: 70 },
    { alias: "RELLENO CARBONARA", grams: 30 },
    { alias: "BRILLO 50-50", grams: 1 },
    { alias: "AJONJOLI NEGRO", grams: 1 },
  ]},
  // Pastel gloria 90g
  { ptId: "00008117-0000-4000-8000-000081170000", routeType: "hojaldre", components: [
    { alias: "HOJALDRE", grams: 65 },
    { alias: "AREQUIPE MANJAR BLANCO BUGUENA", grams: 10 },
    { alias: "QUESO TIPO MOZZARELLA COLANTA", grams: 15 },
    { alias: "AZUCAR BLANCO GENERICO", grams: 1 },
  ]},
  // Laminas hojaldre 660g
  { ptId: "00008120-0000-4000-8000-000081200000", routeType: "hojaldre", components: [
    { alias: "HOJALDRE", grams: 660 },
  ]},
  // Palito queso philadelphia dulce
  { ptId: "00008131-0000-4000-8000-000081310000", routeType: "hojaldre", components: [
    { alias: "HOJALDRE", grams: 30 },
    { alias: "RELLENO QUESO DULCE", grams: 10 },
  ]},

  // ══════ CROISSANT LINE ══════
  // Croissant jamon queso 100g
  { ptId: "00006214-0000-4000-8000-000062140000", routeType: "croissant", components: [
    { alias: "MASA CROISSANT MARGARINA OXXO", grams: 78 },
    { alias: "QUESO CAMPESINO", grams: 10 },
    { alias: "JAMON DE CERDO AHUMADO PULLMAN", grams: 10 },
    { alias: "BRILLO HUEVO LECHE", grams: 2.2 },
  ]},
  // Croissant almendras 50g
  { ptId: "00007611-0000-4000-8000-000076110000", routeType: "croissant", components: [
    { alias: "SEMIHOJALDRE MANTEQUILLA ALMENDRAS", grams: 35 },
    { alias: "RELLENO ALMENDRAS", grams: 8 },
    { alias: "CUBIERTA ALMENDRAS", grams: 8 },
    { alias: "BRILLO AL 70%", grams: 1.3 },
    { alias: "ALMENDRA FILETEADA", grams: 4 },
  ]},
  // Croissant almendras 125g
  { ptId: "00007612-0000-4000-8000-000076120000", routeType: "croissant", components: [
    { alias: "SEMIHOJALDRE MANTEQUILLA ALMENDRAS", grams: 75 },
    { alias: "RELLENO ALMENDRAS", grams: 25 },
    { alias: "CUBIERTA ALMENDRAS", grams: 17 },
    { alias: "BRILLO AL 70%", grams: 4 },
    { alias: "ALMENDRA FILETEADA", grams: 10 },
  ]},
  // Croissant Europa 20g
  { ptId: "00007624-0000-4000-8000-000076240000", routeType: "croissant", components: [
    { alias: "SEMIHOJALDRE MANTEQUILLA", grams: 21 },
    { alias: "BRILLO 50-50", grams: 1 },
  ]},
  // Croissant Europa 30g
  { ptId: "00007625-0000-4000-8000-000076250000", routeType: "croissant", components: [
    { alias: "SEMIHOJALDRE MANTEQUILLA", grams: 30 },
    { alias: "BRILLO 50-50", grams: 1 },
  ]},
  // Croissant Europa 60g
  { ptId: "00007626-0000-4000-8000-000076260000", routeType: "croissant", components: [
    { alias: "SEMIHOJALDRE MANTEQUILLA", grams: 60 },
    { alias: "BRILLO B2", grams: 3 },
  ]},
  // Croissant Europa 90g
  { ptId: "00007627-0000-4000-8000-000076270000", routeType: "croissant", components: [
    { alias: "SEMIHOJALDRE MANTEQUILLA", grams: 90 },
    { alias: "BRILLO HUEVO LECHE", grams: 3 },
  ]},
  // Croissant margarina 75g
  { ptId: "00007634-0000-4000-8000-000076340000", routeType: "croissant", components: [
    { alias: "MASA CROISSANT MARGARINA OXXO", grams: 75 },
    { alias: "BRILLO HUEVO LECHE", grams: 3 },
  ]},
  // Croissant multicereal mant 20g
  { ptId: "00007635-0000-4000-8000-000076350000", routeType: "croissant", components: [
    { alias: "SEMIHOJALDRE MANTEQUILLA", grams: 21 },
    { alias: "BRILLO 50-50", grams: 1 },
    { alias: "DECORADO SEMILLAS", grams: 1 },
  ]},
  // Croissant multicereal mant 30g
  { ptId: "00007636-0000-4000-8000-000076360000", routeType: "croissant", components: [
    { alias: "SEMIHOJALDRE MULTICEREAL", grams: 30 },
    { alias: "DECORADO SEMILLAS", grams: 2 },
    { alias: "BRILLO 50-50", grams: 1 },
  ]},
  // Croissant multicereal mant 60g
  { ptId: "00007637-0000-4000-8000-000076370000", routeType: "croissant", components: [
    { alias: "SEMIHOJALDRE MULTICEREAL", grams: 61 },
    { alias: "BRILLO 50-50", grams: 1 },
    { alias: "DECORADO SEMILLAS", grams: 1.5 },
  ]},
  // Croissant multicereal mant 90g
  { ptId: "00007638-0000-4000-8000-000076380000", routeType: "croissant", components: [
    { alias: "SEMIHOJALDRE MULTICEREAL", grams: 90 },
    { alias: "DECORADO SEMILLAS", grams: 3.12 },
    { alias: "BRILLO HUEVO LECHE", grams: 3 },
  ]},
  // Crookie 60g
  { ptId: "00007639-0000-4000-8000-000076390000", routeType: "croissant", components: [
    { alias: "EMPASTE CROOKIE", grams: 28 },
    { alias: "GALLETA CROOKIE", grams: 32 },
    { alias: "BRILLO 50-50", grams: 1 },
  ]},
  // Crookie 90g
  { ptId: "00007640-0000-4000-8000-000076400000", routeType: "croissant", components: [
    { alias: "EMPASTE CROOKIE", grams: 42 },
    { alias: "GALLETA CROOKIE", grams: 48 },
    { alias: "BRILLO 50-50", grams: 1 },
  ]},
  // Crookie 150g
  { ptId: "00007641-0000-4000-8000-000076410000", routeType: "croissant", components: [
    { alias: "EMPASTE CROOKIE", grams: 70 },
    { alias: "GALLETA CROOKIE", grams: 80 },
    { alias: "BRILLO 50-50", grams: 2 },
  ]},
  // Pan chocolate mant 20g
  { ptId: "00007652-0000-4000-8000-000076520000", routeType: "croissant", components: [
    { alias: "SEMIHOJALDRE MANTEQUILLA", grams: 10 },
    { alias: "SUPERCREAM AVELLANA PURATOS", grams: 10 },
    { alias: "BRILLO 50-50", grams: 0.5 },
  ]},
  // Pan chocolate mant 40g
  { ptId: "00007653-0000-4000-8000-000076530000", routeType: "croissant", components: [
    { alias: "SEMIHOJALDRE MANTEQUILLA", grams: 20 },
    { alias: "RELLENO PAN DE CHOCOLATE PREMIUM", grams: 20 },
    { alias: "BRILLO 50-50", grams: 0.5 },
  ]},
  // Pan chocolate mant 80g
  { ptId: "00007654-0000-4000-8000-000076540000", routeType: "croissant", components: [
    { alias: "RELLENO PAN DE CHOCOLATE", grams: 20 },
    { alias: "SEMIHOJALDRE MANTEQUILLA", grams: 60 },
    { alias: "BRILLO 50-50", grams: 1 },
  ]},
  // Croissant bicolor choco mant 60g
  { ptId: "00008122-0000-4000-8000-000081220000", routeType: "croissant", components: [
    { alias: "SEMIHOJALDRE MANTEQUILLA", grams: 50 },
    { alias: "BELCOSTICK 44% 8 CM PURATOS", grams: 10 },
    { alias: "BRILLO 50-50", grams: 1 },
  ]},
  // Croissant bicolor choco marg 90g
  { ptId: "00008126-0000-4000-8000-000081260000", routeType: "croissant", components: [
    { alias: "SEMIHOJALDRE MANTEQUILLA", grams: 85 },
    { alias: "BELCOSTICK 44% 8 CM PURATOS", grams: 5 },
    { alias: "BRILLO 50-50", grams: 1 },
  ]},
  // Croissant bicolor frutos rojos 60g
  { ptId: "00008127-0000-4000-8000-000081270000", routeType: "croissant", components: [
    { alias: "MASA CROISSANT F. ROJOS", grams: 49 },
    { alias: "RELLENO F. ROJOS CROISSANT", grams: 13 },
    { alias: "BRILLO 50-50", grams: 0.5 },
  ]},
  // Napolitana jamon queso 130g
  { ptId: "e45ea499-1b62-4b0b-a1c9-0e21d743efa8", routeType: "croissant", components: [
    { alias: "SEMIHOJALDRE MANTEQUILLA", grams: 85 },
    { alias: "SALSA NAPOLITANA", grams: 12 },
    { alias: "SALSA DE QUESOS", grams: 12 },
    { alias: "JAMON VILASECA", grams: 21 },
    { alias: "ALBAHACA", grams: 1 },
  ]},
  // Panuelo napolitano 70g
  { ptId: "00007219-0000-4000-8000-000072190000", routeType: "croissant", components: [
    { alias: "SEMIHOJALDRE MANTEQUILLA", grams: 46 },
    { alias: "SALSA NAPOLITANA", grams: 7 },
    { alias: "SALSA DE QUESOS", grams: 7 },
    { alias: "JAMON VILASECA", grams: 10 },
    { alias: "ALBAHACA", grams: 0.5 },
  ]},
  // Croissant queso 90g
  { ptId: "09e99f57-650d-4803-bcf2-7b52dfc7dae4", routeType: "croissant", components: [
    { alias: "MASA CROISSANT MARGARINA OXXO", grams: 75 },
    { alias: "QUESO DOBLE CREMA", grams: 15 },
    { alias: "BRILLO HUEVO LECHE", grams: 1 },
    { alias: "AJONJOLI BLANCO", grams: 3 },
  ]},
  // Croissant almendras margarina 110g
  { ptId: "1227f573-960a-42e9-892d-3251ce81023f", routeType: "croissant", components: [
    { alias: "EMPASTE CROOKIE", grams: 70 },
    { alias: "RELLENO ALMENDRAS", grams: 15 },
    { alias: "CUBIERTA ALMENDRAS", grams: 15 },
    { alias: "ALMENDRA FILETEADA", grams: 10 },
  ]},
  // Croissant frutos verdes (manzana verde) 60g
  { ptId: "00007815-0000-4000-8000-000078150000", routeType: "croissant", components: [
    { alias: "SEMIHOJALDRE MANTEQUILLA", grams: 50 },
    { alias: "RELLENO MANZANA VERDE", grams: 10 },
    { alias: "BRILLO 50-50", grams: 1 },
  ]},
  // Rollo canela 40g
  { ptId: "00008092-0000-4000-8000-000080920000", routeType: "croissant", components: [
    { alias: "SEMIHOJALDRE MANTEQUILLA", grams: 31.49 },
    { alias: "RELLENO DE CANELA", grams: 8.60 },
    { alias: "BRILLO AL 70%", grams: 1 },
  ]},
  // Rollo canela 70g
  { ptId: "00008093-0000-4000-8000-000080930000", routeType: "croissant", components: [
    { alias: "SEMIHOJALDRE MANT CANELA", grams: 52 },
    { alias: "RELLENO CANELA BADIA", grams: 17 },
    { alias: "BRILLO HUEVO LECHE", grams: 2 },
  ]},
  // Croissant multicereal margarina 20g (NEW PT to create)
  { ptId: "__NEW_CROISSANT_MULTI_MARG_20G__", routeType: "croissant", components: [
    { alias: "EMPASTE MULTICEREAL MARGARINA", grams: 21 },
    { alias: "BRILLO 50-50", grams: 1 },
    { alias: "DECORADO SEMILLAS", grams: 1 },
  ]},
]

// ─── PP stubs to create ───
const PP_STUBS = [
  "EMPASTE CROOKIE",
  "DECORADO SEMILLAS",
  "RELLENO DE BOCADILLO",
  "RELLENO DE POLLO SIN PROTEINA",
  "RELLENO DE CANELA",
  "RELLENO F. ROJOS CROISSANT",
  "RELLENO MANZANA VERDE",
  "RELLENO QUESO DULCE",
  "RELLENO PAN DE CHOCOLATE",
  "MASA CROISSANT F. ROJOS",
  "EMPASTE MULTICEREAL MARGARINA",
]

// ─── Main ──────────────────────────────────────────────────
async function main() {
  console.log("🏭 Cargando BOM y rutas para PT (hojaldres, croissants, crookies)...\n")

  // ── Step 0: Query ALL products from DB to build name→id maps ──
  console.log("═══ PASO 0: Cargando productos existentes de la BD ═══")

  const allProducts: { id: string; name: string; category: string }[] = await supabasePublic(
    "products?select=id,name,category&is_active=eq.true&limit=5000"
  )
  console.log(`  Productos cargados: ${allProducts.length}`)

  // Build name→id maps (uppercased for matching)
  const productByName: Record<string, string> = {}
  for (const p of allProducts) {
    // Use uppercase name as key, but also store original
    const key = p.name.toUpperCase().trim()
    productByName[key] = p.id
  }

  // Helper to resolve a component alias to a product ID
  function resolveComponentId(alias: string): string {
    const dbName = COMPONENT_ALIAS[alias]
    if (!dbName) throw new Error(`No alias mapping for "${alias}"`)
    const upperName = dbName.toUpperCase().trim()
    const id = productByName[upperName]
    if (!id) throw new Error(`Product not found in DB: "${dbName}" (alias: "${alias}")`)
    return id
  }

  // ── Step 1: Create missing MP ──
  console.log("\n═══ PASO 1: Crear MP faltantes ═══")
  const mpToCreate = ["RELLENO PAN DE CHOCOLATE PREMIUM"]
  for (const name of mpToCreate) {
    const key = name.toUpperCase().trim()
    if (productByName[key]) {
      console.log(`  ✓ ${name} ya existe: ${productByName[key]}`)
    } else {
      try {
        const [created] = await supabasePublic("products", {
          method: "POST",
          body: JSON.stringify({ name, category: "MP", unit: "gramos", is_active: true }),
        })
        console.log(`  + Creado MP: ${name} → ${created.id}`)
        productByName[key] = created.id
      } catch (e: any) {
        console.error(`  ✗ Error creando MP ${name}:`, e.message)
      }
    }
  }

  // ── Step 2: Create PP stubs ──
  console.log("\n═══ PASO 2: Crear PP stubs faltantes ═══")
  for (const name of PP_STUBS) {
    const key = name.toUpperCase().trim()
    if (productByName[key]) {
      console.log(`  ✓ ${name} ya existe: ${productByName[key]}`)
    } else {
      try {
        const [created] = await supabasePublic("products", {
          method: "POST",
          body: JSON.stringify({ name, category: "PP", unit: "gramos", is_active: true }),
        })
        console.log(`  + Creado PP: ${name} → ${created.id}`)
        productByName[key] = created.id
      } catch (e: any) {
        console.error(`  ✗ Error creando PP ${name}:`, e.message)
      }
    }
  }

  // ── Step 3: Create missing PT ──
  console.log("\n═══ PASO 3: Crear PT faltante ═══")
  const newPtName = "Croissant Multicereal margarina 20g"
  const newPtKey = newPtName.toUpperCase().trim()
  let newPtId: string | null = null
  if (productByName[newPtKey]) {
    console.log(`  ✓ ${newPtName} ya existe: ${productByName[newPtKey]}`)
    newPtId = productByName[newPtKey]
  } else {
    try {
      const [created] = await supabasePublic("products", {
        method: "POST",
        body: JSON.stringify({ name: newPtName, category: "PT", unit: "unidad", is_active: true }),
      })
      console.log(`  + Creado PT: ${newPtName} → ${created.id}`)
      newPtId = created.id
      productByName[newPtKey] = created.id
    } catch (e: any) {
      console.error(`  ✗ Error creando PT ${newPtName}:`, e.message)
    }
  }

  // Replace placeholder PT ID
  for (const def of PT_DEFS) {
    if (def.ptId === "__NEW_CROISSANT_MULTI_MARG_20G__") {
      if (newPtId) {
        def.ptId = newPtId
      } else {
        console.error("  ✗ No se pudo crear PT Croissant Multicereal margarina 20g, se salta")
      }
    }
  }

  // ── Step 4: Create routes for PT ──
  console.log("\n═══ PASO 4: Crear rutas PT ═══")
  let routesCreated = 0
  let routesSkipped = 0

  for (const def of PT_DEFS) {
    if (def.ptId.startsWith("__")) continue // placeholder not resolved
    if (def.routeType === "panaderia") continue // panadería already has routes

    try {
      const existingRoutes = await supabaseProduccion(
        `production_routes?select=id&product_id=eq.${def.ptId}&limit=1`
      )
      if (existingRoutes.length > 0) {
        routesSkipped++
        continue
      }

      const wcIds = def.routeType === "hojaldre" ? ROUTE_HOJALDRE : ROUTE_CROISSANT
      const routes = wcIds.map((wcId, i) => ({
        product_id: def.ptId,
        work_center_id: wcId,
        sequence_order: i + 1,
        is_active: true,
      }))

      await supabaseProduccion("production_routes", {
        method: "POST",
        body: JSON.stringify(routes),
      })
      routesCreated++
    } catch (e: any) {
      console.error(`  ✗ Error ruta PT ${def.ptId}:`, e.message)
    }
  }
  console.log(`  Rutas creadas: ${routesCreated}, ya existían: ${routesSkipped}`)

  // ── Step 5: Create BOM for PT ──
  console.log("\n═══ PASO 5: Crear BOM para PT ═══")
  let bomCreated = 0
  let bomSkipped = 0
  let bomErrors = 0

  for (const def of PT_DEFS) {
    if (def.ptId.startsWith("__")) continue

    try {
      // Check existing BOM
      const existingBom = await supabaseProduccion(
        `bill_of_materials?select=id&product_id=eq.${def.ptId}&limit=1`
      )
      if (existingBom.length > 0) {
        bomSkipped++
        continue
      }

      const items = def.components.map(comp => {
        const materialId = resolveComponentId(comp.alias)
        return {
          product_id: def.ptId,
          material_id: materialId,
          operation_id: OP.armado,
          quantity_needed: comp.grams,
          original_quantity: comp.grams,
          unit_name: "GR",
          unit_equivalence_grams: 1,
          is_active: true,
        }
      })

      await supabaseProduccion("bill_of_materials", {
        method: "POST",
        body: JSON.stringify(items),
      })
      bomCreated++
    } catch (e: any) {
      bomErrors++
      console.error(`  ✗ Error BOM PT ${def.ptId}:`, e.message)
    }
  }
  console.log(`  BOM creados: ${bomCreated}, ya existían: ${bomSkipped}, errores: ${bomErrors}`)

  console.log("\n🎉 ¡Carga de PT completa!")
}

main().catch(console.error)
