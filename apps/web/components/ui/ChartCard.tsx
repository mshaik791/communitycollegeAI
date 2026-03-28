import type { ReactNode } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./Card";

interface ChartCardProps {
  title: string;
  description?: string;
  children?: ReactNode;
}

export function ChartCard({ title, description, children }: ChartCardProps) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-40 rounded-lg border border-dashed border-slate-700/70 bg-slate-900/80 text-xs text-slate-500 flex items-center justify-center">
          {children ?? <span>Chart placeholder</span>}
        </div>
      </CardContent>
    </Card>
  );
}

