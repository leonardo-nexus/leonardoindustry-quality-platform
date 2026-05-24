"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, AlertOctagon, Truck, Package, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  authorizeProductionAction,
  authorizeDeliveryAction,
  createDerogaAction,
  createReceptionFromOrderAction,
} from "../actions";

export function OrderActions({ order, prodGateUnlocked, delGateUnlocked, magazzini }: { order: any; prodGateUnlocked: boolean; delGateUnlocked: boolean; magazzini: any[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showProd, setShowProd] = useState(false);
  const [showDel, setShowDel] = useState(false);
  const [showDeroga, setShowDeroga] = useState(false);
  const [showReception, setShowReception] = useState(false);

  function call(action: (fd: FormData) => Promise<{ ok?: boolean; error?: string }>, fd: FormData, successMsg: string, cb?: () => void) {
    startTransition(async () => {
      const r = await action(fd);
      if (r?.error) toast.error(r.error);
      else { toast.success(successMsg); cb?.(); router.refresh(); }
    });
  }

  return (
    <Card className="leo-card border-brand-cyan/30">
      <CardHeader><CardTitle className="text-base">Azioni ordine</CardTitle></CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button onClick={() => setShowProd(true)} disabled={pending} variant={prodGateUnlocked ? "outline" : "secondary"} className="mobile-action justify-start">
            <CheckCircle2 className="mr-2 h-5 w-5" /> {prodGateUnlocked ? "✓ Autorizzata" : "Autorizza produzione"}
          </Button>
          <Button onClick={() => setShowDel(true)} disabled={pending} variant={delGateUnlocked ? "outline" : "secondary"} className="mobile-action justify-start">
            <Truck className="mr-2 h-5 w-5" /> {delGateUnlocked ? "✓ Autorizzata" : "Autorizza consegna"}
          </Button>
          <Button onClick={() => setShowReception(true)} disabled={pending} variant="outline" className="mobile-action justify-start">
            <Package className="mr-2 h-5 w-5" /> Crea ricezione
          </Button>
          <Button onClick={() => setShowDeroga(true)} disabled={pending} variant="ghost" className="mobile-action justify-start text-status-red">
            <AlertOctagon className="mr-2 h-5 w-5" /> Deroga (firmata)
          </Button>
        </div>
      </CardContent>

      {/* Dialog autorizza produzione */}
      <Dialog open={showProd} onOpenChange={setShowProd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Autorizza produzione fornitore</DialogTitle></DialogHeader>
          <form action={(fd) => call(authorizeProductionAction.bind(null, order.id), fd, "Produzione autorizzata", () => setShowProd(false))} className="space-y-3">
            <Check name="order_approved" label="Ordine approvato (acquisti)" />
            <Check name="tech_sheet_approved" label="Scheda tecnica approvata" />
            <Check name="quantity_approved" label="Quantità approvata" />
            <Textarea name="reason" placeholder="Motivo firma (obbligatorio)" rows={2} required />
            <DialogFooter><Button type="submit" disabled={pending}>{pending ? "..." : "Firma autorizzazione"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog autorizza consegna */}
      <Dialog open={showDel} onOpenChange={setShowDel}>
        <DialogContent>
          <DialogHeader><DialogTitle>Autorizza spedizione/consegna</DialogTitle></DialogHeader>
          <form action={(fd) => call(authorizeDeliveryAction.bind(null, order.id), fd, "Consegna autorizzata", () => setShowDel(false))} className="space-y-3">
            <label className="block text-xs">
              <span className="block text-leo-muted mb-1">Data consegna approvata</span>
              <Input type="date" name="delivery_date_approved" required />
            </label>
            <Check name="destination_confirmed" label="Destinazione confermata" />
            <Check name="space_available" label="Spazio disponibile" />
            <Check name="unloading_means_available" label="Mezzi scarico disponibili" />
            <Check name="personnel_assigned" label="Personale assegnato" />
            <Textarea name="reason" placeholder="Motivo firma (obbligatorio)" rows={2} required />
            <DialogFooter><Button type="submit" disabled={pending}>{pending ? "..." : "Firma autorizzazione"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog deroga */}
      <Dialog open={showDeroga} onOpenChange={setShowDeroga}>
        <DialogContent className="border-status-red/40">
          <DialogHeader><DialogTitle className="text-status-red">Deroga ricezione non pianificata</DialogTitle></DialogHeader>
          <form action={(fd) => call(createDerogaAction.bind(null, order.id), fd, "Deroga firmata", () => setShowDeroga(false))} className="space-y-3">
            <Textarea name="reason" placeholder="Motivo deroga (obbligatorio)" rows={2} required />
            <Textarea name="risk_accepted" placeholder="Rischio accettato (obbligatorio)" rows={2} required />
            <label className="block text-xs">
              <span className="block text-leo-muted mb-1">Costo stimato €</span>
              <Input type="number" step="0.01" name="estimated_cost" />
            </label>
            <p className="text-xs text-status-red">⚠ Firmata = registrata in audit log + penalità al fornitore (forced_delivery)</p>
            <DialogFooter><Button type="submit" variant="destructive" disabled={pending}>{pending ? "..." : "Firma deroga"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog crea ricezione */}
      <Dialog open={showReception} onOpenChange={setShowReception}>
        <DialogContent>
          <DialogHeader><DialogTitle>Crea ricezione materiale</DialogTitle></DialogHeader>
          <form action={(fd) => {
            const assigned = fd.get("assigned_to_person_id") as string;
            const scheduled = (fd.get("scheduled_for") as string) || null;
            startTransition(async () => {
              const r = await createReceptionFromOrderAction(order.id, assigned, scheduled);
              if (r?.error) toast.error(r.error);
              else { toast.success("Ricezione creata e assegnata"); setShowReception(false); router.refresh(); }
            });
          }} className="space-y-3">
            <label className="block text-xs">
              <span className="block text-leo-muted mb-1">Assegna a operatore</span>
              <select name="assigned_to_person_id" required className="w-full rounded-md border border-leo-border bg-leo-card px-2 py-2 text-sm">
                <option value="">— seleziona —</option>
                {magazzini.map((p) => <option key={p.id} value={p.id}>{p.first_name} {p.last_name} ({p.role?.code})</option>)}
              </select>
            </label>
            <label className="block text-xs">
              <span className="block text-leo-muted mb-1">Data prevista</span>
              <Input type="date" name="scheduled_for" defaultValue={order.expected_delivery ?? ""} />
            </label>
            <DialogFooter><Button type="submit" disabled={pending}>{pending ? "..." : "Crea + assegna"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function Check({ name, label }: { name: string; label: string }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" name={name} value="1" />
      {label}
    </label>
  );
}
