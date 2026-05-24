export const APP_ROLES = [
  "admin_gruppo",
  "direzione_gruppo",
  "direzione_impresa",
  "responsabile_qualita",
  "responsabile_sicurezza",
  "responsabile_ambiente",
  "responsabile_saldatura",
  "project_manager",
  "capo_officina",
  "capo_cantiere",
  "auditor",
  "operatore",
  "fornitore",
] as const;

export type AppRole = (typeof APP_ROLES)[number];

export const ROLE_LABELS: Record<AppRole, string> = {
  admin_gruppo: "Admin Gruppo",
  direzione_gruppo: "Direzione Gruppo",
  direzione_impresa: "Direzione Impresa",
  responsabile_qualita: "Responsabile Qualità",
  responsabile_sicurezza: "Responsabile Sicurezza",
  responsabile_ambiente: "Responsabile Ambiente",
  responsabile_saldatura: "Responsabile Saldatura",
  project_manager: "Project Manager",
  capo_officina: "Capo Officina",
  capo_cantiere: "Capo Cantiere",
  auditor: "Auditor",
  operatore: "Operatore",
  fornitore: "Fornitore",
};

export const GROUP_LEVEL_ROLES: AppRole[] = ["admin_gruppo", "direzione_gruppo"];
export const COMPANY_LEVEL_ROLES: AppRole[] = [
  "direzione_impresa",
  "responsabile_qualita",
  "responsabile_sicurezza",
  "responsabile_ambiente",
  "responsabile_saldatura",
  "project_manager",
];

export function canSeeAllCompanies(role: AppRole | null | undefined): boolean {
  return role ? GROUP_LEVEL_ROLES.includes(role) : false;
}
