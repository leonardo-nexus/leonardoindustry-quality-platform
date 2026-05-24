import { differenceInCalendarDays } from "date-fns";

export type DeadlineStatus = "green" | "blue" | "yellow" | "orange" | "red" | "black" | "gray";

export interface DeadlineInfo {
  status: DeadlineStatus;
  daysLeft: number | null;
  label: string;
}

export function classifyDeadline(
  dueDate: Date | string | null,
  options?: { completed?: boolean; criticalBlock?: boolean; planned?: boolean },
): DeadlineInfo {
  if (options?.completed) return { status: "green", daysLeft: null, label: "Completato" };
  if (options?.criticalBlock) return { status: "black", daysLeft: null, label: "Blocco operativo" };
  if (!dueDate) return { status: "gray", daysLeft: null, label: "Senza scadenza" };

  const due = typeof dueDate === "string" ? new Date(dueDate) : dueDate;
  const days = differenceInCalendarDays(due, new Date());

  if (days < 0) return { status: "red", daysLeft: days, label: `Scaduto da ${Math.abs(days)} gg` };
  if (days <= 7) return { status: "orange", daysLeft: days, label: `${days} gg residui` };
  if (days <= 30) return { status: "yellow", daysLeft: days, label: `${days} gg residui` };
  if (options?.planned) return { status: "blue", daysLeft: days, label: "Pianificato" };
  return { status: "blue", daysLeft: days, label: `${days} gg residui` };
}

export const statusColors: Record<DeadlineStatus, { bg: string; text: string; border: string }> = {
  green: { bg: "bg-emerald-100", text: "text-emerald-800", border: "border-emerald-300" },
  blue: { bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-300" },
  yellow: { bg: "bg-yellow-100", text: "text-yellow-800", border: "border-yellow-300" },
  orange: { bg: "bg-orange-100", text: "text-orange-800", border: "border-orange-300" },
  red: { bg: "bg-red-100", text: "text-red-800", border: "border-red-300" },
  black: { bg: "bg-zinc-900", text: "text-white", border: "border-zinc-900" },
  gray: { bg: "bg-zinc-100", text: "text-zinc-700", border: "border-zinc-300" },
};
