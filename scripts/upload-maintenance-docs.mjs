#!/usr/bin/env node
/**
 * Upload equipment maintenance documents from local folders to Supabase storage
 * and create entries in mantenimiento.attachments table.
 *
 * Usage: node scripts/upload-maintenance-docs.mjs
 */

import { createRequire } from "module";
const require = createRequire(
  new URL("../apps/web/package.json", import.meta.url)
);
const { createClient } = require("@supabase/supabase-js");
import fs from "fs";
import path from "path";

// ── Supabase config ──────────────────────────────────────────────
const SUPABASE_URL = "https://khwcknapjnhpxfodsahb.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtod2NrbmFwam5ocHhmb2RzYWhiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjUzMTk4NywiZXhwIjoyMDY4MTA3OTg3fQ.-qZa2anhBkOjRF4V8Anr5kFT05StD3vBeYwOpATTZ44";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const BUCKET = "mantenimiento-attachments";
const BASE_DIR =
  "/Users/nicolasquintero/Documents/PastryChef_SGC/06_Mantenimiento/Por_Equipo";

// ── Folder → equipment code mapping ─────────────────────────────
const FOLDER_MAP = {
  Abatidor_Congelador: ["AB-001"],
  Amasadoras: ["AT-001", "AE-001", "AE-002"],
  Basculas: ["BD-001"],
  Camara_Leudado: ["CF-001"],
  Compresor: ["CA-001"],
  Contenedor_Thermo_King: ["TK-001"],
  Cortadora_Masa: ["CM-001"],
  Croissomat: ["CR-001"],
  Flow_Pack: ["FPK-001"],
  Hidrolavadora: ["HL-001"],
  Hornos: ["HR-001", "HR-002"],
  Impresora: ["IE-001"],
  Laminadoras: ["LM-001", "LM-002"],
  Licuadora: ["LI-001"],
  Microondas: ["MO-001"],
  Refrigeracion: ["AB-002", "UC-001", "CF-MP-001", "CF-PT-001"],
  Sarten_Basculante: ["SBG-001"],
  Selladora: ["SB-001"],
  Talsa: ["AT-001"],
  Thermo_King: ["TK-002"],
  Trampa_Grasas: ["TG-001"],
  Ultra_Congelador: ["UC-001"],
};

const SKIP_FOLDERS = new Set([
  "Audios_Diagnostico",
  "Lubricantes_Food_Grade",
  "Videos",
]);

// Extensions to skip (video/audio)
const SKIP_EXTS = new Set([".mp4", ".ogg", ".mp3", ".wav", ".avi", ".mov"]);

// Allowed extensions
const ALLOWED_EXTS = new Set([
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".xlsx",
  ".xls",
  ".docx",
  ".doc",
  ".csv",
  ".txt",
]);

// Content type mapping
const CONTENT_TYPES = {
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".xlsx":
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".xls": "application/vnd.ms-excel",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".doc": "application/msword",
  ".csv": "text/csv",
  ".txt": "text/plain",
};

// ── Name-based routing for multi-equipment folders ──────────────
function matchFileToEquipment(fileName, folderCodes) {
  // If only one code, always use it
  if (folderCodes.length === 1) return folderCodes;

  const upper = fileName.toUpperCase();
  const matched = [];

  // Amasadoras matching
  if (folderCodes.includes("AT-001")) {
    if (upper.includes("TALSA") || upper.includes("LM-50") || upper.includes("CI TALSA")) {
      matched.push("AT-001");
    }
    if (upper.includes("SM-80")) {
      matched.push("AE-002");
    }
    if (upper.includes("SM-120") || upper.includes("START") || upper.includes("SM-120T")) {
      matched.push("AE-001");
    }
  }

  // Laminadoras matching
  if (folderCodes.includes("LM-001")) {
    if (upper.includes("POLYLINE")) {
      matched.push("LM-001");
    }
    if (upper.includes("QUEEN")) {
      matched.push("LM-002");
    }
  }

  // Refrigeracion matching
  if (folderCodes.includes("AB-002")) {
    if (upper.includes("BFR201") || upper.includes("ISR201")) {
      matched.push("AB-002");
    }
    if (upper.includes("ULTRA")) {
      matched.push("UC-001");
    }
    if (upper.includes("CHILLER") || upper.includes("CH330")) {
      // Generic refrigeration — upload to all
    }
    if (upper.includes("CV465")) {
      // CV-001 not in our code list, skip specific match
    }
  }

  // Hornos — no specific file matching, upload to all
  // If no specific match found, upload to ALL codes for this folder
  if (matched.length === 0) return folderCodes;
  return [...new Set(matched)];
}

// ── Equipment ID cache ──────────────────────────────────────────
const equipmentIdCache = {};

async function getEquipmentId(code) {
  if (equipmentIdCache[code]) return equipmentIdCache[code];

  const { data, error } = await supabase
    .schema("mantenimiento")
    .from("equipment")
    .select("id")
    .eq("code", code)
    .single();

  if (error || !data) {
    console.warn(`  [WARN] Equipment code "${code}" not found in DB`);
    return null;
  }

  equipmentIdCache[code] = data.id;
  return data.id;
}

// Sanitize filename: replace accented chars and spaces for Supabase storage keys
function sanitizeFileName(name) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/[^a-zA-Z0-9._\-()]/g, "_") // replace non-safe chars with _
    .replace(/_+/g, "_"); // collapse multiple underscores
}

// ── Upload a single file ────────────────────────────────────────
async function uploadFile(filePath, equipmentCode, equipmentId) {
  const fileName = path.basename(filePath);
  const safeName = sanitizeFileName(fileName);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = CONTENT_TYPES[ext] || "application/octet-stream";
  const storagePath = `equipment/${equipmentCode}/${safeName}`;

  const fileBuffer = fs.readFileSync(filePath);

  // Upload to storage
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, fileBuffer, {
      contentType,
      upsert: true,
    });

  if (uploadError) {
    console.error(`  [ERR] Upload failed for ${storagePath}: ${uploadError.message}`);
    return false;
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(storagePath);

  // Check if attachment already exists for this entity + file_name
  const { data: existing } = await supabase
    .schema("mantenimiento")
    .from("attachments")
    .select("id")
    .eq("entity_type", "equipment")
    .eq("entity_id", equipmentId)
    .eq("file_name", fileName)
    .limit(1);

  if (existing && existing.length > 0) {
    // Already exists, skip insert
    return "exists";
  }

  // Insert attachment record
  const { error: insertError } = await supabase
    .schema("mantenimiento")
    .from("attachments")
    .insert({
      entity_type: "equipment",
      entity_id: equipmentId,
      file_url: urlData.publicUrl,
      file_name: fileName,
      file_type: contentType,
      uploaded_by: null,
    });

  if (insertError) {
    console.error(`  [ERR] DB insert failed for ${fileName} -> ${equipmentCode}: ${insertError.message}`);
    return false;
  }

  return true;
}

// ── Main ────────────────────────────────────────────────────────
async function main() {
  const folders = fs.readdirSync(BASE_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  let totalUploaded = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const folder of folders) {
    if (SKIP_FOLDERS.has(folder)) {
      console.log(`[SKIP] ${folder} (excluded folder)`);
      continue;
    }

    const codes = FOLDER_MAP[folder];
    if (!codes) {
      console.log(`[SKIP] ${folder} (no mapping)`);
      continue;
    }

    const folderPath = path.join(BASE_DIR, folder);
    const files = fs.readdirSync(folderPath).filter((f) => {
      const ext = path.extname(f).toLowerCase();
      if (SKIP_EXTS.has(ext)) return false;
      if (f.startsWith(".")) return false;
      // Allow known types or anything that's not audio/video
      return ALLOWED_EXTS.has(ext);
    });

    console.log(`\n[DIR] ${folder} -> ${codes.join(", ")} (${files.length} files)`);

    for (const file of files) {
      const filePath = path.join(folderPath, file);
      const targetCodes = matchFileToEquipment(file, codes);

      for (const code of targetCodes) {
        const equipId = await getEquipmentId(code);
        if (!equipId) {
          console.log(`  [SKIP] ${file} -> ${code} (equipment not found)`);
          totalSkipped++;
          continue;
        }

        const result = await uploadFile(filePath, code, equipId);
        if (result === "exists") {
          console.log(`  [EXISTS] ${file} -> ${code}`);
        } else if (result) {
          console.log(`  [OK] ${file} -> ${code}`);
          totalUploaded++;
        } else {
          totalErrors++;
        }
      }
    }
  }

  console.log(`\n========================================`);
  console.log(`Done! Uploaded: ${totalUploaded}, Skipped: ${totalSkipped}, Errors: ${totalErrors}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
