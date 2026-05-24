"use server";
import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";
import { writeAuditLog, logUpdate } from "@/lib/audit/audit-log";
import { createAssignment } from "@/lib/permissions/rbac";

export async function createInterventionAction(assetId: string, formData: FormData) {
  const session = await requireSession();
  if (!session.person) return { error: "Profilo persona mancante" };
  const admin = createServiceRoleClient();

  // Recupera asset per company_id
  const { data: asset } = await admin.from("asset").select("company_id, code, name, status, project_id").eq("id", assetId).maybeSingle();
  if (!asset) return { error: "Asset non trovato" };

  // Genera intervention_code progressivo
  const { count } = await admin
    .from("asset_intervention")
    .select("id", { count: "exact", head: true })
    .eq("asset_id", assetId);
  const interventionCode = `${asset.code}-INT-${String((count ?? 0) + 1).padStart(4, "0")}`;

  const intervention_type = (formData.get("intervention_type") as string) || "manutenzione_ordinaria";
  const category = (formData.get("category") as string) || "ordinario";
  const origin = (formData.get("origin") as string) || "programmato";
  const issue_found = (formData.get("issue_found") as string) || null;
  const diagnosis = (formData.get("diagnosis") as string) || null;
  const work_performed = (formData.get("work_performed") as string) || null;
  const external_company = (formData.get("external_company") as string) || null;
  const technician_name = (formData.get("technician_name") as string) || null;
  const functional_test_result = (formData.get("functional_test_result") as string) || null;
  const asset_usable = formData.get("asset_usable") === "1";
  const next_due_date = (formData.get("next_due_date") as string) || null;
  const next_due_type = (formData.get("next_due_type") as string) || null;
  const next_due_frequency_days = formData.get("next_due_frequency_days") ? Number(formData.get("next_due_frequency_days")) : null;
  const labor_cost = formData.get("labor_cost") ? Number(formData.get("labor_cost")) : 0;
  const parts_cost = formData.get("parts_cost") ? Number(formData.get("parts_cost")) : 0;
  const travel_cost = formData.get("travel_cost") ? Number(formData.get("travel_cost")) : 0;
  const labor_hours = formData.get("labor_hours") ? Number(formData.get("labor_hours")) : null;
  const total_cost = labor_cost + parts_cost + travel_cost;
  const invoice_number = (formData.get("invoice_number") as string) || null;
  const supplier_name = (formData.get("supplier_name") as string) || null;
  const in_warranty = formData.get("in_warranty") === "1";
  const warranty_until = (formData.get("warranty_until") as string) || null;
  const warranty_reference = (formData.get("warranty_reference") as string) || null;
  const status_before = (formData.get("status_before") as string) || asset.status;
  const status_after = (formData.get("status_after") as string) || (asset_usable ? "in_servizio" : "fuori_servizio");
  const notes = (formData.get("notes") as string) || null;

  const { data: created, error } = await admin
    .from("asset_intervention")
    .insert({
      company_id: asset.company_id,
      asset_id: assetId,
      project_id: asset.project_id,
      intervention_code: interventionCode,
      intervention_type, category, origin,
      requested_at: new Date().toISOString(),
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      requested_by: session.person.id,
      performed_by: session.person.id,
      external_company, technician_name,
      issue_found, diagnosis, work_performed,
      functional_test_result,
      status_before, status_after,
      asset_usable, asset_blocked: !asset_usable,
      next_due_date, next_due_type, next_due_frequency_days,
      labor_cost, parts_cost, travel_cost, total_cost, labor_hours,
      invoice_number, supplier_name,
      in_warranty, warranty_until, warranty_reference,
      notes,
      technician_signature_at: new Date().toISOString(),
      technician_signature_by: session.person.id,
      created_by: session.person.id,
      updated_by: session.person.id,
    })
    .select("id")
    .single();
  if (error || !created) return { error: error?.message ?? "Insert fallito" };

  // ===== AUTOMAZIONI =====
  // 1. Aggiorna stato asset
  await admin.from("asset").update({
    status: status_after,
    updated_by: session.person.id,
  }).eq("id", assetId);

  // 2. Se asset non utilizzabile → quality_block
  if (!asset_usable) {
    await admin.from("quality_block").insert({
      company_id: asset.company_id,
      project_id: asset.project_id,
      type: "strumento_non_valido",
      severity: "critical",
      description: `Asset ${asset.code} ${asset.name} BLOCCATO dopo intervento ${interventionCode}. ${notes ?? ""}`,
      action_required: "Verificare cause + rendere idoneo o sostituire",
      status: "aperto",
      opened_at: new Date().toISOString(),
    });
  }

  // 3. Se esito non conforme → NC
  if (functional_test_result === "non_conforme") {
    await admin.from("non_conformity").insert({
      company_id: asset.company_id,
      project_id: asset.project_id,
      severity: "maggiore",
      title: `Esito non conforme intervento ${interventionCode} su ${asset.code}`,
      description: `Test funzionale non conforme. Diagnosi: ${diagnosis ?? "—"}. Lavoro: ${work_performed ?? "—"}`,
      detected_at: new Date().toISOString().slice(0, 10),
      detected_by: session.person.id,
      status: "aperta",
      responsible_id: session.person.id,
    });
  }

  // 4. Se prossima scadenza → task + assignment + (futuro: calendar_event + reminder)
  if (next_due_date) {
    const dueResp = (formData.get("next_due_responsible_id") as string) || session.person.id;
    await createAssignment({
      company_id: asset.company_id,
      project_id: asset.project_id,
      assigned_to_person_id: dueResp,
      entity_type: "asset",
      entity_id: assetId,
      assignment_type: "task",
      priority: "normale",
      due_date: next_due_date,
      notes: `Prossima ${next_due_type ?? "scadenza"} per asset ${asset.code} (intervento precedente ${interventionCode})`,
    });

    // Calendar event (best-effort, schema definito in J6)
    try {
      await admin.from("calendar_event").insert({
        company_id: asset.company_id,
        project_id: asset.project_id,
        event_type: "manutenzione",
        title: `${next_due_type ?? "Manutenzione"} - ${asset.code}`,
        description: `Scadenza intervento per ${asset.name}. Frequenza: ${next_due_frequency_days ?? "—"} gg`,
        scheduled_date: next_due_date,
        responsible_id: dueResp,
        source_type: "asset_intervention",
        source_id: created.id,
        status: "pianificato",
      });
    } catch {}
  }

  // 5. Garanzia → reminder pre-scadenza (best-effort)
  if (in_warranty && warranty_until) {
    try {
      await admin.from("calendar_event").insert({
        company_id: asset.company_id,
        project_id: asset.project_id,
        event_type: "garanzia",
        title: `Scadenza garanzia ${asset.code}`,
        description: `Garanzia ${warranty_reference ?? ""} scade il ${warranty_until}`,
        scheduled_date: warranty_until,
        source_type: "asset_intervention",
        source_id: created.id,
        status: "pianificato",
      });
    } catch {}
  }

  // 6. Costo > 1000€ → notifica responsabile (best-effort)
  if (total_cost > 1000) {
    await admin.from("notification").insert({
      company_id: asset.company_id,
      project_id: asset.project_id,
      source_type: "asset_intervention",
      source_id: created.id,
      severity: "alert",
      title: `Intervento ${interventionCode} costo elevato: €${total_cost.toFixed(2)}`,
      message: `${asset.name} (${asset.code}) — ${work_performed ?? "intervento"}`,
      action_url: `/assets/${assetId}/interventions/${created.id}`,
    });
  }

  // 7. Audit log
  await writeAuditLog({
    entity_type: "asset_intervention",
    entity_id: created.id,
    action: "create",
    company_id: asset.company_id,
    new_values: { intervention_code: interventionCode, intervention_type, category, total_cost, asset_usable, next_due_date },
  });

  revalidatePath(`/assets/${assetId}`);
  revalidatePath(`/assets/${assetId}/interventions`);
  return { ok: true, id: created.id, code: interventionCode };
}
