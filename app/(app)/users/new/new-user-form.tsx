"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, UserPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createUserAction } from "../actions";

export function NewUserForm({ companies, roles }: { companies: any[]; roles: any[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    startTransition(async () => {
      const r = await createUserAction(formData);
      if (r?.error) toast.error(r.error);
      else { toast.success("Utente creato"); router.push(`/users/${r.id}`); }
    });
  }

  return (
    <form action={submit} className="grid gap-3 sm:grid-cols-2">
      <label className="block">
        <span className="block text-xs text-leo-muted mb-1">Nome *</span>
        <Input name="first_name" required />
      </label>
      <label className="block">
        <span className="block text-xs text-leo-muted mb-1">Cognome *</span>
        <Input name="last_name" required />
      </label>
      <label className="block sm:col-span-2">
        <span className="block text-xs text-leo-muted mb-1">Email *</span>
        <Input type="email" name="email" required />
      </label>
      <label className="block">
        <span className="block text-xs text-leo-muted mb-1">Impresa *</span>
        <select name="company_id" required className="w-full rounded-md border border-leo-border bg-leo-card px-2 py-2 text-sm">
          <option value="">— seleziona —</option>
          {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </label>
      <label className="block">
        <span className="block text-xs text-leo-muted mb-1">Ruolo *</span>
        <select name="role_code" required className="w-full rounded-md border border-leo-border bg-leo-card px-2 py-2 text-sm">
          <option value="">— seleziona —</option>
          {roles.map((r) => <option key={r.code} value={r.code}>{r.name} (lvl {r.role_level})</option>)}
        </select>
      </label>
      <label className="block">
        <span className="block text-xs text-leo-muted mb-1">Lingua UI</span>
        <select name="locale" defaultValue="it" className="w-full rounded-md border border-leo-border bg-leo-card px-2 py-2 text-sm">
          <option value="it">Italiano</option>
          <option value="es">Español</option>
        </select>
      </label>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          {pending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <UserPlus className="mr-1 h-3 w-3" />}
          Crea utente
        </Button>
        <p className="mt-3 text-xs text-leo-muted">
          ⓘ La creazione registra il record `person`. L'utente Auth Supabase va invitato separatamente dal pannello Supabase Auth → Users → Invite, collegando poi `auth_user_id` qui in scheda dettaglio.
        </p>
      </div>
    </form>
  );
}
