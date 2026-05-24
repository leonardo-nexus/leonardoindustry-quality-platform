import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  // Esclude: asset statici, endpoint integrazione ERP (HMAC-protected), widget embeddable iframe
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/integrations/erp|embed|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
