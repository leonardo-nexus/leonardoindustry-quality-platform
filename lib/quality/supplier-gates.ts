import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit/audit-log";
import type { BlockReason, StartupGateResult } from "@/lib/quality/loss-prevention";

/** Gate produzione: fornitore non autorizzato se manca approvazione ordine/scheda/quantità */
export async function canSupplierProduce(orderId: string): Promise<StartupGateResult> {
  const admin = createServiceRoleClient();
  const { data: auth } = await admin
    .from("supplier_authorization")
    .select("*")
    .eq("material_order_id", orderId)
    .eq("gate_type", "produzione")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const blockers: BlockReason[] = [];
  if (!auth) {
    blockers.push({ code: "no_auth_record", label: "Autorizzazione produzione assente", detail: "FMT-FOR-05 da compilare", severity: "blocco", action_url: `/forms/FMT-FOR-05` });
  } else {
    if (!auth.order_approved) blockers.push({ code: "order_not_approved", label: "Ordine non approvato", detail: "interno acquisti", severity: "blocco", action_url: `/forms/FMT-FOR-05` });
    if (!auth.tech_sheet_approved) blockers.push({ code: "tech_sheet_pending", label: "Scheda tecnica non approvata", detail: "approvazione tecnica richiesta", severity: "blocco", action_url: `/forms/FMT-FOR-05` });
    if (!auth.quantity_approved) blockers.push({ code: "qty_not_approved", label: "Quantità non approvata", detail: "verifica acquisti", severity: "blocco", action_url: `/forms/FMT-FOR-05` });
    if (!auth.production_signed_at) blockers.push({ code: "production_not_signed", label: "Firma produzione mancante", detail: "responsabile commessa", severity: "blocco", action_url: `/forms/FMT-FOR-05` });
  }

  return { is_unlocked: blockers.filter((b) => b.severity === "blocco").length === 0, blockers };
}

/** Gate consegna: fornitore non può consegnare se manca verifica spazio/mezzi/personale */
export async function canSupplierDeliver(orderId: string): Promise<StartupGateResult> {
  const admin = createServiceRoleClient();
  const { data: auth } = await admin
    .from("supplier_authorization")
    .select("*")
    .eq("material_order_id", orderId)
    .eq("gate_type", "spedizione")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const blockers: BlockReason[] = [];
  if (!auth) {
    blockers.push({ code: "no_delivery_auth", label: "Autorizzazione consegna assente", detail: "FMT-FOR-06 da compilare", severity: "blocco", action_url: `/forms/FMT-FOR-06` });
  } else {
    if (!auth.delivery_date_approved) blockers.push({ code: "no_delivery_date", label: "Data consegna non approvata", detail: "concordare data", severity: "blocco", action_url: `/forms/FMT-FOR-06` });
    if (!auth.destination_confirmed) blockers.push({ code: "dest_not_confirmed", label: "Destinazione non confermata", detail: "logistica + responsabile commessa", severity: "blocco", action_url: `/forms/FMT-FOR-06` });
    if (!auth.space_available) blockers.push({ code: "no_space", label: "Spazio scarico non disponibile", detail: "magazzino", severity: "blocco", action_url: `/forms/FMT-FOR-06` });
    if (!auth.unloading_means_available) blockers.push({ code: "no_means", label: "Mezzi scarico non disponibili", detail: "capo cantiere", severity: "blocco", action_url: `/forms/FMT-FOR-06` });
    if (!auth.personnel_assigned) blockers.push({ code: "no_personnel", label: "Personale non assegnato", detail: "capo cantiere", severity: "critico", action_url: `/forms/FMT-FOR-06` });
    if (!auth.delivery_signed_at) blockers.push({ code: "delivery_not_signed", label: "Firma consegna mancante", detail: "responsabile commessa", severity: "blocco", action_url: `/forms/FMT-FOR-06` });
  }
  return { is_unlocked: blockers.filter((b) => b.severity === "blocco").length === 0, blockers };
}

/** Gate ricezione: area + mezzi + personale pronti + rischio stoccaggio valutato */
export async function canReceiveMaterial(orderId: string): Promise<StartupGateResult> {
  const admin = createServiceRoleClient();
  const { data: auth } = await admin
    .from("supplier_authorization")
    .select("*")
    .eq("material_order_id", orderId)
    .eq("gate_type", "ricezione")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const blockers: BlockReason[] = [];
  if (!auth) {
    blockers.push({ code: "no_reception_auth", label: "Piano ricezione assente", detail: "FMT-MAT-10 da compilare", severity: "blocco", action_url: `/forms/FMT-MAT-10` });
  } else {
    if (!auth.area_ready) blockers.push({ code: "area_not_ready", label: "Area non pronta", detail: "preparazione zona scarico", severity: "blocco", action_url: `/forms/FMT-MAT-10` });
    if (!auth.means_ready) blockers.push({ code: "means_not_ready", label: "Mezzi non pronti", detail: "muletto/gru/carrello", severity: "blocco", action_url: `/forms/FMT-MAT-10` });
    if (!auth.personnel_ready) blockers.push({ code: "personnel_not_ready", label: "Personale non pronto", detail: "operatori non assegnati", severity: "critico", action_url: `/forms/FMT-MAT-10` });
    if (!auth.storage_risk_evaluated) blockers.push({ code: "storage_risk", label: "Rischio stoccaggio non valutato", detail: "valutare furto/danni/intemperie", severity: "critico", action_url: `/forms/FMT-MAT-10` });
  }
  return { is_unlocked: blockers.filter((b) => b.severity === "blocco").length === 0, blockers };
}

/** Registra una deroga firmata per ricezione materiale non autorizzato */
export async function createDerogaAction(opts: {
  company_id: string;
  project_id?: string | null;
  material_order_id?: string | null;
  material_reception_id?: string | null;
  reason: string;
  risk_accepted: string;
  estimated_cost?: number | null;
  protection_measures?: string | null;
}) {
  const session = await requireSession();
  if (!session.person) return { error: "Profilo persona mancante" };
  const admin = createServiceRoleClient();

  const { data: created, error } = await admin
    .from("supplier_deroga")
    .insert({
      ...opts,
      signed_by_person_id: session.person.id,
      signed_role_code: session.person.role_code,
    })
    .select("id")
    .single();
  if (error || !created) return { error: error?.message ?? "Insert fallito" };

  await writeAuditLog({
    entity_type: "supplier_deroga",
    entity_id: created.id,
    action: "approve",
    reason: `Deroga firmata: ${opts.reason}`,
  });
  return { ok: true, id: created.id };
}

/** Incrementa contatore evento + penalità su supplier_score */
export async function recordSupplierPenalty(opts: {
  company_id: string;
  supplier_name: string;
  event: "unauthorized_production" | "unauthorized_delivery" | "forced_delivery" | "damage" | "doc_incomplete" | "delay" | "nc_open";
  estimated_loss?: number;
  notes?: string;
}) {
  const admin = createServiceRoleClient();

  // Upsert per supplier_name + company
  const { data: existing } = await admin
    .from("supplier_score")
    .select("*")
    .eq("company_id", opts.company_id)
    .eq("supplier_name", opts.supplier_name)
    .maybeSingle();

  const fieldMap: Record<string, string> = {
    unauthorized_production: "unauthorized_production_count",
    unauthorized_delivery: "unauthorized_delivery_count",
    forced_delivery: "forced_delivery_count",
    damage: "damage_count",
    doc_incomplete: "doc_incomplete_count",
    delay: "delay_count",
    nc_open: "nc_open_count",
  };
  const penaltyMap: Record<string, number> = {
    unauthorized_production: -15,
    unauthorized_delivery: -10,
    forced_delivery: -8,
    damage: -10,
    doc_incomplete: -3,
    delay: -2,
    nc_open: -5,
  };

  const field = fieldMap[opts.event];
  const penalty = penaltyMap[opts.event] ?? -5;

  if (existing) {
    const newScore = Math.max(0, existing.score + penalty);
    await admin.from("supplier_score").update({
      score: newScore,
      [field]: (existing[field] ?? 0) + 1,
      total_estimated_loss: (Number(existing.total_estimated_loss) ?? 0) + (opts.estimated_loss ?? 0),
      last_event_at: new Date().toISOString(),
      notes: opts.notes ?? existing.notes,
    }).eq("id", existing.id);
  } else {
    await admin.from("supplier_score").insert({
      company_id: opts.company_id,
      supplier_name: opts.supplier_name,
      score: Math.max(0, 100 + penalty),
      [field]: 1,
      total_estimated_loss: opts.estimated_loss ?? 0,
      last_event_at: new Date().toISOString(),
      notes: opts.notes ?? null,
    });
  }
}
