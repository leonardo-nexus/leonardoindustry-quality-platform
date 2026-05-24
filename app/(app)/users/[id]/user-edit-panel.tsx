"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Edit3, Save, X, Loader2, ToggleLeft, ToggleRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { updateUserAction, toggleUserActiveAction } from "../actions";

export function UserEditPanel({ person, companies, roles }: { person: any; companies: any[]; roles: any[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [roleCode, setRoleCode] = useState(person.role?.code ?? "");
  const [companyId, setCompanyId] = useState(person.company_id ?? "");
  const [locale, setLocale] = useState(person.locale ?? "it");
  const [active, setActive] = useState(!!person.active);

  function save() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("role_code", roleCode);
      fd.set("company_id", companyId);
      fd.set("locale", locale);
      fd.set("active", active ? "1" : "0");
      const r = await updateUserAction(person.id, fd);
      if (r?.error) toast.error(r.error);
      else { toast.success("Utente aggiornato e tracciato in audit"); setEditing(false); router.refresh(); }
    });
  }

  function toggleActive() {
    startTransition(async () => {
      const r = await toggleUserActiveAction(person.id, !active);
      if (r?.error) toast.error(r.error);
      else { toast.success(!active ? "Utente riattivato" : "Utente disattivato"); setActive(!active); router.refresh(); }
    });
  }

  return (
    <div className="space-y-3 text-sm">
      <div className="flex items-center gap-2">
        {!editing ? (
          <>
            <Button size="sm" variant="outline" onClick={() => setEditing(true)} disabled={pending}>
              <Edit3 className="mr-1 h-3 w-3" /> Modifica
            </Button>
            <Button size="sm" variant="ghost" onClick={toggleActive} disabled={pending}>
              {active ? <ToggleRight className="mr-1 h-3 w-3 text-status-green" /> : <ToggleLeft className="mr-1 h-3 w-3 text-leo-muted" />}
              {active ? "Disattiva" : "Riattiva"}
            </Button>
          </>
        ) : (
          <>
            <Button size="sm" onClick={save} disabled={pending}>
              {pending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Save className="mr-1 h-3 w-3" />} Salva
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={pending}>
              <X className="mr-1 h-3 w-3" /> Annulla
            </Button>
          </>
        )}
      </div>

      <Row label="Email" value={person.email ?? "—"} />
      <Row label="Impresa">
        {editing ? (
          <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className="rounded-md border border-leo-border bg-leo-card px-2 py-1 text-sm">
            {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        ) : <span>{person.company?.name ?? "—"}</span>}
      </Row>
      <Row label="Ruolo">
        {editing ? (
          <select value={roleCode} onChange={(e) => setRoleCode(e.target.value)} className="rounded-md border border-leo-border bg-leo-card px-2 py-1 text-sm">
            {roles.map((r) => <option key={r.code} value={r.code}>{r.name} (lvl {r.role_level})</option>)}
          </select>
        ) : <Badge variant="outline">{person.role?.name ?? "—"}</Badge>}
      </Row>
      <Row label="Lingua UI">
        {editing ? (
          <select value={locale} onChange={(e) => setLocale(e.target.value)} className="rounded-md border border-leo-border bg-leo-card px-2 py-1 text-sm">
            <option value="it">Italiano</option>
            <option value="es">Español</option>
          </select>
        ) : <span className="uppercase">{person.locale ?? "it"}</span>}
      </Row>
      <Row label="Stato">
        <Badge variant={active ? "green" : "gray"}>{active ? "Attivo" : "Disattivo"}</Badge>
      </Row>
      <Row label="Auth user_id">
        <code className="text-xs text-leo-muted">{person.auth_user_id ?? "non collegato"}</code>
      </Row>
      <div className="mt-3 rounded-md bg-leo-card/30 px-2 py-1.5 text-[10px] text-leo-muted">
        Firma applicativa automatica: chi modifica diventa updated_by + reviewed_by (audit log).
      </div>
    </div>
  );
}

function Row({ label, value, children }: { label: string; value?: any; children?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-28 shrink-0 text-xs text-leo-muted">{label}</span>
      <div>{children ?? <span>{value}</span>}</div>
    </div>
  );
}
