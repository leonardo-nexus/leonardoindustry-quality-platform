"use server";
import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit/audit-log";
import { recordSupplierPenalty } from "@/lib/quality/supplier-gates";

export async function createMaterialOrderAction(formData: FormData) {
  const session = await requireSession();
  if (!session.person) return { error: "Profilo persona mancante" };
  const admin = createServiceRoleClient();

  const company_id = (formData.get("company_id") as string) || session.person.company_id;
  const project_id = (formData.get("project_id") as string) || null;
  const material_request_id = (formData.get("material_request_id") as string) || null;
  const order_code = (formData.get("order_code") as string)?.trim();
  const supplier_name = (formData.get("supplier_name") as string)?.trim();
  const supplier_email = (formData.get("supplier_email") as string) || null;
  const expected_delivery = (formData.get("expected_delivery") as string) || null;
  const destination_address = (formData.get("destination_address") as string) || null;
  const destination_country = (formData.get("destination_country") as string) || null;
  const destination_site = (formData.get("destination_site") as string) || null;
  const total_value_euro = formData.get("total_value_euro") ? Number(formData.get("total_value_euro")) : null;
  if (!order_code || !supplier_name) return { error: "Codice + fornitore obbligatori" };

  const { data: created, error } = await admin
    .from("material_order")
    .insert({
      company_id, project_id, material_request_id, order_code, supplier_name, supplier_email,
      order_date: new Date().toISOString().slice(0,10),
      expected_delivery, destination_address, destination_country, destination_site, total_value_euro,
      status: "da_inviare",
      created_by: session.person.id,
      updated_by: session.person.id,
    })
    .select("id")
    .single();
  if (error || !created) return { error: error?.message ?? "Insert fallito" };

  // Aggiorna richiesta a "in_ordine"
  if (material_request_id) {
    await admin.from("material_request").update({ status: "in_ordine", updated_by: session.person.id }).eq("id", material_request_id);
  }

  await writeAuditLog({ entity_type: "material_order", entity_id: created.id, action: "create", new_values: { order_code, supplier_name } });
  revalidatePath("/material-orders");
  return { ok: true, id: created.id };
}

/** Crea autorizzazione produzione + firma */
export async function authorizeProductionAction(orderId: string, formData: FormData) {
  const session = await requireSession();
  if (!session.person) return { error: "Profilo persona mancante" };
  const reason = (formData.get("reason") as string)?.trim();
  if (!reason || reason.length < 3) return { error: "Motivo firma obbligatorio" };
  const order_approved = formData.get("order_approved") === "1";
  const tech_sheet_approved = formData.get("tech_sheet_approved") === "1";
  const quantity_approved = formData.get("quantity_approved") === "1";
  if (!order_approved || !tech_sheet_approved || !quantity_approved) {
    return { error: "Tutti i 3 check obbligatori per autorizzare produzione" };
  }
  const admin = createServiceRoleClient();
  const { data: order } = await admin.from("material_order").select("company_id, project_id").eq("id", orderId).maybeSingle();
  if (!order) return { error: "Ordine non trovato" };

  const { data: created, error } = await admin.from("supplier_authorization").insert({
    company_id: order.company_id,
    project_id: order.project_id,
    material_order_id: orderId,
    gate_type: "produzione",
    status: "autorizzata",
    order_approved, tech_sheet_approved, quantity_approved,
    production_signed_at: new Date().toISOString(),
    production_signed_by: session.person.id,
    notes: reason,
    created_by: session.person.id,
  }).select("id").single();
  if (error) return { error: error.message };

  await admin.from("material_order").update({ status: "in_produzione", updated_by: session.person.id }).eq("id", orderId);
  await writeAuditLog({ entity_type: "supplier_authorization", entity_id: created!.id, action: "approve", reason: `Produzione autorizzata: ${reason}` });
  revalidatePath(`/material-orders/${orderId}`);
  return { ok: true };
}

export async function authorizeDeliveryAction(orderId: string, formData: FormData) {
  const session = await requireSession();
  if (!session.person) return { error: "Profilo persona mancante" };
  const reason = (formData.get("reason") as string)?.trim();
  if (!reason || reason.length < 3) return { error: "Motivo firma obbligatorio" };
  const delivery_date_approved = (formData.get("delivery_date_approved") as string) || null;
  const destination_confirmed = formData.get("destination_confirmed") === "1";
  const space_available = formData.get("space_available") === "1";
  const unloading_means_available = formData.get("unloading_means_available") === "1";
  const personnel_assigned = formData.get("personnel_assigned") === "1";
  if (!delivery_date_approved || !destination_confirmed || !space_available || !unloading_means_available) {
    return { error: "Data, destinazione, spazio e mezzi obbligatori" };
  }
  const admin = createServiceRoleClient();
  const { data: order } = await admin.from("material_order").select("company_id, project_id").eq("id", orderId).maybeSingle();
  if (!order) return { error: "Ordine non trovato" };

  const { data: created, error } = await admin.from("supplier_authorization").insert({
    company_id: order.company_id,
    project_id: order.project_id,
    material_order_id: orderId,
    gate_type: "spedizione",
    status: "autorizzata",
    delivery_date_approved, destination_confirmed, space_available, unloading_means_available, personnel_assigned,
    delivery_signed_at: new Date().toISOString(),
    delivery_signed_by: session.person.id,
    notes: reason,
    created_by: session.person.id,
  }).select("id").single();
  if (error) return { error: error.message };

  await admin.from("material_order").update({ status: "in_spedizione", updated_by: session.person.id }).eq("id", orderId);
  await writeAuditLog({ entity_type: "supplier_authorization", entity_id: created!.id, action: "approve", reason: `Consegna autorizzata: ${reason}` });
  revalidatePath(`/material-orders/${orderId}`);
  return { ok: true };
}

export async function createDerogaAction(orderId: string, formData: FormData) {
  const session = await requireSession();
  if (!session.person) return { error: "Profilo persona mancante" };
  const reason = (formData.get("reason") as string)?.trim();
  const risk_accepted = (formData.get("risk_accepted") as string)?.trim();
  const estimated_cost = formData.get("estimated_cost") ? Number(formData.get("estimated_cost")) : null;
  if (!reason || !risk_accepted) return { error: "Motivo + rischio obbligatori" };

  const admin = createServiceRoleClient();
  const { data: order } = await admin.from("material_order").select("company_id, project_id, supplier_name").eq("id", orderId).maybeSingle();
  if (!order) return { error: "Ordine non trovato" };

  const { data: created, error } = await admin.from("supplier_deroga").insert({
    company_id: order.company_id,
    project_id: order.project_id,
    material_order_id: orderId,
    reason, risk_accepted, estimated_cost,
    signed_by_person_id: session.person.id,
    signed_role_code: session.person.role_code,
  }).select("id").single();
  if (error) return { error: error.message };

  await writeAuditLog({ entity_type: "supplier_deroga", entity_id: created!.id, action: "approve", reason: `Deroga firmata: ${reason}` });

  // Penalità fornitore: consegna forzata
  await recordSupplierPenalty({
    company_id: order.company_id,
    supplier_name: order.supplier_name,
    event: "forced_delivery",
    estimated_loss: estimated_cost ?? undefined,
    notes: reason,
  });

  revalidatePath(`/material-orders/${orderId}`);
  return { ok: true };
}

export async function createReceptionFromOrderAction(orderId: string, assignedToPersonId: string, scheduledFor: string | null) {
  const session = await requireSession();
  if (!session.person) return { error: "Profilo persona mancante" };
  const admin = createServiceRoleClient();
  const { data: order } = await admin.from("material_order").select("*").eq("id", orderId).maybeSingle();
  if (!order) return { error: "Ordine non trovato" };

  // Conta ricezioni esistenti per quest'ordine per generare codice
  const { count } = await admin.from("material_reception").select("*", { count: "exact", head: true }).eq("material_order_id", orderId);
  const reception_code = `${order.order_code}-RCV-${(count ?? 0) + 1}`;

  const { data: created, error } = await admin.from("material_reception").insert({
    company_id: order.company_id,
    project_id: order.project_id,
    material_order_id: orderId,
    reception_code,
    assigned_to_person_id: assignedToPersonId,
    scheduled_for: scheduledFor,
    expected_destination: [order.destination_country, order.destination_site].filter(Boolean).join(" / "),
    created_by: session.person.id,
    updated_by: session.person.id,
  }).select("id").single();
  if (error) return { error: error.message };

  // Crea assignment in /my-work dell'operatore
  await admin.from("user_assignment").insert({
    company_id: order.company_id,
    project_id: order.project_id,
    assigned_to_person_id: assignedToPersonId,
    assigned_by_person_id: session.person.id,
    entity_type: "material_reception",
    entity_id: created!.id,
    assignment_type: "reception",
    priority: "alta",
    due_date: scheduledFor ?? new Date().toISOString().slice(0, 10),
    notes: `Ricezione ${reception_code} ordine ${order.order_code}`,
  });

  await writeAuditLog({ entity_type: "material_reception", entity_id: created!.id, action: "create", reason: "Ricezione creata da ordine" });
  revalidatePath(`/material-orders/${orderId}`);
  revalidatePath("/materials/receptions");
  return { ok: true, id: created!.id };
}
