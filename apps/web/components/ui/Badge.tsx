import type { ReactNode } from "react";
import clsx from "clsx";

type Variant = "default" | "success" | "warning" | "critical";

interface BadgeProps {
  children: ReactNode;
  variant?: Variant;
  className?: string;
}

const variantClasses: Record<Variant, string> = {
  default: "bg-slate-800 text-slate-100 border-slate-700",
  success: "bg-emerald-900/60 text-emerald-200 border-emerald-700/70",
  warning: "bg-amber-900/60 text-amber-200 border-amber-700/70",
  critical: "bg-rose-900/60 text-rose-200 border-rose-700/70",
};

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[0.68rem] font-medium",
        variantClasses[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

