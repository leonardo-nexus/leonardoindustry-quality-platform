"use client";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createPersonAction } from "./actions";

export function PersonForm({
  companies,
  roles,
}: {
  companies: Array<{ id: string; name: string }>;
  roles: Array<{ id: string; name: string }>;
}) {
  const [isPending, startTransition] = useTransition();
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const r = await createPersonAction(fd);
      if (r?.error) toast.error(r.error);
    });
  }
  return (
    <form onSubmit={handleSubmit} className="grid max-w-3xl grid-cols-1 gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="first_name">Nome *</Label>
        <Input id="first_name" name="first_name" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="last_name">Cognome *</Label>
        <Input id="last_name" name="last_name" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Telefono</Label>
        <Input id="phone" name="phone" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="company_id">Impresa *</Label>
        <Select name="company_id">
          <SelectTrigger id="company_id"><SelectValue placeholder="Scegli..." /></SelectTrigger>
          <SelectContent>
            {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="role_id">Ruolo</Label>
        <Select name="role_id">
          <SelectTrigger id="role_id"><SelectValue placeholder="Scegli..." /></SelectTrigger>
          <SelectContent>
            {roles.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="auth_user_id">Auth user ID (Supabase Auth)</Label>
        <Input id="auth_user_id" name="auth_user_id" placeholder="UUID utente Supabase Auth (per collegare al login)" />
      </div>
      <div className="md:col-span-2">
        <Button type="submit" disabled={isPending}>{isPending ? "..." : "Crea persona"}</Button>
      </div>
    </form>
  );
}
