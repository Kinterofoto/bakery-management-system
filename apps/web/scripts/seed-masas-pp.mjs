#!/usr/bin/env node
/**
 * Seed script: Create PP products for masas with BOM and operation assignments.
 *
 * Run from apps/web/:
 *   node scripts/seed-masas-pp.mjs
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Load env ────────────────────────────────────────────────────────────────
function loadEnv() {
  const envPath = resolve(__dirname, "../.env.local");
  const lines = readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}
loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseKey);

// ── Constants: operation IDs ────────────────────────────────────────────────
const OP = {
  PESAJES:   "d63acd22-79e5-4c20-b6ff-b8931cc706b8",
  MARGARINAS:"2585fda5-0d20-4ff8-a10c-03bca6ccbc9a",
  AMASADO:   "3f4805cf-1e0c-47f2-b869-412a66ebd164",
  EMPASTADO: "14456518-7f6a-4bf1-ab0d-5abe6d9cce55",
  LAMINADO:  "0810325a-bbf5-4113-8f57-32570c2f8ee0",
};

// ── Constants: material IDs ─────────────────────────────────────────────────
const MAT = {
  HARINA_TRIGO:       "6023738a-5bb5-493e-819c-1b380cd0993b",
  HARINA_MULTI:       "61231de6-279e-4953-8b10-ce3509aa81ce",
  HARINA_INTEGRAL:    "8129ea89-8efb-4622-aa00-5ee9b3138406",
  HARINA_GALLETARINA: "925bfe21-b59f-42e2-92c8-0948063071bb",
  MARG_5ESTRELLAS:    "f2329a76-d6b7-466b-80e1-5b1369f1e4b6",
  MANTEQUILLA:        "9fea89cd-c92e-410f-a0bc-c4dfc6600431",
  MARG_EMPASTE:       "0d6281e9-8aea-45ca-a924-6be351bdcbd7",
  LEVADURA:           "d71b20da-1700-41fa-a980-071020ea1653",
  LEVADURA_FRESCA:    "c5b84919-47e0-4168-86e3-b7c094c8999c",
  LEVADURA_INSTANT:   "25819da9-eddd-449a-a0e2-ad9f357eb76c",
  AZUCAR:             "30ee7151-df25-48b1-95da-287e65ef61ef",
  SAL:                "a67e4e27-ba8a-4a87-a65d-ee40a62bd862",
  AGUA:               "6aae2818-3542-4d9b-a455-836f3db6d06b",
  VINAGRE:            "b8c805b4-ecf7-4bd8-a666-5c8adcb688a5",
  LECHE_POLVO:        "97c13413-9222-42b9-b6da-bb2643a6b6e5",
  LECHE_LIQUIDA:      "1dbe2936-d67a-4288-b1dc-5d26feb15ec1",
  COLOR_CARAMELO:     "8819e34d-3692-4bbf-9aee-e07c499ab85d",
  ESENCIA_MANTEQUILLA:"64dfa0f0-5b40-4ded-8663-72c52206d586",
  ESENCIA_CANELA:     "eeca2597-6507-46a4-a8fd-34d6d0c8517a",
  ESENCIA_VAINILLA:   "e9b8b82d-5695-4795-b35b-91b637b5c6ce",
  HUEVOS:             "3b00b662-a5fe-4328-862a-bdde3fedd684",
  GLUTEN_MANITO:      "46ae7b25-c9c8-473e-880f-9be77a5b0e13",
  ADDIGERM_CHOCOL:    "98e274ef-c048-4875-a6e0-f152e74b02d4",
  ADDIGERM_SOFTNESS:  "4a1e6c0e-cb47-4bcd-8337-b91d0abd8625",
  GRANOLIFE_FRESH:    "432fd285-0df6-4212-9667-56577ed78afa",
  S500_LAMINADO:      "040210e9-6a3b-44e0-8363-770cd311c2f0",
};

// Placeholders for recorte IDs – filled after insert
let RECORTE_HOJALDRE_ID   = null;
let RECORTE_HOJALDRADO_ID = null;
let RECORTE_CROISSANT_ID  = null;

// ── Recipe definitions ──────────────────────────────────────────────────────
// Each recipe has:
//   pesajes:   [{id, qty}]   → operation Pesajes (all batch except agua)
//   amasado:   [{id, qty}]   → operation Amasado  (agua only)
//   margarinas:[{id, qty}]   → operation Margarinas (empaste ingredients)
//   tipo: "empaste" | "panaderia"

function buildRecipes() {
  return [
    // ── 1. MASA CROISSANT MANTEQUILLA 35G ──────────────────────────────
    {
      name: "MASA CROISSANT MANTEQUILLA 35G",
      tipo: "empaste",
      pesajes: [
        { id: MAT.HARINA_TRIGO,    qty: 9780 },
        { id: MAT.HARINA_MULTI,    qty: 3260 },   // CANDOR
        { id: MAT.LEVADURA,        qty: 235 },
        { id: MAT.AZUCAR,          qty: 1304 },
        { id: MAT.MARG_5ESTRELLAS, qty: 522 },
        { id: MAT.SAL,             qty: 261 },
      ],
      amasado: [],
      margarinas: [
        { id: MAT.MANTEQUILLA,  qty: 6520 },
        { id: MAT.HARINA_MULTI, qty: 535 },        // Harina para empaste
      ],
    },
    // ── 2. MASA CROISSANT MULTICEREAL MANTEQUILLA 35G ──────────────────
    {
      name: "MASA CROISSANT MULTICEREAL MANTEQUILLA 35G",
      tipo: "empaste",
      pesajes: [
        { id: MAT.HARINA_TRIGO,    qty: 11023.50 },
        { id: MAT.HARINA_INTEGRAL, qty: 1945.30 },
        { id: MAT.LEVADURA,        qty: 233.40 },
        { id: MAT.AZUCAR,          qty: 1297 },
        { id: MAT.MARG_5ESTRELLAS, qty: 648.40 },
        { id: MAT.SAL,             qty: 285.30 },
        { id: MAT.COLOR_CARAMELO,  qty: 91 },
      ],
      amasado: [],
      margarinas: [
        { id: MAT.MANTEQUILLA,  qty: 6484 },
        { id: MAT.HARINA_MULTI, qty: 532 },
      ],
    },
    // ── 3. MASA PAN DE CHOCOLATE ────────────────────────────────────────
    {
      name: "MASA PAN DE CHOCOLATE",
      tipo: "empaste",
      pesajes: [
        // HARINA SM + HARINA MULTIPROPOSITO → same material, combined
        { id: MAT.HARINA_MULTI,    qty: 8029.86 + 5353.24 }, // 13383.10
        { id: MAT.LEVADURA_FRESCA, qty: 200.75 },
        { id: MAT.AZUCAR,          qty: 1605.97 },
        { id: MAT.MARG_5ESTRELLAS, qty: 1070.65 },
        { id: MAT.SAL,             qty: 239.42 },
        { id: MAT.LECHE_POLVO,     qty: 535 },
        { id: MAT.HUEVOS,          qty: 1338 },
      ],
      amasado: [
        { id: MAT.AGUA, qty: 5326 },
      ],
      margarinas: [
        { id: MAT.MANTEQUILLA, qty: 1500 },
      ],
    },
    // ── 4. MASA HOJALDRE CON RECORTE ────────────────────────────────────
    {
      name: "MASA HOJALDRE CON RECORTE",
      tipo: "empaste",
      pesajes: [
        { id: MAT.HARINA_TRIGO,    qty: 23728 },
        { id: MAT.AZUCAR,          qty: 475 },
        { id: MAT.MARG_5ESTRELLAS, qty: 259 },     // MARGARINA MULTIPROPOSITO
        { id: MAT.SAL,             qty: 522 },
        { id: MAT.VINAGRE,         qty: 119 },
        { id: "RECORTE_HOJALDRE",  qty: 4000 },    // placeholder
      ],
      amasado: [
        { id: MAT.AGUA, qty: 13288 },
      ],
      margarinas: [
        { id: MAT.MARG_EMPASTE, qty: 2000 },
      ],
    },
    // ── 5. MASA HOJALDRE SIN RECORTE ────────────────────────────────────
    {
      name: "MASA HOJALDRE SIN RECORTE",
      tipo: "empaste",
      pesajes: [
        { id: MAT.HARINA_TRIGO,    qty: 25583 },
        { id: MAT.AZUCAR,          qty: 512 },
        { id: MAT.MARG_5ESTRELLAS, qty: 1279 },
        { id: MAT.SAL,             qty: 563 },
        { id: MAT.VINAGRE,         qty: 128 },
      ],
      amasado: [
        { id: MAT.AGUA, qty: 14325 },
      ],
      margarinas: [
        { id: MAT.MARG_EMPASTE, qty: 2000 },
      ],
    },
    // ── 6. MASA HOJALDRE CON RECORTE 25000G ─────────────────────────────
    {
      name: "MASA HOJALDRE CON RECORTE 25000G",
      tipo: "empaste",
      pesajes: [
        { id: MAT.HARINA_TRIGO,    qty: 25000 },
        { id: MAT.AZUCAR,          qty: 500.46 },
        { id: MAT.MARG_5ESTRELLAS, qty: 272.88 },
        { id: MAT.SAL,             qty: 549.98 },
        { id: MAT.VINAGRE,         qty: 125.38 },
        { id: "RECORTE_HOJALDRE",  qty: 4000 },
      ],
      amasado: [
        { id: MAT.AGUA, qty: 13250 },
      ],
      margarinas: [
        { id: MAT.MARG_EMPASTE, qty: 2000 },
      ],
    },
    // ── 7. MASA ROLLO DE CANELA ─────────────────────────────────────────
    {
      name: "MASA ROLLO DE CANELA",
      tipo: "empaste",
      pesajes: [
        { id: MAT.HARINA_TRIGO,    qty: 12121 },
        { id: MAT.LEVADURA_FRESCA, qty: 109 },
        { id: MAT.AZUCAR,          qty: 1212 },
        { id: MAT.MANTEQUILLA,     qty: 606 },
        { id: MAT.SAL,             qty: 194 },
        { id: MAT.ESENCIA_CANELA,  qty: 35 },
      ],
      amasado: [
        { id: MAT.AGUA, qty: 6222 },
      ],
      margarinas: [
        { id: MAT.MANTEQUILLA, qty: 1650 },
      ],
    },
    // ── 8. MASA CROISSANT MARGARINA 30G ─────────────────────────────────
    // Empaste not listed. Calculated: n_masas = batch_total / peso_cada_masa
    // batch_total = 38823, peso_cada_masa = 6600 → n = 5.882
    // empaste = 5.882 × 1254 = 7376.03 (MARGARINA DE EMPASTE)
    {
      name: "MASA CROISSANT MARGARINA 30G",
      tipo: "empaste",
      pesajes: [
        { id: MAT.HARINA_MULTI,       qty: 13390 },
        { id: MAT.HARINA_GALLETARINA, qty: 8926 },
        { id: MAT.LEVADURA_FRESCA,    qty: 360 },
        { id: MAT.AZUCAR,             qty: 2678 },
        { id: MAT.MARG_5ESTRELLAS,    qty: 1785 },
        { id: MAT.SAL,                qty: 402 },
        { id: MAT.GRANOLIFE_FRESH,    qty: 56 },
        { id: MAT.ESENCIA_MANTEQUILLA,qty: 89 },
        { id: MAT.LECHE_LIQUIDA,      qty: 6137 },
      ],
      amasado: [
        { id: MAT.AGUA, qty: 5000 },
      ],
      margarinas: [
        { id: MAT.MARG_EMPASTE, qty: +(((38823 / 6600) * 1254).toFixed(2)) },
      ],
    },
    // ── 9. MASA HOJALDRADO SIN RECORTE ──────────────────────────────────
    // Empaste not listed. n_masas = 44699/7450 ≈ 6 → empaste = 6 × 2000 = 12000
    {
      name: "MASA HOJALDRADO SIN RECORTE",
      tipo: "empaste",
      pesajes: [
        { id: MAT.HARINA_TRIGO,    qty: 25645 },
        { id: MAT.LEVADURA_INSTANT, qty: 151 },
        { id: MAT.AZUCAR,          qty: 4103 },
        { id: MAT.MARG_5ESTRELLAS, qty: 1328 },
        { id: MAT.SAL,             qty: 480 },
      ],
      amasado: [
        { id: MAT.AGUA, qty: 12992 },
      ],
      margarinas: [
        { id: MAT.MARG_EMPASTE, qty: +((Math.round(44699 / 7450) * 2000).toFixed(2)) },
      ],
    },
    // ── 10. MASA HOJALDRADO CON RECORTE ─────────────────────────────────
    // Empaste not listed. n_masas = 46122.03/7687 ≈ 6 → empaste = 12000
    {
      name: "MASA HOJALDRADO CON RECORTE",
      tipo: "empaste",
      pesajes: [
        { id: MAT.HARINA_TRIGO,     qty: 25000 },
        { id: MAT.LEVADURA_INSTANT,  qty: 147.89 },
        { id: MAT.AZUCAR,           qty: 4000.42 },
        { id: MAT.MARG_5ESTRELLAS,  qty: 405.92 },
        { id: MAT.SAL,              qty: 467.80 },
        { id: "RECORTE_HOJALDRADO", qty: 4000 },
      ],
      amasado: [
        { id: MAT.AGUA, qty: 12100 },
      ],
      margarinas: [
        { id: MAT.MARG_EMPASTE, qty: +((Math.round(46122.03 / 7687) * 2000).toFixed(2)) },
      ],
    },
    // ── 11. MASA HOJALDRADO CON RECORTE 25000G ─────────────────────────
    // Empaste listed: 2000g MARGARINA EMPASTE. Adding RECORTE (name says "CON RECORTE")
    {
      name: "MASA HOJALDRADO CON RECORTE 25000G",
      tipo: "empaste",
      pesajes: [
        { id: MAT.HARINA_TRIGO,    qty: 25000 },
        { id: MAT.AZUCAR,          qty: 500.46 },
        { id: MAT.MARG_5ESTRELLAS, qty: 272.88 },
        { id: MAT.SAL,             qty: 549.98 },
        { id: MAT.VINAGRE,         qty: 125.38 },
        { id: "RECORTE_HOJALDRADO",qty: 4000 },
      ],
      amasado: [
        { id: MAT.AGUA, qty: 13250 },
      ],
      margarinas: [
        { id: MAT.MARG_EMPASTE, qty: 2000 },
      ],
    },
    // ── 12. MASA PAN BRIOCHE ────────────────────────────────────────────
    {
      name: "MASA PAN BRIOCHE",
      tipo: "panaderia",
      pesajes: [
        // HARINA 3 CASTILLOS + HARINA CANDOR SM → both HARINA_MULTI
        { id: MAT.HARINA_MULTI,        qty: 5534 + 8301 }, // 13835
        { id: MAT.LEVADURA_FRESCA,     qty: 387 },
        { id: MAT.AZUCAR,              qty: 2214 },
        { id: MAT.MANTEQUILLA,         qty: 1522 },
        { id: MAT.MARG_5ESTRELLAS,     qty: 1107 },
        { id: MAT.SAL,                 qty: 249 },
        { id: MAT.HUEVOS,              qty: 1107 },
        { id: MAT.ESENCIA_MANTEQUILLA, qty: 111 },
        { id: MAT.LECHE_POLVO,         qty: 415 },
        { id: MAT.ADDIGERM_CHOCOL,     qty: 138 },
        { id: MAT.ADDIGERM_SOFTNESS,   qty: 138 },
        { id: MAT.GLUTEN_MANITO,       qty: 138 },
      ],
      amasado: [
        { id: MAT.AGUA, qty: 4308 },
      ],
      margarinas: [],
    },
    // ── 13. MASA CROISSANT MULTICEREAL SR ───────────────────────────────
    // Empaste not listed. Using peso_cada_masa ≈ 5868 (from Europa CR pair)
    // n_masas = 23468/5868 ≈ 4 → empaste = 4 × 1750 = 7000 Mantequilla
    {
      name: "MASA CROISSANT MULTICEREAL SR",
      tipo: "empaste",
      pesajes: [
        { id: MAT.HARINA_TRIGO,    qty: 11931 },
        { id: MAT.HARINA_INTEGRAL, qty: 1942 },
        { id: MAT.LEVADURA_FRESCA, qty: 277 },
        { id: MAT.AZUCAR,          qty: 1387 },
        { id: MAT.MANTEQUILLA,     qty: 416 },
        { id: MAT.SAL,             qty: 309 },
        { id: MAT.COLOR_CARAMELO,  qty: 97 },
      ],
      amasado: [
        { id: MAT.AGUA, qty: 7109 },
      ],
      margarinas: [
        { id: MAT.MANTEQUILLA, qty: +((Math.round(23468 / 5868) * 1750).toFixed(2)) },
      ],
    },
    // ── 14. MASA CROISSANT MULTICEREAL CR ───────────────────────────────
    // n_masas = 23469/5868 ≈ 4 → empaste = 7000 Mantequilla
    {
      name: "MASA CROISSANT MULTICEREAL CR",
      tipo: "empaste",
      pesajes: [
        { id: MAT.HARINA_TRIGO,    qty: 11376 },
        { id: MAT.HARINA_INTEGRAL, qty: 1942 },
        { id: MAT.LEVADURA_FRESCA, qty: 266 },
        { id: MAT.AZUCAR,          qty: 1332 },
        { id: MAT.MANTEQUILLA,     qty: 122 },
        { id: MAT.SAL,             qty: 297 },
        { id: MAT.COLOR_CARAMELO,  qty: 93 },
        { id: "RECORTE_CROISSANT", qty: 1216 },
      ],
      amasado: [
        { id: MAT.AGUA, qty: 6825 },
      ],
      margarinas: [
        { id: MAT.MANTEQUILLA, qty: +((Math.round(23469 / 5868) * 1750).toFixed(2)) },
      ],
    },
    // ── 15. MASA CROISSANT EUROPA SR ────────────────────────────────────
    // n_masas = 23473/5868 ≈ 4 → empaste = 8000 Mantequilla
    {
      name: "MASA CROISSANT EUROPA SR",
      tipo: "empaste",
      pesajes: [
        { id: MAT.HARINA_TRIGO,       qty: 13930 },
        { id: MAT.LEVADURA_FRESCA,    qty: 279 },
        { id: MAT.AZUCAR,             qty: 1254 },
        { id: MAT.MANTEQUILLA,        qty: 418 },
        { id: MAT.SAL,                qty: 279 },
        { id: MAT.ESENCIA_MANTEQUILLA,qty: 42 },
      ],
      amasado: [
        { id: MAT.AGUA, qty: 7271 },
      ],
      margarinas: [
        { id: MAT.MANTEQUILLA, qty: +((Math.round(23473 / 5868) * 2000).toFixed(2)) },
      ],
    },
    // ── 16. MASA CROISSANT EUROPA CR ────────────────────────────────────
    // n_masas = 23472/5868 ≈ 4 → empaste = 8000 Mantequilla
    {
      name: "MASA CROISSANT EUROPA CR",
      tipo: "empaste",
      pesajes: [
        { id: MAT.HARINA_TRIGO,       qty: 13373 },
        { id: MAT.LEVADURA_FRESCA,    qty: 267 },
        { id: MAT.AZUCAR,             qty: 1204 },
        { id: MAT.MANTEQUILLA,        qty: 84 },
        { id: MAT.SAL,                qty: 267 },
        { id: MAT.ESENCIA_MANTEQUILLA,qty: 40 },
        { id: "RECORTE_CROISSANT",    qty: 1256 },
      ],
      amasado: [
        { id: MAT.AGUA, qty: 6981 },
      ],
      margarinas: [
        { id: MAT.MANTEQUILLA, qty: +((Math.round(23472 / 5868) * 2000).toFixed(2)) },
      ],
    },
    // ── 17. MASA CROISSANT MARGARINA 75G ────────────────────────────────
    {
      name: "MASA CROISSANT MARGARINA 75G",
      tipo: "empaste",
      pesajes: [
        { id: MAT.HARINA_MULTI,        qty: 12062.36 },
        { id: MAT.HARINA_GALLETARINA,  qty: 8041.57 },
        { id: MAT.LEVADURA_INSTANT,    qty: 139.25 },
        { id: MAT.AZUCAR,              qty: 1810.22 },
        { id: MAT.MARG_5ESTRELLAS,     qty: 800.68 },
        { id: MAT.LECHE_POLVO,         qty: 800.68 },
        { id: MAT.SAL,                 qty: 304.61 },
        { id: MAT.S500_LAMINADO,       qty: 104.44 },
        { id: MAT.ESENCIA_MANTEQUILLA, qty: 60.92 },
      ],
      amasado: [
        { id: MAT.AGUA, qty: 10678.58 },
      ],
      margarinas: [
        { id: MAT.MARG_EMPASTE, qty: 9000 },
      ],
    },
    // ── 18. MASA CROISSANT ALMENDRAS ────────────────────────────────────
    // n_masas = 20207/5050 ≈ 4 → empaste = 4 × 1500 = 6000 Mantequilla
    {
      name: "MASA CROISSANT ALMENDRAS",
      tipo: "empaste",
      pesajes: [
        { id: MAT.HARINA_TRIGO,     qty: 11900 },
        { id: MAT.LEVADURA_FRESCA,  qty: 238 },
        { id: MAT.AZUCAR,           qty: 1071 },
        { id: MAT.MANTEQUILLA,      qty: 357 },
        { id: MAT.SAL,              qty: 238 },
        { id: MAT.ESENCIA_VAINILLA, qty: 36 },
        { id: MAT.ADDIGERM_CHOCOL,  qty: 60 },
      ],
      amasado: [
        { id: MAT.AGUA, qty: 6307 },
      ],
      margarinas: [
        { id: MAT.MANTEQUILLA, qty: +((Math.round(20207 / 5050) * 1500).toFixed(2)) },
      ],
    },
    // ── 19. MASA PAÑUELO NAPOLITANO ─────────────────────────────────────
    {
      name: "MASA PAÑUELO NAPOLITANO",
      tipo: "empaste",
      pesajes: [
        // Harina multiproposito + Harina pastelera → same material (MULTI), divided by 6
        { id: MAT.HARINA_MULTI,        qty: (58306.48 + 87440.85) / 6 }, // 24291.22
        { id: MAT.LEVADURA_FRESCA,     qty: 2339.81 / 6 },
        { id: MAT.AZUCAR,              qty: 17359.86 / 6 },
        { id: MAT.MANTEQUILLA,         qty: 11699.04 / 6 },
        { id: MAT.LECHE_LIQUIDA,       qty: 40003.15 / 6 },
        { id: MAT.SAL,                 qty: 2641.72 / 6 },
        { id: MAT.ESENCIA_MANTEQUILLA, qty: 754.78 / 6 },
      ],
      amasado: [
        { id: MAT.AGUA, qty: 32342.17 / 6 },
      ],
      margarinas: [
        { id: MAT.MANTEQUILLA, qty: 67929.88 / 6 },
      ],
    },
  ];
}

// ── Resolve recorte placeholder IDs ─────────────────────────────────────────
function resolveRecorteId(id) {
  if (id === "RECORTE_HOJALDRE")   return RECORTE_HOJALDRE_ID;
  if (id === "RECORTE_HOJALDRADO") return RECORTE_HOJALDRADO_ID;
  if (id === "RECORTE_CROISSANT")  return RECORTE_CROISSANT_ID;
  return id;
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log("=== Seeding PP Masas ===\n");

  // ── Step 1: Create 3 recorte products ─────────────────────────────────
  console.log("Step 1: Creating 3 recorte PP products...");
  const recortes = [
    { name: "RECORTE MASA DE HOJALDRE",   unit: "G", category: "PP", is_active: true, is_recipe_by_grams: false },
    { name: "RECORTE MASA DE HOJALDRADO", unit: "G", category: "PP", is_active: true, is_recipe_by_grams: false },
    { name: "RECORTE MASA DE CROISSANT",  unit: "G", category: "PP", is_active: true, is_recipe_by_grams: false },
  ];
  const { data: recorteData, error: recorteErr } = await supabase
    .from("products")
    .insert(recortes)
    .select("id, name");

  if (recorteErr) {
    console.error("Error creating recortes:", recorteErr);
    process.exit(1);
  }
  for (const r of recorteData) {
    console.log(`  ✓ ${r.name} → ${r.id}`);
    if (r.name.includes("HOJALDRE") && !r.name.includes("HOJALDRADO"))
      RECORTE_HOJALDRE_ID = r.id;
    else if (r.name.includes("HOJALDRADO"))
      RECORTE_HOJALDRADO_ID = r.id;
    else if (r.name.includes("CROISSANT"))
      RECORTE_CROISSANT_ID = r.id;
  }

  // ── Step 2: Create 19 PP masa products ────────────────────────────────
  console.log("\nStep 2: Creating 19 masa PP products...");
  const recipes = buildRecipes();
  const productRows = recipes.map((r) => ({
    name: r.name,
    unit: "G",
    category: "PP",
    is_active: true,
    is_recipe_by_grams: true,
  }));

  const { data: productData, error: productErr } = await supabase
    .from("products")
    .insert(productRows)
    .select("id, name");

  if (productErr) {
    console.error("Error creating masa products:", productErr);
    process.exit(1);
  }

  // Map product name → id
  const productIdMap = {};
  for (const p of productData) {
    productIdMap[p.name] = p.id;
    console.log(`  ✓ ${p.name} → ${p.id}`);
  }

  // ── Step 3: Calculate and insert BOM + set lote_minimo ────────────────
  console.log("\nStep 3: Inserting BOM entries...");

  for (const recipe of recipes) {
    const productId = productIdMap[recipe.name];
    if (!productId) {
      console.error(`  ✗ Product not found: ${recipe.name}`);
      continue;
    }

    // Collect all ingredients with their operations
    const allIngredients = [];

    for (const item of recipe.pesajes) {
      allIngredients.push({
        material_id: resolveRecorteId(item.id),
        operation_id: OP.PESAJES,
        original_quantity: item.qty,
      });
    }
    for (const item of recipe.amasado) {
      allIngredients.push({
        material_id: resolveRecorteId(item.id),
        operation_id: OP.AMASADO,
        original_quantity: item.qty,
      });
    }
    for (const item of recipe.margarinas) {
      allIngredients.push({
        material_id: resolveRecorteId(item.id),
        operation_id: OP.MARGARINAS,
        original_quantity: item.qty,
      });
    }

    // Calculate grand total for normalization
    const grandTotal = allIngredients.reduce((s, i) => s + i.original_quantity, 0);

    // Sort by qty descending so we can adjust the largest for exact sum=1.000
    allIngredients.sort((a, b) => b.original_quantity - a.original_quantity);

    // Build BOM rows with 3-decimal normalization (matches NUMERIC(12,3) column)
    const bomRows = allIngredients.map((ing) => ({
      product_id: productId,
      material_id: ing.material_id,
      operation_id: ing.operation_id,
      quantity_needed: +(ing.original_quantity / grandTotal).toFixed(3),
      original_quantity: +ing.original_quantity.toFixed(2),
      unit_name: "g",
      unit_equivalence_grams: 1,
      is_active: true,
    }));

    // Adjust largest entry so total = exactly 1.000
    const restSum = bomRows.slice(1).reduce((s, r) => s + r.quantity_needed, 0);
    bomRows[0].quantity_needed = +(1.0 - restSum).toFixed(3);

    const sum = bomRows.reduce((s, r) => s + r.quantity_needed, 0);
    if (Math.abs(sum - 1.0) > 0.001) {
      console.warn(`  ⚠ ${recipe.name}: BOM sum = ${sum.toFixed(3)} (expected 1.000)`);
    }

    // Insert BOM
    const { error: bomErr } = await supabase
      .schema("produccion")
      .from("bill_of_materials")
      .insert(bomRows);

    if (bomErr) {
      console.error(`  ✗ BOM error for ${recipe.name}:`, bomErr);
      continue;
    }

    // Update lote_minimo
    const loteMinimo = +grandTotal.toFixed(3);
    const { error: loteErr } = await supabase
      .from("products")
      .update({ lote_minimo: loteMinimo })
      .eq("id", productId);

    if (loteErr) {
      console.error(`  ✗ lote_minimo error for ${recipe.name}:`, loteErr);
    }

    console.log(
      `  ✓ ${recipe.name}: ${bomRows.length} BOM entries, lote=${loteMinimo}g, sum=${sum.toFixed(4)}`
    );
  }

  // ── Step 4: Verification ──────────────────────────────────────────────
  console.log("\n=== Verification ===");

  const { data: ppProducts } = await supabase
    .from("products")
    .select("id, name")
    .eq("category", "PP")
    .eq("is_active", true);

  console.log(`PP products (active): ${ppProducts?.length || 0}`);

  // Check BOM sums for the new products
  const newIds = [
    ...recorteData.map((r) => r.id),
    ...productData.map((p) => p.id),
  ];

  for (const pid of productData.map((p) => p.id)) {
    const { data: bomData } = await supabase
      .schema("produccion")
      .from("bill_of_materials")
      .select("quantity_needed")
      .eq("product_id", pid);
    const bomSum = bomData?.reduce((s, r) => s + Number(r.quantity_needed), 0) || 0;
    const pName = productData.find((p) => p.id === pid)?.name;
    const status = Math.abs(bomSum - 1.0) < 0.01 ? "✓" : "⚠";
    console.log(`  ${status} ${pName}: BOM sum = ${bomSum.toFixed(6)}`);
  }

  console.log("\n=== Done ===");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
