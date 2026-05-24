"use client";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  defaults?: {
    name?: string;
    legal_name?: string | null;
    country?: string | null;
    tax_id?: string | null;
    vat_id?: string | null;
    address?: string | null;
    notes?: string | null;
    active?: boolean;
  };
  action: (formData: FormData) => Promise<{ error?: string } | void>;
  submitLabel?: string;
}

export function CompanyForm({ defaults, action, submitLabel = "Salva" }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await action(formData);
      if (result?.error) toast.error(result.error);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Nome *</Label>
          <Input id="name" name="name" required defaultValue={defaults?.name} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="legal_name">Ragione sociale</Label>
          <Input id="legal_name" name="legal_name" defaultValue={defaults?.legal_name ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="country">Paese</Label>
          <Input id="country" name="country" placeholder="IT / ES" defaultValue={defaults?.country ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tax_id">Codice fiscale / NIF</Label>
          <Input id="tax_id" name="tax_id" defaultValue={defaults?.tax_id ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="vat_id">P.IVA / CIF</Label>
          <Input id="vat_id" name="vat_id" defaultValue={defaults?.vat_id ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="address">Indirizzo</Label>
          <Input id="address" name="address" defaultValue={defaults?.address ?? ""} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="notes">Note</Label>
          <Textarea id="notes" name="notes" defaultValue={defaults?.notes ?? ""} />
        </div>
        <div className="flex items-center gap-2">
          <input
            id="active"
            name="active"
            type="checkbox"
            defaultChecked={defaults?.active ?? true}
            value="true"
            className="h-4 w-4"
          />
          <Label htmlFor="active">Attiva</Label>
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Salvataggio..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
