import { createServiceRoleClient } from "@/lib/supabase/server";

type AdminClient = ReturnType<typeof createServiceRoleClient>;

export type MasterDataPayload = {
  action: string;
  global_id: string;
  erp_supplier_id?: string | null;
  erp_customer_id?: string | null;
  entity_type?: "supplier" | "customer" | "supplier_qualification" | null;
  company_id?: string | null;
  fields?: Record<string, unknown> | null;
};

const SUPPLIER_PROTECTED_FIELDS = [
  "score",
  "qualification_status",
  "blocked_for_orders",
  "block_reasons",
  "score_breakdown",
  "valid_until",
  "approved_by",
  "approved_at",
];

const CUSTOMER_QUALITY_PROTECTED_FIELDS = [
  "score",
  "customer_score",
  "risk_level",
  "relationship_status",
  "strategic_notes",
  "reviews",
  "warnings",
  "average_margin",
  "operational_stress",
];

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function inferEntity(payload: MasterDataPayload): "supplier" | "customer" {
  if (payload.entity_type === "customer" || payload.action.startsWith("customer.")) return "customer";
  return "supplier";
}

async function ensureMapping(admin: AdminClient, opts: {
  entityType: string;
  globalId: string;
  erpId?: string | null;
  qualityId?: string | null;
}) {
  const { data: existing } = await admin
    .from("integration_mapping")
    .select("id, quality_id, erp_id")
    .eq("entity_type", opts.entityType)
    .eq("global_id", opts.globalId)
    .limit(1)
    .maybeSingle();

  if (existing) {
    await admin
      .from("integration_mapping")
      .update({
        erp_id: opts.erpId ?? existing.erp_id ?? null,
        quality_id: opts.qualityId ?? existing.quality_id ?? null,
        source_app: "erp",
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    return;
  }

  await admin.from("integration_mapping").insert({
    entity_type: opts.entityType,
    global_id: opts.globalId,
    erp_id: opts.erpId ?? null,
    quality_id: opts.qualityId ?? null,
    source_app: "erp",
  });
}

async function recordConflict(admin: AdminClient, opts: {
  entityType: string;
  entityId?: string | null;
  globalId: string;
  field: string;
  qualityValue: unknown;
  erpValue: unknown;
}) {
  await admin.from("sync_conflict").insert({
    entity_type: opts.entityType,
    entity_id: opts.entityId ?? null,
    global_id: opts.globalId,
    field_name: opts.field,
    quality_value: opts.qualityValue,
    erp_value: opts.erpValue,
  });
}

export async function syncSupplierFromErp(admin: AdminClient, payload: MasterDataPayload) {
  const fields = payload.fields ?? {};
  const erpSupplierId = payload.erp_supplier_id ?? text(fields.erp_supplier_id);
  const { data: qual } = await admin
    .from("supplier_qualification")
    .select("*")
    .or(`global_id.eq.${payload.global_id},erp_supplier_id.eq.${erpSupplierId ?? "__none__"}`)
    .limit(1)
    .maybeSingle();

  if (!qual) {
    const { data: created } = await admin
      .from("supplier_qualification")
      .insert({
        company_id: payload.company_id ?? null,
        supplier_name: text(fields.legal_name) ?? text(fields.supplier_name) ?? text(fields.name) ?? "ERP Import",
        legal_name: text(fields.legal_name) ?? text(fields.supplier_name) ?? text(fields.name) ?? "Imported from ERP",
        tax_id: text(fields.tax_id),
        email: text(fields.email),
        phone: text(fields.phone),
        address: text(fields.address),
        country: text(fields.country),
        global_id: payload.global_id,
        erp_supplier_id: erpSupplierId,
        source_app: "erp",
        sync_status: "synced",
        last_synced_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    await ensureMapping(admin, {
      entityType: "supplier_qualification",
      globalId: payload.global_id,
      erpId: erpSupplierId,
      qualityId: created?.id,
    });

    return { entity: "supplier", created: true, quality_id: created?.id, fields_updated: [] as string[], conflicts: [] as string[] };
  }

  const conflicts: string[] = [];
  const safeUpdates: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (SUPPLIER_PROTECTED_FIELDS.includes(key)) {
      if (JSON.stringify(qual[key]) !== JSON.stringify(value)) {
        conflicts.push(key);
        await recordConflict(admin, {
          entityType: "supplier_qualification",
          entityId: qual.id,
          globalId: payload.global_id,
          field: key,
          qualityValue: qual[key],
          erpValue: value,
        });
      }
    } else {
      safeUpdates[key] = value;
    }
  }

  if (Object.keys(safeUpdates).length > 0) {
    safeUpdates.last_synced_at = new Date().toISOString();
    safeUpdates.sync_status = "synced";
    await admin.from("supplier_qualification").update(safeUpdates).eq("id", qual.id);
  }

  await ensureMapping(admin, {
    entityType: "supplier_qualification",
    globalId: payload.global_id,
    erpId: erpSupplierId ?? qual.erp_supplier_id ?? null,
    qualityId: qual.id,
  });

  return { entity: "supplier", created: false, quality_id: qual.id, fields_updated: Object.keys(safeUpdates), conflicts };
}

export async function syncCustomerFromErp(admin: AdminClient, payload: MasterDataPayload) {
  const fields = payload.fields ?? {};
  const erpCustomerId = payload.erp_customer_id ?? text(fields.erp_customer_id);
  const customerName = text(fields.legal_name) ?? text(fields.customer_name) ?? text(fields.name);
  const previousName = text(fields.previous_name) ?? text(fields.old_name) ?? text(fields.previous_customer_name);
  const conflicts: string[] = [];

  for (const key of CUSTOMER_QUALITY_PROTECTED_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(fields, key)) {
      conflicts.push(key);
      await recordConflict(admin, {
        entityType: "customer",
        globalId: payload.global_id,
        field: key,
        qualityValue: "quality_owned",
        erpValue: fields[key],
      });
    }
  }

  await ensureMapping(admin, {
    entityType: "customer",
    globalId: payload.global_id,
    erpId: erpCustomerId,
    qualityId: null,
  });

  const updatedRecords = { projects: 0, contracts: 0 };
  if (customerName && previousName && customerName !== previousName) {
    const { data: projects } = await admin
      .from("project")
      .update({ customer_name: customerName, updated_at: new Date().toISOString() })
      .eq("customer_name", previousName)
      .select("id");
    updatedRecords.projects = projects?.length ?? 0;

    const { data: contracts } = await admin
      .from("contract")
      .update({ client_name: customerName, updated_at: new Date().toISOString() })
      .eq("client_name", previousName)
      .select("id");
    updatedRecords.contracts = contracts?.length ?? 0;
  }

  return {
    entity: "customer",
    created: false,
    quality_id: null,
    fields_updated: customerName && previousName ? ["customer_name", "client_name"] : [],
    updated_records: updatedRecords,
    conflicts,
    note: previousName
      ? "Cliente ERP sincronizzato su commesse/contratti esistenti per nome precedente."
      : "Cliente ERP registrato nel mapping. Per aggiornare commesse esistenti inviare previous_name.",
  };
}

export async function syncMasterDataFromErp(admin: AdminClient, payload: MasterDataPayload) {
  if (inferEntity(payload) === "customer") return syncCustomerFromErp(admin, payload);
  return syncSupplierFromErp(admin, payload);
}
