// Scan struttura INSTRUMENTACION INVENTARIO.xlsx per capire colonne
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import XLSX from "xlsx";
import { readdir } from "node:fs/promises";

// Trova il file via readdir per evitare problemi NFC/NFD
const QUALITA = "C:/Users/christiancapuano/Desktop/qualita";
const dir15 = (await readdir(QUALITA)).find((d) => d.startsWith("15-"));
const subDir = (await readdir(resolve(QUALITA, dir15))).find((d) => d.startsWith("P-15"));
const xlsx = (await readdir(resolve(QUALITA, dir15, subDir))).find((f) => f.includes("INSTRUMENTACION") && f.endsWith(".xlsx"));
const filePath = resolve(QUALITA, dir15, subDir, xlsx);
console.log("Reading:", filePath);
const wb = XLSX.read(readFileSync(filePath), { type: "buffer" });

for (const name of wb.SheetNames) {
  const sheet = wb.Sheets[name];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", blankrows: false });
  console.log(`\n=== Foglio: "${name}" (${rows.length} righe) ===`);
  rows.slice(0, 8).forEach((r, i) => {
    const truncated = r.slice(0, 12).map((c) => String(c).slice(0, 30));
    console.log(`R${i}:`, truncated);
  });
  if (rows.length > 8) console.log(`...e altre ${rows.length - 8} righe`);
}
