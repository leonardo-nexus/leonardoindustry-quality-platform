import Link from "next/link";
import { HelpCircle, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createServerClient } from "@/lib/supabase/server";
import { getCurrentLocale } from "@/lib/i18n/dictionary";

/**
 * Server component: legge il help_topic per slug + primi N step, mostra mini-pannello laterale
 * con titolo + primi 3 passi + link "Apri guida completa".
 */
export async function ContextualHelp({
  topicSlug,
  compact = false,
  maxSteps = 3,
}: {
  topicSlug: string;
  compact?: boolean;
  maxSteps?: number;
}) {
  const supabase = await createServerClient();
  const locale = await getCurrentLocale();

  const { data: topic } = await supabase
    .from("help_topic")
    .select("id, title_it, title_es, summary_it, summary_es")
    .eq("slug", topicSlug)
    .eq("active", true)
    .maybeSingle();
  if (!topic) return null;

  const { data: steps } = await supabase
    .from("help_step")
    .select("step_number, title_it, title_es")
    .eq("topic_id", topic.id)
    .order("step_number")
    .limit(maxSteps);

  const titleField = locale === "es" ? "title_es" : "title_it";
  const summaryField = locale === "es" ? "summary_es" : "summary_it";

  return (
    <Card className="leo-card border-brand-cyan/30">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <HelpCircle className="h-4 w-4 text-brand-cyan" />
          {(topic as any)[titleField]}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {(topic as any)[summaryField] && (
          <p className="text-xs text-leo-muted">{(topic as any)[summaryField]}</p>
        )}
        {!compact && (steps?.length ?? 0) > 0 && (
          <ol className="space-y-1 text-xs">
            {(steps ?? []).map((s: any) => (
              <li key={s.step_number} className="flex gap-2">
                <span className="shrink-0 rounded bg-brand-cyan/20 px-1.5 font-mono text-brand-cyan">{s.step_number}</span>
                <span>{s[titleField]}</span>
              </li>
            ))}
          </ol>
        )}
        <Button asChild size="sm" variant="outline" className="w-full">
          <Link href={`/help/${topicSlug}`} className="flex items-center justify-between">
            <span>{locale === "es" ? "Abrir guía completa" : "Apri guida completa"}</span>
            <ChevronRight className="h-3 w-3" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
