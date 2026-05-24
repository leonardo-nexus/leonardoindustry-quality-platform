"use client";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { verifyActionAction } from "../actions";

export function VerifyForm({
  actionId,
  people,
}: {
  actionId: string;
  people: Array<{ id: string; first_name: string; last_name: string }>;
}) {
  const [isPending, startTransition] = useTransition();
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const r = await verifyActionAction(actionId, fd);
      if (r?.error) toast.error(r.error);
      else toast.success("Verifica registrata");
    });
  }
  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="effectiveness_check">Esito verifica *</Label>
        <Textarea id="effectiveness_check" name="effectiveness_check" required rows={4} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="effectiveness_verified_at">Data verifica *</Label>
        <Input
          id="effectiveness_verified_at"
          name="effectiveness_verified_at"
          type="date"
          defaultValue={new Date().toISOString().slice(0, 10)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="effectiveness_verified_by">Verificata da *</Label>
        <Select name="effectiveness_verified_by">
          <SelectTrigger id="effectiveness_verified_by"><SelectValue placeholder="Scegli..." /></SelectTrigger>
          <SelectContent>
            {people.map((p) => <SelectItem key={p.id} value={p.id}>{p.first_name} {p.last_name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="status">Risultato *</Label>
        <Select name="status" defaultValue="efficace">
          <SelectTrigger id="status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="efficace">Efficace</SelectItem>
            <SelectItem value="non_efficace">Non efficace</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Registrazione..." : "Registra verifica"}
      </Button>
    </form>
  );
}
