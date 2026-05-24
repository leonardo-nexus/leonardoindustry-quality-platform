import { Badge } from "@/components/ui/badge";
import { classifyDeadline, type DeadlineStatus } from "@/lib/dates/status";

const VARIANT_MAP: Record<DeadlineStatus, "green" | "blue" | "yellow" | "orange" | "red" | "black" | "gray"> = {
  green: "green",
  blue: "blue",
  yellow: "yellow",
  orange: "orange",
  red: "red",
  black: "black",
  gray: "gray",
};

export function DeadlineBadge({
  dueDate,
  completed,
  criticalBlock,
}: {
  dueDate: Date | string | null;
  completed?: boolean;
  criticalBlock?: boolean;
}) {
  const info = classifyDeadline(dueDate, { completed, criticalBlock });
  return <Badge variant={VARIANT_MAP[info.status]}>{info.label}</Badge>;
}
