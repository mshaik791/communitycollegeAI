import type { ReactNode } from "react";
import clsx from "clsx";

interface CardProps {
  children: ReactNode;
  className?: string;
  variant?: "default" | "glass";
}

export function Card({ children, className, variant = "default" }: CardProps) {
  return (
    <div
      className={clsx(
        variant === "glass"
          ? "glass p-4 shadow-sm"
          : "rounded-xl border border-slate-800/80 bg-slate-900/60 p-4 shadow-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  children: ReactNode;
  className?: string;
}

export function CardHeader({ children, className }: CardHeaderProps) {
  return <div className={clsx("mb-3 flex items-center justify-between", className)}>{children}</div>;
}

interface CardTitleProps {
  children: ReactNode;
  className?: string;
}

export function CardTitle({ children, className }: CardTitleProps) {
  return <h2 className={clsx("text-sm font-semibold text-slate-100", className)}>{children}</h2>;
}

interface CardDescriptionProps {
  children: ReactNode;
  className?: string;
}

export function CardDescription({ children, className }: CardDescriptionProps) {
  return (
    <p className={clsx("text-xs text-slate-400", className)}>
      {children}
    </p>
  );
}

interface CardContentProps {
  children: ReactNode;
  className?: string;
}

export function CardContent({ children, className }: CardContentProps) {
  return <div className={clsx("text-sm text-slate-100", className)}>{children}</div>;
}
