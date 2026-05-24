import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";

export interface BlockReason {
  code: string;
  label: string;
  detail: string;
  severity: "critico" | "blocco";
  action_url: string;
}

export interface StartupGateResult {
  is_unlocked: boolean;
  blockers: BlockReason[];
}

/**
 * Verifica se la commessa può essere avviata: contratto, checklist contratto,
 * clausole, piano qualità, responsabile, schede tecniche.
 * Aggiorna project_startup_check.
 */
export async function canStartProject(projectId: string): Promise<StartupGateResult> {
  const admin = createServiceRoleClient();

  // Carica/aggiorna stato
  const { data: contractCount } = await admin
    .from("contract")
    .select("id, status", { count: "exact" })
    .eq("project_id", projectId)
    .neq("status", "archiviato")
    .is("deleted_at", null);

  const contracts = contractCount ?? [];
  const contract_uploaded = contracts.length > 0;
  const contract_verified = contracts.some((c) => ["verificato", "approvato"].includes(c.status));

  // checklist lettura contratto = checklist con code che inizia con FMT-CON-01 e completata
  const clQuery: any = admin
    .from("quality_checklist")
    .select("id, code, status")
    .like("code", "FMT-CON-01%");
  const { data: clContract } = await clQuery;
  const contract_read_checklist_done = (clContract ?? []).some((c: any) => c.status === "completata");

  // clausole critiche tutte chiarite/accettate
  const { data: openClauses } = await admin
    .from("contract_clause")
    .select("id, status, severity")
    .eq("project_id", projectId)
    .in("severity", ["urgente", "critico", "blocco"])
    .in("status", ["da_chiarire", "non_accettata"])
    .is("deleted_at", null);
  const critical_clauses_reviewed = (openClauses ?? []).length === 0;

  const { data: techSheets } = await admin
    .from("technical_sheet")
    .select("id")
    .eq("project_id", projectId)
    .is("deleted_at", null);
  const technical_sheets_uploaded = (techSheets ?? []).length > 0;

  const { data: qPlan } = await admin
    .from("quality_plan")
    .select("id")
    .eq("project_id", projectId)
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();
  const quality_plan_generated = !!qPlan;

  const { data: proj } = await admin.from("project").select("quality_responsible_id, applicable_standards").eq("id", projectId).maybeSingle();
  const quality_responsible_assigned = !!(proj as any)?.quality_responsible_id;
  const applicable_norms_selected = Array.isArray((proj as any)?.applicable_standards) && (proj as any).applicable_standards.length > 0;

  // ===== GATE FORNITORI =====
  const { data: orders } = await admin
    .from("material_order")
    .select("id, supplier_name, status, deleted_at")
    .eq("project_id", projectId)
    .is("deleted_at", null)
    .neq("status", "annullato");

  const { data: derogas } = await admin
    .from("supplier_deroga")
    .select("id, reason")
    .eq("project_id", projectId)
    .gte("signed_at", new Date(Date.now() - 90 * 86400_000).toISOString());

  const { data: scoresLow } = await admin
    .from("supplier_score")
    .select("supplier_name, score, level")
    .in("supplier_name", (orders ?? []).map((o: any) => o.supplier_name).filter(Boolean))
    .in("level", ["critico", "inaffidabile"]);

  // Per ogni ordine: verifica autorizzazioni produzione + consegna
  const orderBlockers: BlockReason[] = [];
  for (const o of orders ?? []) {
    const { data: prodAuth } = await admin
      .from("supplier_authorization")
      .select("status, production_signed_at")
      .eq("material_order_id", o.id)
      .eq("gate_type", "produzione")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (o.status === "in_produzione" && (!prodAuth || prodAuth.status !== "autorizzata" || !prodAuth.production_signed_at)) {
      orderBlockers.push({
        code: `prod_unauth_${o.id}`,
        label: `Produzione fornitore ${o.supplier_name} NON autorizzata`,
        detail: "ordine in produzione senza firma interna",
        severity: "critico",
        action_url: `/material-orders/${o.id}`,
      });
    }
    const { data: delAuth } = await admin
      .from("supplier_authorization")
      .select("status, delivery_signed_at")
      .eq("material_order_id", o.id)
      .eq("gate_type", "spedizione")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (o.status === "in_spedizione" && (!delAuth || delAuth.status !== "autorizzata" || !delAuth.delivery_signed_at)) {
      orderBlockers.push({
        code: `del_unauth_${o.id}`,
        label: `Consegna fornitore ${o.supplier_name} NON autorizzata`,
        detail: "manca verifica spazio/mezzi/personale",
        severity: "blocco",
        action_url: `/material-orders/${o.id}`,
      });
    }
  }

  const row = {
    project_id: projectId,
    contract_uploaded,
    contract_verified,
    contract_read_checklist_done,
    critical_clauses_reviewed,
    client_requirements_extracted: contract_verified, // best-effort
    technical_sheets_uploaded,
    quality_plan_generated,
    applicable_norms_selected,
    quality_responsible_assigned,
    suppliers_verified: orderBlockers.length === 0 && (scoresLow?.length ?? 0) === 0,
    last_check_at: new Date().toISOString(),
  };

  // Upsert
  await admin.from("project_startup_check").upsert(row, { onConflict: "project_id" });

  const blockers: BlockReason[] = [];
  if (!contract_uploaded) blockers.push({ code: "no_contract", label: "Contratto non caricato", detail: "obbligatorio per avvio commessa", severity: "blocco", action_url: `/projects/${projectId}/contracts` });
  if (!contract_verified) blockers.push({ code: "contract_not_verified", label: "Contratto non verificato", detail: "responsabile qualità deve confermare", severity: "blocco", action_url: `/projects/${projectId}/contracts` });
  if (!contract_read_checklist_done) blockers.push({ code: "no_contract_checklist", label: "Checklist FMT-CON-01 incompleta", detail: "lettura contratto non confermata", severity: "blocco", action_url: `/projects/${projectId}/contracts` });
  if (!critical_clauses_reviewed) blockers.push({ code: "open_critical_clauses", label: "Clausole critiche aperte", detail: `${(openClauses ?? []).length} da chiarire/accettare`, severity: "blocco", action_url: `/projects/${projectId}/contracts` });
  if (!quality_plan_generated) blockers.push({ code: "no_quality_plan", label: "Piano qualità non generato", detail: "selezionare template e generare", severity: "blocco", action_url: `/projects/${projectId}/quality-plan` });
  if (!quality_responsible_assigned) blockers.push({ code: "no_responsible", label: "Responsabile qualità non assegnato", detail: "assegnare in anagrafica commessa", severity: "critico", action_url: `/projects/${projectId}` });
  if (!technical_sheets_uploaded) blockers.push({ code: "no_tech_sheets", label: "Schede tecniche non caricate", detail: "almeno una scheda materiale richiesta", severity: "critico", action_url: `/projects/${projectId}/technical-sheets` });

  // Aggiunge i blockers fornitore
  for (const ob of orderBlockers) blockers.push(ob);
  for (const s of scoresLow ?? []) {
    blockers.push({
      code: `low_supplier_${s.supplier_name}`,
      label: `Fornitore critico: ${s.supplier_name}`,
      detail: `score ${s.score}/100 livello ${s.level}`,
      severity: "critico",
      action_url: `/suppliers`,
    });
  }
  for (const d of derogas ?? []) {
    blockers.push({
      code: `deroga_${d.id}`,
      label: `Deroga fornitore aperta (90gg)`,
      detail: d.reason?.slice(0, 80) ?? "—",
      severity: "critico",
      action_url: `/suppliers`,
    });
  }

  return {
    is_unlocked: blockers.filter((b) => b.severity === "blocco").length === 0,
    blockers,
  };
}

export interface MaterialGateResult {
  is_usable: boolean;
  blockers: BlockReason[];
}

/**
 * Verifica se un lotto materiale può essere utilizzato: certificato, scheda tecnica,
 * lotto noto, foto live, approvazione.
 */
export async function canUseMaterial(lotId: string): Promise<MaterialGateResult> {
  const admin = createServiceRoleClient();
  const { data: lot } = await admin
    .from("material_lot")
    .select("*, sheet:technical_sheet_id(id, status, approved_at, expiry_date)")
    .eq("id", lotId)
    .maybeSingle();

  if (!lot) return { is_usable: false, blockers: [{ code: "no_lot", label: "Lotto non trovato", detail: "", severity: "blocco", action_url: "/quality-sentinel" }] };

  const blockers: BlockReason[] = [];
  if (!lot.certificate_file_id) blockers.push({ code: "no_certificate", label: "Certificato mancante", detail: "lotto non utilizzabile", severity: "blocco", action_url: `/materials/${lotId}` });
  if (!lot.technical_sheet_id) blockers.push({ code: "no_techsheet", label: "Scheda tecnica non collegata", detail: "associare scheda approvata", severity: "blocco", action_url: `/materials/${lotId}` });
  if (lot.technical_sheet_id && (lot as any).sheet?.status !== "approvata") blockers.push({ code: "techsheet_not_approved", label: "Scheda tecnica non approvata", detail: `stato attuale: ${(lot as any).sheet?.status ?? "?"}`, severity: "blocco", action_url: `/technical-sheets/${lot.technical_sheet_id}` });
  if (!lot.live_photo_id) blockers.push({ code: "no_live_photo", label: "Foto live materiale mancante", detail: "richiesta verifica visiva in cantiere", severity: "critico", action_url: `/materials/${lotId}` });
  if (!lot.lot_code) blockers.push({ code: "no_lot_code", label: "Codice lotto/colata mancante", detail: "tracciabilità non garantita", severity: "blocco", action_url: `/materials/${lotId}` });

  return {
    is_usable: blockers.filter((b) => b.severity === "blocco").length === 0,
    blockers,
  };
}

/**
 * Mappa blockers in items da banner.
 */
export function blockersToBannerItems(blockers: BlockReason[]) {
  return blockers.map((b) => ({
    label: b.label,
    detail: b.detail,
    action_url: b.action_url,
    severity: b.severity,
  }));
}
