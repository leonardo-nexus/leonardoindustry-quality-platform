// Seed form_template (catalogo 60 FMT) + procedure_format_link (P-XX → FMT-XXX)
// dai 2 CSV in docs/
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

// CSV parser semplice (separatore ;)
function parseCSV(content) {
  const lines = content.trim().split(/\r?\n/);
  const headers = lines[0].split(";").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = line.split(";").map((c) => c.trim());
    const obj = {};
    headers.forEach((h, i) => (obj[h] = cells[i] ?? ""));
    return obj;
  });
}

// Mappa nome processo dal CSV → process.code
const PROCESS_BY_NAME = {
  "Documentazione": "PROC-DOC-01",
  "Rischi e opportunita": "PROC-RIS-01",
  "Clienti e contratti": "PROC-COM-01",
  "Fornitori e subappalti": "PROC-FOR-01",
  "Risorse umane e formazione": "PROC-HR-01",
  "Commesse e cantieri": "PROC-CAN-01",
  "Infrastrutture e strumenti": "PROC-INF-01",
  "Audit": "PROC-AUD-01",
  "Non conformita e azioni": "PROC-NC-01",
  "Ambiente e consumi": "PROC-AMB-01",
  "Emergenze e antincendio": "PROC-EME-01",
  "Sicurezza e salute sul lavoro": "PROC-SIC-01",
  "Incidenti e quasi incidenti": "PROC-INC-01",
  "UNE-EN 1090 e saldatura": "PROC-SAL-01",
  "Produzione e controllo operativo": "PROC-PRO-01",
};

// Schema generico minimo per ogni format
function defaultSchema(category) {
  const baseFields = [
    { key: "data_compilazione", label: "Data compilazione", type: "date", required: true },
    { key: "descrizione", label: "Descrizione / note operative", type: "textarea", required: true },
  ];
  const byCategory = {
    saldatura: [
      { key: "commessa", label: "Commessa", type: "text" },
      { key: "esito", label: "Esito controllo", type: "select", options: ["conforme", "non_conforme", "limitato"], required: true },
    ],
    nc: [
      { key: "gravita", label: "Gravità", type: "select", options: ["minore", "maggiore", "critica"], required: true },
      { key: "causa", label: "Causa probabile", type: "textarea" },
    ],
    audit: [
      { key: "norma", label: "Norma di riferimento", type: "text" },
      { key: "esito_audit", label: "Esito", type: "select", options: ["conforme", "osservazione", "raccomandazione", "nc_minore", "nc_maggiore"], required: true },
    ],
    asset: [
      { key: "codice_asset", label: "Codice asset", type: "text", required: true },
      { key: "esito_verifica", label: "Esito", type: "select", options: ["conforme", "non_conforme", "limitato"], required: true },
      { key: "prossima_scadenza", label: "Prossima scadenza", type: "date" },
    ],
    ambiente: [
      { key: "periodo", label: "Periodo riferimento", type: "text" },
      { key: "valore", label: "Valore / quantità", type: "number" },
      { key: "unita", label: "Unità di misura", type: "text" },
    ],
    sicurezza: [
      { key: "luogo", label: "Luogo / sede", type: "text" },
      { key: "esito_sicurezza", label: "Esito", type: "select", options: ["ok", "criticita", "non_conformita"], required: true },
    ],
    incidenti: [
      { key: "tipo_evento", label: "Tipo", type: "select", options: ["incidente", "quasi_incidente", "infortunio"], required: true },
      { key: "luogo", label: "Luogo", type: "text", required: true },
      { key: "lesioni", label: "Lesioni / danni", type: "textarea" },
    ],
    commesse: [
      { key: "commessa", label: "Commessa", type: "text", required: true },
      { key: "fase", label: "Fase commessa", type: "select", options: ["apertura", "in_corso", "chiusura"] },
    ],
    fornitori: [
      { key: "fornitore", label: "Fornitore", type: "text", required: true },
      { key: "esito_qualifica", label: "Esito qualifica", type: "select", options: ["qualificato", "sospeso", "non_qualificato"], required: true },
    ],
    hr: [
      { key: "persona", label: "Persona", type: "text", required: true },
      { key: "competenza", label: "Competenza", type: "text" },
      { key: "scadenza", label: "Scadenza", type: "date" },
    ],
    clienti: [
      { key: "cliente", label: "Cliente", type: "text", required: true },
      { key: "valutazione", label: "Valutazione (1-10)", type: "number" },
    ],
    documentazione: [
      { key: "codice_documento", label: "Codice documento", type: "text" },
      { key: "revisione", label: "Revisione", type: "text" },
    ],
    rischi: [
      { key: "area", label: "Area / processo", type: "text", required: true },
      { key: "probabilita", label: "Probabilità (1-5)", type: "number" },
      { key: "gravita", label: "Gravità (1-5)", type: "number" },
    ],
  };
  const extra = byCategory[category] ?? [];
  return {
    fields: [...baseFields, ...extra,
      { key: "responsabile", label: "Responsabile (testo libero)", type: "text" },
      { key: "allegato_url", label: "Allegato (URL)", type: "text" },
    ],
  };
}

// Mappa frequenza CSV → enum DB
const FREQ_MAP = {
  "continuo": "continuo", "annuale": "annuale", "mensile": "mensile",
  "periodica": "periodica", "evento": "evento", "commessa": "commessa",
  "fine_commessa": "fine_commessa", "audit": "audit", "saldatura": "saldatura",
};

// === LEGGI CSV ===
const catCSV = parseCSV(readFileSync("docs/catalogo_format_compilabili_qualita.csv", "utf-8"));
const mapCSV = parseCSV(readFileSync("docs/mappa_procedure_format_processi.csv", "utf-8"));

console.log(`📥 Seed ${catCSV.length} form_template + mapping per ${mapCSV.length} procedure\n`);

// === Pre-carica process_id ===
const { data: processes } = await supabase.from("process").select("id, code");
const PROC_ID = Object.fromEntries(processes.map((p) => [p.code, p.id]));

// === Pre-carica document_id per procedure P-XX (impresa Enemek Iberica) ===
const ENEMEK = "f3b8c73d-8b0e-4f59-99b5-0366314f41f3";
const { data: docs } = await supabase
  .from("document")
  .select("id, code")
  .eq("company_id", ENEMEK)
  .eq("type", "procedura");
const DOC_ID = Object.fromEntries(docs.map((d) => [d.code, d.id]));

// === STEP 1: insert form_template ===
let okFmt = 0;
for (const row of catCSV) {
  const processCode = PROCESS_BY_NAME[row.processo];
  if (!processCode) {
    console.warn(`  ⚠ ${row.codice}: processo non mappato "${row.processo}"`);
  }
  const processId = processCode ? PROC_ID[processCode] : null;

  // upsert by code
  const { data: existing } = await supabase
    .from("form_template").select("id").eq("code", row.codice).maybeSingle();

  const payload = {
    code: row.codice,
    title: row.titolo,
    category: row.categoria,
    process_id: processId,
    procedure_code_hint: row.procedura_collegata,
    genera_task: row.genera_task === "si",
    genera_nc: row.genera_nc === "si",
    blocco_operativo: row.blocco_operativo === "si",
    frequenza: FREQ_MAP[row.frequenza_suggerita] ?? "evento",
    schema: defaultSchema(row.categoria),
  };

  if (existing) {
    await supabase.from("form_template").update(payload).eq("id", existing.id);
  } else {
    const { error } = await supabase.from("form_template").insert(payload);
    if (error) {
      console.error(`  ✗ ${row.codice}: ${error.message}`);
      continue;
    }
  }
  okFmt++;
}
console.log(`  ✓ ${okFmt} form_template inseriti/aggiornati`);

// === STEP 2: procedure_format_link ===
// Per ogni riga della mappa, link tra document(P-XX) e form_template(FMT-XXX)
const { data: allTemplates } = await supabase.from("form_template").select("id, code");
const TMPL_ID = Object.fromEntries(allTemplates.map((t) => [t.code, t.id]));

let okLink = 0;
for (const row of mapCSV) {
  const docId = DOC_ID[row.procedura];
  if (!docId) {
    console.warn(`  ⚠ ${row.procedura}: documento non trovato per Enemek Iberica`);
    continue;
  }
  const codes = (row.format_collegati || "").split(",").map((c) => c.trim()).filter(Boolean);
  let ord = 0;
  for (const code of codes) {
    const tmplId = TMPL_ID[code];
    if (!tmplId) {
      console.warn(`    ⚠ ${row.procedura}: template ${code} non trovato`);
      continue;
    }
    const { error } = await supabase
      .from("procedure_format_link")
      .upsert({ document_id: docId, form_template_id: tmplId, ordering: ord++ }, { onConflict: "document_id,form_template_id" });
    if (!error) okLink++;
  }
}
console.log(`  ✓ ${okLink} procedure_format_link creati`);

// === STEP 3: process_instruction (istruzioni operative iniziali per ogni processo) ===
const INSTRUCTIONS = mapCSV.map((row) => {
  const processCode = (() => {
    // procedure P-01 → Documentazione, P-02 → Rischi etc, derivato dal mapping del CSV
    // ma row.processo (testo libero italiano)
    return PROCESS_BY_NAME[row.processo];
  })();
  const processId = processCode ? PROC_ID[processCode] : null;
  if (!processId) return null;
  return {
    process_id: processId,
    title: `${row.procedura} — ${row.titolo}`,
    when_text: row.automazione_principale,
    who_text: "Responsabile di processo / responsabili delegati",
    what_text: `Applicare la procedura ${row.procedura}: ${row.titolo}. Riferimento normativo: ${row.norme_collegate}.`,
    forms_codes: (row.format_collegati || "").split(",").map((c) => c.trim()).filter(Boolean),
    procedure_code_ref: row.procedura,
    alarms_generated: row.automazione_principale,
    operational_blocks: null,
    ordering: 0,
  };
}).filter(Boolean);

let okIns = 0;
for (const ins of INSTRUCTIONS) {
  // dedupe per process_id+procedure_code_ref
  const { data: ex } = await supabase
    .from("process_instruction")
    .select("id")
    .eq("process_id", ins.process_id)
    .eq("procedure_code_ref", ins.procedure_code_ref)
    .maybeSingle();
  if (ex) {
    await supabase.from("process_instruction").update(ins).eq("id", ex.id);
  } else {
    const { error } = await supabase.from("process_instruction").insert(ins);
    if (error) { console.error(`  ✗ instr ${ins.procedure_code_ref}: ${error.message}`); continue; }
  }
  okIns++;
}
console.log(`  ✓ ${okIns} process_instruction inserite/aggiornate`);

// === STEP 4: arricchisci process con operational_data (input/output/automazioni) ===
const opData = {};
for (const row of mapCSV) {
  const code = PROCESS_BY_NAME[row.processo];
  if (!code) continue;
  if (!opData[code]) opData[code] = { procedures: [], norms_set: new Set(), automations_set: new Set(), forms_set: new Set() };
  opData[code].procedures.push(row.procedura);
  (row.norme_collegate || "").split("/").map((s) => s.trim()).filter(Boolean).forEach((n) => opData[code].norms_set.add(n));
  if (row.automazione_principale) opData[code].automations_set.add(row.automazione_principale);
  (row.format_collegati || "").split(",").map((c) => c.trim()).filter(Boolean).forEach((f) => opData[code].forms_set.add(f));
}

let okProc = 0;
for (const [code, data] of Object.entries(opData)) {
  const id = PROC_ID[code];
  if (!id) continue;
  const payload = {
    procedures: data.procedures,
    norms: [...data.norms_set],
    automations: [...data.automations_set],
    forms: [...data.forms_set],
  };
  await supabase.from("process").update({ operational_data: payload }).eq("id", id);
  okProc++;
}
console.log(`  ✓ ${okProc} process arricchiti con operational_data`);

console.log("\n✅ Seed format completato");
