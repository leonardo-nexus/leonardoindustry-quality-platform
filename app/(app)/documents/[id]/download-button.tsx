"use client";
import { useTransition } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getRevisionSignedUrlAction } from "../actions";

export function DownloadButton({ fileId, fileName }: { fileId: string; fileName: string }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const r = await getRevisionSignedUrlAction(fileId);
      if (r.error) {
        toast.error(r.error);
        return;
      }
      window.open(r.url, "_blank");
    });
  }

  return (
    <Button onClick={handleClick} variant="ghost" size="sm" disabled={isPending}>
      <Download className="h-4 w-4" /> {fileName}
    </Button>
  );
}
