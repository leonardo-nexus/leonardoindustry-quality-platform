// Import 25 procedure ENEMEK dal sistema qualità ES esistente
// Esegui con: node scripts/import-enemek-procedures.mjs
import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import { basename, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("Manca NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

const QUALITA = "C:/Users/christiancapuano/Desktop/qualita";
const ENEMEK_COMPANY_ID = "f3b8c73d-8b0e-4f59-99b5-0366314f41f3"; // Enemek Engineering Iberica

// process_code → process_id (recuperati via SQL)
const PROC = {
  doc: "3ab61e88-e5ee-4a52-a9b3-9a73cfc0ee40",
  ris: "943ce5be-17e6-4937-b918-d65093ac170b",
  for: "9a025769-629b-4191-b0a9-d89cc62fc409",
  hr: "cc588707-537c-4029-989c-d16e8c16933d",
  com: "13b6d7df-c17a-4bb0-881b-39d026f04a9f",
  can: "ebf259a9-0e33-4188-8004-1b2d52cbebce",
  nc: "518cc35e-4bd7-4ee6-9cfa-3a2a27ffcfcd",
  inf: "9040aef6-4da8-42c6-9e7e-5992af5ebba2",
  amb: "67f6bb8f-6ace-4209-941b-947630d64c40",
  aud: "750740a2-98fc-42a8-b329-2ab6a6b5c9bd",
  eme: "776f1ab5-d32b-476a-8baa-185416d4e760",
  pro: "35cfa09b-a7fa-4550-8123-2563633b67a2",
  inc: "4f55e290-a3f2-4bb8-b6b6-9373f1b8bd78",
  sal: "f9516535-063a-4f0c-9e09-84c466be3286",
};

const PROCEDURES = [
  { code: "P-01", title: "Gestión de la información documentada", revision: "03", process: PROC.doc, file: "1-INFORMACION DOCUMENTADA/P-01_GESTION DE LA INFORMACION DOCUMENTADA 03.pdf" },
  { code: "P-02", title: "Gestión de riesgos y oportunidades", revision: "04", process: PROC.ris, file: "2-GESTION DE RIESGOS Y OPORTUNIDADES/P-02_GESTION DE RIESGOS Y OPORTUNIDADES 04.pdf" },
  { code: "P-03", title: "Productos y servicios suministrados externamente", revision: "04", process: PROC.for, file: "P-03_PRODUCTOS Y SERVICIOS SUMINISTRADOS EXTERNAMENTE 04.pdf" },
  { code: "P-04", title: "Recursos humanos", revision: "03", process: PROC.hr, file: "4-RRHH/P-04_RRHH Rev_03.pdf" },
  { code: "P-05", title: "Relaciones con los clientes", revision: "03", process: PROC.com, file: "5-RELACIONES CON LOS CLIENTES/P-05_RELACIONES CON LOS CLIENTES Rev_03.pdf" },
  { code: "P-06", title: "Planificación y control de obras", revision: "04", process: PROC.can, file: "6-PLANIFICACION Y CONTROL DE OBRAS/P-06_PLANIFICACION Y CONTROL DE OBRAS - Ed.04.pdf" },
  { code: "P-07", title: "Gestión de no conformidades y acciones correctivas", revision: "03", process: PROC.nc, file: "7-GESTION DE NC Y AC/P-07_GESTION DE NC Y AC Rev_03.pdf" },
  { code: "P-08", title: "Infraestructura", revision: "03", process: PROC.inf, file: "8-INFRAESTRUCTURA/P-08_INFRAESTRUCTURA_03.pdf" },
  { code: "P-09", title: "Aspectos ambientales", revision: "04", process: PROC.amb, file: "9-ASPECTOS AMBIENTALES 02/P-09 ASPECTOS AMBIENTALES 04.pdf" },
  { code: "P-10", title: "Auditoría interna", revision: "03", process: PROC.aud, file: "10-AUDITORIA/P-10_AUDITORIA INTERNA R03.pdf" },
  { code: "P-11", title: "Plan de emergencias", revision: "03", process: PROC.eme, file: "11-PLAN DE EMERGENCIAS/P-11 PLAN DE EMERGENCIAS 03.pdf" },
  { code: "P-12", title: "Control operacional", revision: "03", process: PROC.pro, file: "12-CONTROL OPERACIONAL 02/P-12 CONTROL OPERACIONAL 03.pdf" },
  { code: "P-13", title: "Protección contra incendios", revision: "02", process: PROC.eme, file: "13.- PROTECCION CONTRA INCENDIOS/P-13 PCI_Rev_02.pdf" },
  { code: "P-14", title: "Accidentes", revision: "02", process: PROC.inc, file: "14-ACCIDENTES/P-14 ACCIDENTES_Rev_02.pdf" },
  { code: "P-15", title: "Equipos de inspección, medición y ensayo (calibración)", revision: "02", process: PROC.inf, file: "15-PROCEDIMIENTOS OPERATIVOS/P-15 _PROCEDIMIENTO CALIBRACIÓN/P-15_EQUIPOS DE INSPECCIÓN, MEDICION Y ENSAYO_Rev_02.pdf" },
  { code: "P-16", title: "Comprobación resistencia y continuidad", revision: "02", process: PROC.pro, file: "15-PROCEDIMIENTOS OPERATIVOS/P-16_PROCEDIMIENTO COMPROBACIÓN RESISTENCIA Y CONTINUIDAD/P-16_COMPROBACIÓN RESISTENCIA Y CONTINUIDAD Y ANEXOS_Rev_02.pdf" },
  { code: "P-17", title: "Tendido de cables", revision: "03", process: PROC.pro, file: "15-PROCEDIMIENTOS OPERATIVOS/P-17_ PROCEDIMIENTO TENDIDO DE CABLES/P-17_TENDIDO DE CABLES Y ANEXOS Rev_03.pdf" },
  { code: "P-18", title: "Conexionado de cables", revision: "03", process: PROC.pro, file: "15-PROCEDIMIENTOS OPERATIVOS/P-18_PROCEDIMIENTO CONEXIONADO CABLES/P-18_CONEXIONADO CABLES Y ANEXOS Rev_03.pdf" },
  { code: "P-19", title: "Procedimiento hincadora", revision: "01", process: PROC.pro, file: "15-PROCEDIMIENTOS OPERATIVOS/P-19_PROCEDIMIENTO HINCADORA/P-19_PROCEDIMIENTO HINCADO_Ed. 01.pdf" },
  { code: "P-20", title: "Procedimiento cerramiento", revision: "01", process: PROC.pro, file: "15-PROCEDIMIENTOS OPERATIVOS/P-20_PROCEDIMIENTO CERRAMIENTO/P-20_PROCEDIMIENTO CERRAMIENTO Ed. 01.pdf" },
  { code: "P-21", title: "Taller", revision: "01", process: PROC.pro, file: "21- TALLER/P-21 TALLER.pdf" },
  { code: "P-22", title: "Estructuras metálicas (UNE-EN 1090)", revision: "01", process: PROC.sal, file: "22- ESTRUCTURAS METALICAS/P-22 ESTRUCTURAS METÁLICAS_Rev_01.pdf" },
  { code: "P-23", title: "Soldeo por electrodo (proceso 111)", revision: "01", process: PROC.sal, file: "23- SOLDEO POR ELECTRODO/P-23 SOLDEO POR ELECTRODO.pdf" },
  { code: "P-24", title: "Soldeo con hilo (procesos 135/136)", revision: "01", process: PROC.sal, file: "24- SOLDEO CON HILO/P-24 SOLDEO CON HILO.pdf" },
  { code: "P-25", title: "Diseño", revision: "00", process: PROC.pro, file: "25- DISEÑO/P-25 DISEÑO- Ed.00.pdf" },
];

const YEAR = new Date().getFullYear();
const TODAY = new Date().toISOString().slice(0, 10);

async function importOne(proc) {
  const filePath = resolve(QUALITA, proc.file);
  let buf;
  try {
    buf = await readFile(filePath);
  } catch (e) {
    console.error(`  ✗ ${proc.code}: file non trovato (${filePath})`);
    return false;
  }
  const fileName = basename(proc.file);
  const ext = extname(fileName).toLowerCase().slice(1) || "pdf";
  const storagePath = `${ENEMEK_COMPANY_ID}/${YEAR}/procedures/${proc.code}_r${proc.revision}.${ext}`;

  // 1. Upload nel bucket documents (upsert per idempotenza)
  const up = await supabase.storage.from("documents").upload(storagePath, buf, {
    contentType: "application/pdf",
    upsert: true,
  });
  if (up.error) {
    console.error(`  ✗ ${proc.code}: upload fallito - ${up.error.message}`);
    return false;
  }

  // 2. Insert file_attachment
  const { data: fa, error: faErr } = await supabase
    .from("file_attachment")
    .insert({
      company_id: ENEMEK_COMPANY_ID,
      bucket: "documents",
      storage_path: storagePath,
      original_path: proc.file,
      file_name: fileName,
      mime_type: "application/pdf",
      size_bytes: buf.length,
    })
    .select("id")
    .single();
  if (faErr) {
    console.error(`  ✗ ${proc.code}: insert file_attachment - ${faErr.message}`);
    return false;
  }

  // 3. Insert document (upsert by code+company)
  const { data: existingDoc } = await supabase
    .from("document")
    .select("id")
    .eq("code", proc.code)
    .eq("company_id", ENEMEK_COMPANY_ID)
    .maybeSingle();

  let docId = existingDoc?.id;
  if (!docId) {
    const { data: doc, error: docErr } = await supabase
      .from("document")
      .insert({
        company_id: ENEMEK_COMPANY_ID,
        process_id: proc.process,
        code: proc.code,
        title: proc.title,
        type: "procedura",
        status: "attivo",
        review_frequency_months: 24,
        notes: "Importato dal sistema qualità ENEMEK esistente",
      })
      .select("id")
      .single();
    if (docErr) {
      console.error(`  ✗ ${proc.code}: insert document - ${docErr.message}`);
      return false;
    }
    docId = doc.id;
  } else {
    // Marca le revisioni precedenti come non correnti
    await supabase
      .from("document_revision")
      .update({ is_current: false })
      .eq("document_id", docId);
  }

  // 4. Insert document_revision
  const nextReview = new Date();
  nextReview.setMonth(nextReview.getMonth() + 24);
  const { error: revErr } = await supabase.from("document_revision").insert({
    document_id: docId,
    revision: proc.revision,
    issue_date: TODAY,
    next_review_date: nextReview.toISOString().slice(0, 10),
    file_id: fa.id,
    is_current: true,
    notes: "Importazione iniziale da sistema ENEMEK esistente",
  });
  if (revErr) {
    console.error(`  ✗ ${proc.code}: insert revision - ${revErr.message}`);
    return false;
  }

  console.log(`  ✓ ${proc.code} (rev ${proc.revision}) — ${proc.title} (${(buf.length / 1024).toFixed(1)} KB)`);
  return true;
}

console.log(`\n📥 Import 25 procedure ENEMEK → company ${ENEMEK_COMPANY_ID}\n`);
let ok = 0, fail = 0;
for (const proc of PROCEDURES) {
  const success = await importOne(proc);
  if (success) ok++; else fail++;
}
console.log(`\n✅ Completato: ${ok} importate, ${fail} errori`);
