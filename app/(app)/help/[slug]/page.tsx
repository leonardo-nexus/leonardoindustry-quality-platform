import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ExternalLink, BookOpen } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createServerClient } from "@/lib/supabase/server";
import { getCurrentLocale } from "@/lib/i18n/dictionary";
import { MermaidDiagram } from "@/components/help/mermaid-diagram";

export default async function HelpTopicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createServerClient();
  const locale = await getCurrentLocale();

  const { data: topic } = await supabase
    .from("help_topic")
    .select("*")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();
  if (!topic) notFound();

  const [{ data: steps }, { data: links }, { data: diagrams }] = await Promise.all([
    supabase.from("help_step").select("*").eq("topic_id", topic.id).order("step_number"),
    supabase.from("help_link").select("*").eq("topic_id", topic.id).order("order_index"),
    supabase.from("help_diagram").select("*").eq("topic_id", topic.id).order("order_index"),
  ]);

  const titleField = locale === "es" ? "title_es" : "title_it";
  const bodyField = locale === "es" ? "body_es" : "body_it";
  const summaryField = locale === "es" ? "summary_es" : "summary_it";
  const labelField = locale === "es" ? "label_es" : "label_it";
  const actionLabelField = locale === "es" ? "action_label_es" : "action_label_it";

  return (
    <>
      <PageHeader
        title={topic[titleField]}
        description={topic[summaryField]}
        actions={<Button asChild variant="outline"><Link href="/help">← {locale === "es" ? "Guías" : "Guide"}</Link></Button>}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {topic[bodyField] && (
            <Card className="leo-card">
              <CardContent className="p-4">
                <p className="whitespace-pre-line text-sm">{topic[bodyField]}</p>
              </CardContent>
            </Card>
          )}

          {(diagrams ?? []).map((d: any) => (
            <MermaidDiagram key={d.id} source={d.mermaid_source} title={d[titleField]} />
          ))}

          {(steps ?? []).length > 0 && (
            <Card className="leo-card">
              <CardHeader>
                <CardTitle className="text-base">{locale === "es" ? "Pasos" : "Passi"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(steps ?? []).map((s: any) => (
                  <div key={s.id} className="rounded-md border border-leo-border bg-leo-card/30 p-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono">{s.step_number}</Badge>
                      <span className="font-medium">{s[titleField]}</span>
                    </div>
                    {s[bodyField] && <p className="mt-1.5 text-sm text-leo-muted">{s[bodyField]}</p>}
                    {s[actionLabelField] && s.action_url && (
                      <Button asChild size="sm" variant="outline" className="mt-2">
                        <Link href={s.action_url}>{s[actionLabelField]} <ArrowRight className="ml-1 h-3 w-3" /></Link>
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          {(links ?? []).length > 0 && (
            <Card className="leo-card">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><ExternalLink className="h-4 w-4" /> {locale === "es" ? "Enlaces rápidos" : "Link rapidi"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {(links ?? []).map((l: any) => (
                  <Link key={l.id} href={l.url} className="block rounded-md border border-leo-border bg-leo-card/30 px-3 py-2 text-sm hover:bg-leo-card hover:border-brand-cyan">
                    {l[labelField]}
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}

          {(topic.related_pages ?? []).length > 0 && (
            <Card className="leo-card">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><BookOpen className="h-4 w-4" /> {locale === "es" ? "Páginas relacionadas" : "Pagine collegate"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-xs">
                {(topic.related_pages ?? []).map((p: string, i: number) => (
                  <div key={i} className="font-mono text-leo-muted">{p}</div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
