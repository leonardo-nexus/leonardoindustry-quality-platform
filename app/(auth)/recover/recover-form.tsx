"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendRecoveryEmailAction } from "./actions";

export function RecoverForm() {
  const [email, setEmail] = useState("");
  const [isPending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await sendRecoveryEmailAction(email);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setSent(true);
      toast.success("Email inviata se l'indirizzo è registrato");
    });
  }

  if (sent) {
    return (
      <div className="rounded-md border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800">
        Se l&apos;email è registrata riceverai un link per reimpostare la password.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Invio..." : "Invia link"}
      </Button>
    </form>
  );
}
