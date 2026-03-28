import type { ReactNode } from "react";
import clsx from "clsx";

interface StatTileProps {
  label: string;
  value: ReactNode;
  helper?: string;
  className?: string;
}

export function StatTile({ label, value, helper, className }: StatTileProps) {
  return (
    <div
      className={clsx(
        "rounded-lg border border-slate-800/80 bg-slate-900/70 px-4 py-3 text-sm",
        className,
      )}
    >
      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold text-slate-50">{value}</div>
      {helper ? (
        <div className="mt-0.5 text-[0.7rem] text-slate-400">
          {helper}
        </div>
      ) : null}
    </div>
  );
}

