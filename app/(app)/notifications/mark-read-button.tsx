"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { markRecipientReadAction } from "./actions";

export function MarkReadButton({ recipientId }: { recipientId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await markRecipientReadAction(recipientId);
          router.refresh();
        })
      }
    >
      {isPending ? "..." : "Segna come letta"}
    </Button>
  );
}
