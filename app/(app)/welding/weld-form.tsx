"use client";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createWeldAction } from "./actions";

export function WeldForm({
  defaultProjectId,
  projects,
  drawings,
  execClasses,
  wpsList,
  welders,
  materials,
}: {
  defaultProjectId?: string;
  projects: Array<{ id: string; code: string; name: string }>;
  drawings: Array<{ id: string; code: string; revision: string; project_id: string; status: string }>;
  execClasses: Array<{ id: string; code: string }>;
  wpsList: Array<{ id: string; code: string; revision: string }>;
  welders: Array<{ id: string; first_name: string; last_name: string }>;
  materials: Array<{ id: string; heat_number: string | null; material_grade: string; project_id: string | null }>;
}) {
  const [isPending, startTransition] = useTransition();
  const [projectId, setProjectId] = useState(defaultProjectId ?? "");

  const filteredDrawings = useMemo(
    () => drawings.filter((d) => !projectId || d.project_id === projectId),
    [drawings, projectId],
  );
  const filteredMaterials = useMemo(
    () => materials.filter((m) => !projectId || !m.project_id || m.project_id === projectId),
    [materials, projectId],
  );

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const r = await createWeldAction(fd);
      if (r?.error) toast.error(r.error);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid max-w-3xl grid-cols-1 gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="project_id">Commessa *</Label>
        <Select name="project_id" value={projectId} onValueChange={setProjectId}>
          <SelectTrigger id="project_id"><SelectValue placeholder="Scegli..." /></SelectTrigger>
          <SelectContent>
            {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.code} - {p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="weld_number">Numero saldatura *</Label>
        <Input id="weld_number" name="weld_number" required placeholder="W001" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="execution_class_id">Classe EXC *</Label>
        <Select name="execution_class_id">
          <SelectTrigger id="execution_class_id"><SelectValue placeholder="Scegli..." /></SelectTrigger>
          <SelectContent>
            {execClasses.map((e) => <SelectItem key={e.id} value={e.id}>{e.code}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="drawing_id">Disegno (deve essere ATTIVO)</Label>
        <Select name="drawing_id">
          <SelectTrigger id="drawing_id"><SelectValue placeholder="Scegli..." /></SelectTrigger>
          <SelectContent>
            {filteredDrawings.map((d) => <SelectItem key={d.id} value={d.id}>{d.code} r{d.revision}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="wps_id">WPS *</Label>
        <Select name="wps_id">
          <SelectTrigger id="wps_id"><SelectValue placeholder="Scegli..." /></SelectTrigger>
          <SelectContent>
            {wpsList.map((w) => <SelectItem key={w.id} value={w.id}>{w.code} r{w.revision}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="welder_id">Saldatore *</Label>
        <Select name="welder_id">
          <SelectTrigger id="welder_id"><SelectValue placeholder="Scegli..." /></SelectTrigger>
          <SelectContent>
            {welders.map((w) => <SelectItem key={w.id} value={w.id}>{w.first_name} {w.last_name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="material_lot_id">Lotto materiale</Label>
        <Select name="material_lot_id">
          <SelectTrigger id="material_lot_id"><SelectValue placeholder="Scegli..." /></SelectTrigger>
          <SelectContent>
            {filteredMaterials.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.material_grade} {m.heat_number ? `(${m.heat_number})` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="welded_at">Data saldatura</Label>
        <Input id="welded_at" name="welded_at" type="date" />
      </div>
      <div className="flex items-center space-x-2 md:col-span-2">
        <input type="checkbox" id="ndt_required" name="ndt_required" value="true" />
        <Label htmlFor="ndt_required">CND richiesto (PT/MT/UT/RT)</Label>
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="notes">Note</Label>
        <Textarea id="notes" name="notes" />
      </div>
      <div className="md:col-span-2">
        <Button type="submit" disabled={isPending}>{isPending ? "..." : "Pianifica saldatura"}</Button>
      </div>
    </form>
  );
}
