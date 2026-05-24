import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { createCompanyAction } from "../actions";
import { CompanyForm } from "../company-form";

export default function NewCompanyPage() {
  return (
    <>
      <PageHeader title="Nuova impresa" description="Crea una nuova impresa del gruppo" />
      <Card>
        <CardContent className="p-6">
          <CompanyForm action={createCompanyAction} submitLabel="Crea impresa" />
        </CardContent>
      </Card>
    </>
  );
}
