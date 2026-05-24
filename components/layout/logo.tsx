import Image from "next/image";
import { cn } from "@/lib/utils";

export function LeonardoLogo({
  subtitle = "QUALITY",
  className,
}: {
  subtitle?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Image
        src="/icon.png"
        alt="Leonardoindustry"
        width={36}
        height={36}
        priority
        className="rounded-md"
      />
      <div className="flex flex-col leading-tight">
        <span className="brand-gradient-text text-base font-bold tracking-wider">
          LEONARDO
        </span>
        {subtitle && (
          <span className="text-[10px] font-semibold tracking-[0.2em] text-leo-muted">
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}
