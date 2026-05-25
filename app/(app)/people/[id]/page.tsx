import { permanentRedirect } from "next/navigation";

/** Compat: vecchio path /people/[id] reindirizza al detail /users/[id]. */
export default async function PeopleAliasDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  permanentRedirect(`/users/${id}`);
}
