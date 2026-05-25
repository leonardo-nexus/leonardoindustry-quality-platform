import { redirect } from "next/navigation";

function erpIdentityUrl() {
  const raw = process.env.NEXT_PUBLIC_ERP_URL ?? process.env.ERP_RETURN_URL ?? "https://leonardo-erp-control-center.vercel.app";
  const url = new URL(raw);
  url.pathname = "/admin/identity";
  url.search = "";
  url.hash = "";
  return url.toString();
}

export default function UsersIndexPage() {
  redirect(erpIdentityUrl());
}
