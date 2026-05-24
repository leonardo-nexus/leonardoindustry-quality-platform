"use client";
import { useState } from "react";

/** Mostra l'immagine `/oca-badges.png` se esiste, altrimenti si nasconde silenziosamente. */
export function OcaImage() {
  const [hide, setHide] = useState(false);
  if (hide) return null;
  return (
    <div className="mb-3 flex justify-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/oca-badges.png"
        alt="Certificazioni OCA Global ISO 9001, ISO 14001, ISO 45001"
        className="h-auto max-h-20 w-auto rounded bg-white/5 p-1"
        onError={() => setHide(true)}
      />
    </div>
  );
}
