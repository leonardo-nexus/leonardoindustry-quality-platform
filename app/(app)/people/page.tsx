import { permanentRedirect } from "next/navigation";

/** Compat: vecchio path /people unito in /users. */
export default function PeopleAliasIndex() {
  permanentRedirect("/users");
}
