"use client";
import { useEffect, useId, useRef, useState } from "react";

let mermaidPromise: Promise<any> | null = null;
function loadMermaid() {
  if (!mermaidPromise) {
    mermaidPromise = import("mermaid").then((m) => {
      const mer = m.default;
      mer.initialize({ startOnLoad: false, theme: "dark", securityLevel: "loose" });
      return mer;
    });
  }
  return mermaidPromise;
}

export function MermaidDiagram({ source, title }: { source: string; title?: string }) {
  const id = useId().replace(/:/g, "");
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    loadMermaid()
      .then(async (mer) => {
        if (!active || !ref.current) return;
        try {
          const { svg } = await mer.render(`m${id}`, source);
          if (active && ref.current) ref.current.innerHTML = svg;
        } catch (e) {
          setError((e as Error).message);
        }
      })
      .catch((e) => setError(e.message));
    return () => { active = false; };
  }, [source, id]);

  return (
    <div className="rounded-md border border-leo-border bg-leo-card/40 p-4">
      {title && <h4 className="mb-2 text-xs font-semibold uppercase text-leo-muted">{title}</h4>}
      <div ref={ref} className="overflow-x-auto" />
      {error && <p className="mt-2 text-xs text-status-red">Errore rendering: {error}</p>}
    </div>
  );
}
