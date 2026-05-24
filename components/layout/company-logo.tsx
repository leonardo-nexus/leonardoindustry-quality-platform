import { cn } from "@/lib/utils";

interface Props {
  name: string;
  logoUrl?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

const SIZE: Record<NonNullable<Props["size"]>, string> = {
  xs: "h-6 w-6 text-[9px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-16 w-16 text-lg",
  xl: "h-24 w-24 text-2xl",
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function CompanyLogo({ name, logoUrl, size = "md", className }: Props) {
  if (logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={logoUrl}
        alt={`Logo ${name}`}
        className={cn(
          "rounded-md object-contain bg-white p-1 ring-1 ring-leo-border",
          SIZE[size],
          className,
        )}
      />
    );
  }
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-md bg-brand-gradient text-white font-bold ring-1 ring-leo-border",
        SIZE[size],
        className,
      )}
      title={name}
    >
      {initials(name)}
    </div>
  );
}
