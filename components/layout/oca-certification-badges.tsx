import { OcaImage } from "./oca-image";

interface BadgeMeta {
  norm: string;
  label_it: string;
  label_es: string;
  bg: string;
  border: string;
  text: string;
}

const BADGES: BadgeMeta[] = [
  {
    norm: "ISO 9001",
    label_it: "Sistema gestione qualità",
    label_es: "Sistema de gestión de calidad",
    bg: "bg-blue-600/10",
    border: "border-blue-600/40",
    text: "text-blue-300",
  },
  {
    norm: "ISO 14001",
    label_it: "Sistema gestione ambientale",
    label_es: "Sistema de gestión ambiental",
    bg: "bg-emerald-600/10",
    border: "border-emerald-600/40",
    text: "text-emerald-300",
  },
  {
    norm: "ISO 45001",
    label_it: "Sicurezza e salute sul lavoro",
    label_es: "Seguridad y salud en el trabajo",
    bg: "bg-red-600/10",
    border: "border-red-600/40",
    text: "text-red-300",
  },
];

/**
 * Badge certificazioni OCA Global (ENAC).
 * Variante `compact` per footer/topbar; variante normale per pagine standards/about.
 *
 * Per usare l'immagine ufficiale combinata, salvala in `public/oca-badges.png`.
 * Il componente la mostra in alto e mantiene comunque i 3 badge testuali sotto.
 */
export function OcaCertificationBadges({
  locale = "it",
  variant = "default",
  showImage = true,
}: {
  locale?: "it" | "es";
  variant?: "default" | "compact";
  showImage?: boolean;
}) {
  if (variant === "compact") {
    return (
      <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-leo-muted">
        <span className="font-semibold uppercase tracking-wider">OCA Global · ENAC</span>
        {BADGES.map((b) => (
          <span key={b.norm} className={`rounded border ${b.border} ${b.bg} ${b.text} px-1.5 py-0.5 font-mono`}>
            {b.norm}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-md border border-leo-border bg-leo-card/40 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold">
            {locale === "es" ? "Certificaciones del sistema" : "Certificazioni del sistema"}
          </h4>
          <p className="text-xs text-leo-muted">
            {locale === "es"
              ? "Acreditadas por OCA Global (ENAC)"
              : "Accreditate da OCA Global (ENAC)"}
          </p>
        </div>
        <span className="text-[10px] uppercase tracking-wider text-leo-muted">OCA Global · ENAC</span>
      </div>

      {showImage && <OcaImage />}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {BADGES.map((b) => (
          <div key={b.norm} className={`rounded-md border ${b.border} ${b.bg} p-3 text-center`}>
            <div className={`font-mono text-sm font-bold ${b.text}`}>{b.norm}</div>
            <div className="mt-1 text-xs text-leo-muted">{locale === "es" ? b.label_es : b.label_it}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
