import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive text-destructive-foreground",
        outline: "text-foreground",
        green: "border-emerald-300 bg-emerald-100 text-emerald-800",
        blue: "border-blue-300 bg-blue-100 text-blue-800",
        yellow: "border-yellow-300 bg-yellow-100 text-yellow-800",
        orange: "border-orange-300 bg-orange-100 text-orange-800",
        red: "border-red-300 bg-red-100 text-red-800",
        black: "border-zinc-900 bg-zinc-900 text-white",
        gray: "border-zinc-300 bg-zinc-100 text-zinc-700",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
