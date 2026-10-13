import { BadgeWithIcon } from "@/components/base/badges/badges";
import { AlertCircle, CheckCircle, Clock, XCircle } from "@untitledui/icons";
import type { InvoiceStatus } from "../lib/consigna.ts";

// Status is always text plus icon, never colour alone (PRD §6 Accessibility).
const STATUS = {
  open: { label: "Open", color: "gray", icon: Clock },
  paid: { label: "Paid", color: "success", icon: CheckCircle },
  cancelled: { label: "Cancelled", color: "error", icon: XCircle },
  none: { label: "Not found", color: "warning", icon: AlertCircle },
} as const;

export function StatusBadge({ status }: { status: InvoiceStatus }) {
  const s = STATUS[status];
  return (
    <BadgeWithIcon type="pill-color" color={s.color} size="md" iconLeading={s.icon}>
      {s.label}
    </BadgeWithIcon>
  );
}
