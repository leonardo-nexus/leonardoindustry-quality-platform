import Link from "next/link";
import { RecoverForm } from "./recover-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function RecoverPage() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl">Recupero password</CardTitle>
        <CardDescription>Inserisci la tua email per ricevere un link di recupero</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <RecoverForm />
        <div className="text-center text-sm text-muted-foreground">
          <Link href="/login" className="hover:underline">
            Torna al login
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
