import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { PERIOD_STATUS, SUBSCRIPTION_STATUS, type PeriodStatus } from "@/lib/format";

export type Tone = "success" | "warning" | "danger" | "info" | "neutral" | "brand";

const tones: Record<Tone, string> = {
  success: "bg-emerald-100 text-emerald-900 ring-emerald-300",
  warning: "bg-amber-100 text-amber-900 ring-amber-300",
  danger: "bg-red-100 text-red-900 ring-red-300",
  info: "bg-sky-100 text-sky-900 ring-sky-300",
  neutral: "bg-slate-100 text-slate-800 ring-slate-300",
  brand: "bg-brand-100 text-brand-900 ring-brand-200",
};

export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function PeriodStatusBadge({ status }: { status: PeriodStatus }) {
  const s = PERIOD_STATUS[status];
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

export function SubscriptionBadge({ status }: { status: "active" | "paused" | "stopped" }) {
  const s = SUBSCRIPTION_STATUS[status];
  return <Badge tone={s.tone}>{s.label}</Badge>;
}
