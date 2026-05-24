// Retry per P-22 e P-25 — usa readdir per evitare problemi NFC/NFD su accenti
import { createClient } from "@supabase/supabase-js";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const QUALITA = "C:/Users/christiancapuano/Desktop/qualita";
const COMPANY = "f3b8c73d-8b0e-4f59-99b5-0366314f41f3";
const SAL = "f9516535-063a-4f0c-9e09-84c466be3286";
const PRO = "35cfa09b-a7fa-4550-8123-2563633b67a2";

const RETRIES = [
  { code: "P-22", title: "Estructuras metálicas (UNE-EN 1090)", revision: "01", process: SAL, folder: "22- ESTRUCTURAS METALICAS", pattern: /^P-22 .*\.pdf$/i },
  { code: "P-25", title: "Diseño", revision: "00", process: PRO, folder: "25- DISEÑO", pattern: /^P-25 .*\.pdf$/i },
];

const TODAY = new Date().toISOString().slice(0, 10);

async function findFile(folder, pattern) {
  // Prova diverse normalizzazioni della cartella
  const variants = [folder, folder.normalize("NFC"), folder.normalize("NFD")];
  for (const v of variants) {
    try {
      const fullDir = resolve(QUALITA, v);
      const entries = await readdir(fullDir);
      const match = entries.find((e) => pattern.test(e));
      if (match) return { dir: v, name: match };
    } catch (e) { /* try next */ }
  }
  // Ultimo tentativo: list root e match per prefisso
  try {
    const all = await readdir(QUALITA);
    const folderMatch = all.find((f) => f.startsWith(folder.split(" ")[0]));
    if (folderMatch) {
      const entries = await readdir(resolve(QUALITA, folderMatch));
      const fileMatch = entries.find((e) => pattern.test(e));
      if (fileMatch) return { dir: folderMatch, name: fileMatch };
    }
  } catch (e) {}
  return null;
}

for (const proc of RETRIES) {
  const found = await findFile(proc.folder, proc.pattern);
  if (!found) {
    console.error(`✗ ${proc.code}: file non trovato in nessuna variante`);
    continue;
  }
  const filePath = resolve(QUALITA, found.dir, found.name);
  const buf = await readFile(filePath);
  const storagePath = `${COMPANY}/2026/procedures/${proc.code}_r${proc.revision}.pdf`;

  const up = await supabase.storage.from("documents").upload(storagePath, buf, {
    contentType: "application/pdf", upsert: true,
  });
  if (up.error) { console.error(`✗ ${proc.code}: upload - ${up.error.message}`); continue; }

  const { data: fa } = await supabase.from("file_attachment").insert({
    company_id: COMPANY, bucket: "documents", storage_path: storagePath,
    original_path: `${found.dir}/${found.name}`, file_name: found.name,
    mime_type: "application/pdf", size_bytes: buf.length,
  }).select("id").single();

  const { data: existingDoc } = await supabase.from("document")
    .select("id").eq("code", proc.code).eq("company_id", COMPANY).maybeSingle();
  let docId = existingDoc?.id;
  if (!docId) {
    const { data: doc } = await supabase.from("document").insert({
      company_id: COMPANY, process_id: proc.process, code: proc.code, title: proc.title,
      type: "procedura", status: "attivo", review_frequency_months: 24,
      notes: "Importato dal sistema qualità ENEMEK esistente",
    }).select("id").single();
    docId = doc.id;
  } else {
    await supabase.from("document_revision").update({ is_current: false }).eq("document_id", docId);
  }

  const nextReview = new Date(); nextReview.setMonth(nextReview.getMonth() + 24);
  await supabase.from("document_revision").insert({
    document_id: docId, revision: proc.revision, issue_date: TODAY,
    next_review_date: nextReview.toISOString().slice(0, 10),
    file_id: fa.id, is_current: true,
    notes: "Importazione iniziale da sistema ENEMEK esistente",
  });
  console.log(`✓ ${proc.code} (rev ${proc.revision}) — ${proc.title} (${(buf.length / 1024).toFixed(1)} KB)`);
}
