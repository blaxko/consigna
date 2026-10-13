import type { ReactNode } from "react";
import { formatUsdc, shortAddress } from "../lib/format.ts";
import { formatShortTime } from "../lib/invoice-logic.ts";
import { StatusBadge } from "./StatusBadge.tsx";
import type { InvoiceStatus } from "../lib/consigna.ts";

export type PaperLine = { desc: string; qty: number; unit: string };

/**
 * The "invoice paper": one white card with the reference, the parties, the line items and the total.
 * Line items are shown only when the caller says they are verified (details match). Otherwise pass undefined.
 */
export function InvoicePaper(props: {
  ref_: string;
  issuer: string;
  status?: InvoiceStatus;
  amountUnits: bigint;
  createdAtSeconds?: number;
  lines?: PaperLine[];
  client?: string;
  banner?: ReactNode;
}) {
  return (
    <article className="rounded-xl border border-[color:var(--color-line)] glass p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <h2 className="font-mono text-lg font-semibold">{props.ref_}</h2>
        {props.status && <StatusBadge status={props.status} />}
      </div>

      {props.banner && <div className="mt-4">{props.banner}</div>}

      <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
        {props.client && (
          <div>
            <dt className="text-[color:var(--color-muted)]">Client</dt>
            <dd className="font-medium">{props.client}</dd>
          </div>
        )}
        <div>
          <dt className="text-[color:var(--color-muted)]">Issuer</dt>
          <dd className="font-mono" title={props.issuer}>{shortAddress(props.issuer)}</dd>
        </div>
        {props.createdAtSeconds !== undefined && (
          <div>
            <dt className="text-[color:var(--color-muted)]">Created</dt>
            <dd>{formatShortTime(props.createdAtSeconds)} UTC</dd>
          </div>
        )}
      </dl>

      {props.lines && props.lines.length > 0 && (
        <table className="mt-5 w-full text-sm">
          <thead className="text-left text-[color:var(--color-muted)]">
            <tr>
              <th className="py-2 font-medium">Item</th>
              <th className="py-2 text-right font-medium">Qty</th>
              <th className="py-2 text-right font-medium">Unit</th>
            </tr>
          </thead>
          <tbody>
            {props.lines.map((l, i) => (
              <tr key={i} className="border-t border-[color:var(--color-line)]">
                <td className="py-2">{l.desc}</td>
                <td className="py-2 text-right tabular-nums">{l.qty}</td>
                <td className="py-2 text-right tabular-nums">{l.unit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="mt-5 flex items-baseline justify-between border-t border-[color:var(--color-line)] pt-4">
        <span className="text-sm text-[color:var(--color-muted)]">Total</span>
        <span className="text-2xl font-semibold tabular-nums">{formatUsdc(props.amountUnits)} USDC</span>
      </div>
    </article>
  );
}
