// Import inventario strumenti ENEMEK → tabella asset + asset_event
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { resolve } from "node:path";
import XLSX from "xlsx";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const QUALITA = "C:/Users/christiancapuano/Desktop/qualita";
const COMPANY = "f3b8c73d-8b0e-4f59-99b5-0366314f41f3"; // Enemek Engineering Iberica

const dir15 = (await readdir(QUALITA)).find((d) => d.startsWith("15-"));
const subDir = (await readdir(resolve(QUALITA, dir15))).find((d) => d.startsWith("P-15"));
const xlsxName = (await readdir(resolve(QUALITA, dir15, subDir))).find((f) => f.includes("INSTRUMENTACION") && f.endsWith(".xlsx"));
const filePath = resolve(QUALITA, dir15, subDir, xlsxName);

const wb = XLSX.read(readFileSync(filePath), { type: "buffer" });
const sheet = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", blankrows: false });

function excelDate(v) {
  if (typeof v !== "number" || v < 30000 || v > 80000) return null;
  const d = new Date(Math.round((v - 25569) * 86400 * 1000));
  return d.toISOString().slice(0, 10);
}

const data = rows.slice(3).filter((r) => r[0]); // skippa header/titoli
console.log(`📥 Import ${data.length} strumenti misura → company ${COMPANY}\n`);

let ok = 0, skip = 0, fail = 0;
const usedCodes = new Set();

for (const r of data) {
  const [recurso, fabricante, modelo, serie, calDate, nextCal, estCal, estado, frecuencia] = r;
  if (!recurso || !String(recurso).trim()) { skip++; continue; }

  // code unico: usa SERIE, fallback su RECURSO+MODELO normalizzato
  let code = String(serie || "").trim().replace(/\s+/g, "-");
  if (!code) code = `${String(recurso).slice(0, 10)}-${String(modelo || "X").slice(0, 6)}`.toUpperCase().replace(/[^A-Z0-9-]/g, "");
  // garantisci unicità nella sessione
  let base = code; let n = 1;
  while (usedCodes.has(code)) { code = `${base}-${n++}`; }
  usedCodes.add(code);

  const status = estado === "EN USO" ? "disponibile" : "fuori_servizio";

  // Insert asset (upsert manuale per evitare duplicati al re-run)
  const { data: existing } = await supabase
    .from("asset")
    .select("id")
    .eq("company_id", COMPANY)
    .eq("code", code)
    .maybeSingle();

  let assetId;
  if (existing) {
    assetId = existing.id;
    await supabase.from("asset").update({
      asset_type: "strumento_misura",
      description: String(recurso).trim(),
      manufacturer: String(fabricante || "").trim() || null,
      model: String(modelo || "").trim() || null,
      serial_number: String(serie || "").trim() || null,
      status,
    }).eq("id", assetId);
  } else {
    const { data: ins, error } = await supabase.from("asset").insert({
      company_id: COMPANY,
      asset_type: "strumento_misura",
      code,
      description: String(recurso).trim(),
      manufacturer: String(fabricante || "").trim() || null,
      model: String(modelo || "").trim() || null,
      serial_number: String(serie || "").trim() || null,
      status,
      notes: `Importato da INSTRUMENTACION INVENTARIO.xlsx${frecuencia ? ` · ${frecuencia}` : ""}`,
    }).select("id").single();
    if (error) {
      console.error(`  ✗ ${code}: ${error.message}`);
      fail++;
      continue;
    }
    assetId = ins.id;
  }

  // Insert asset_event taratura
  const calDateIso = excelDate(calDate);
  const nextCalIso = excelDate(nextCal);
  if (calDateIso) {
    const result = estCal === "EN VIGOR" ? "conforme" : estCal === "CADUCADO" ? "non_conforme" : null;
    await supabase.from("asset_event").insert({
      asset_id: assetId,
      event_type: "taratura",
      event_date: calDateIso,
      next_due_date: nextCalIso,
      result,
      notes: `Ultima taratura registrata · stato ${estCal} · ${frecuencia ?? ""}`.trim(),
    });
  }

  console.log(`  ✓ ${code} — ${String(recurso).slice(0, 50)} (${status}, ${estCal || "—"})`);
  ok++;
}

console.log(`\n✅ Completato: ${ok} strumenti importati, ${skip} skip, ${fail} errori`);
