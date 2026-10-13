import type { Hex } from "viem";
import { EURC_ADDRESS, EXPLORER, USDC_ADDRESS } from "./chain.ts";
import { formatUsdc, formatUtc, shortAddress } from "./format.ts";
import type { CsvRow } from "./csv.ts";
import type { Invoice } from "./consigna.ts";

// Pure rules for Flow C (duplicate card), Flow D (ledger and CSV) and the cancel confirmation. PRD §5.4, §5.5, §7.4.

export type Filter = "all" | "open" | "paid" | "cancelled";

/** Largest inclusive block span per eth_getLogs call on the public RPC (CLAUDE.md §2, error -32012). */
export const MAX_BLOCK_SPAN = 9_999n;

/** HH:MM:SS in UTC, as in the PRD red card ("at 10:42:07"). */
export function formatClock(unixSeconds: number): string {
  const d = new Date(unixSeconds * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`;
}

/** PRD 5.4 step 3: "Blocked by contract: AlreadyPaid — paid by 0xab…12 at 10:42:07". */
export function blockedCopy(payer: string, paidAtSeconds: number): string {
  return `Blocked by contract: AlreadyPaid — paid by ${shortAddress(payer)} at ${formatClock(paidAtSeconds)}`;
}

/** PRD 5.5 step 1: the confirm text before a cancel. */
export function cancelConfirmCopy(ref: string): string {
  return `Cancel ${ref}? It can never be paid or reused.`;
}

export function filterInvoices(list: Invoice[], filter: Filter): Invoice[] {
  return filter === "all" ? list : list.filter((i) => i.status === filter);
}

/** Paid total (sum of paid amounts) and outstanding total (sum of open amounts), in 6-decimal units. */
export function totals(list: Invoice[]): { paid: bigint; outstanding: bigint } {
  let paid = 0n;
  let outstanding = 0n;
  for (const i of list) {
    if (i.status === "paid") paid += i.amount;
    if (i.status === "open") outstanding += i.amount;
  }
  return { paid, outstanding };
}

function tokenSymbol(token: string): string {
  if (token.toLowerCase() === USDC_ADDRESS.toLowerCase()) return "USDC";
  if (token.toLowerCase() === EURC_ADDRESS.toLowerCase()) return "EURC";
  return token;
}

/**
 * PRD 7.4 rows. Paid rows use the paid time and the paid transaction. Open and cancelled rows use the
 * created time and the creation transaction, as the PRD requires.
 */
export function csvRows(
  list: Invoice[],
  paidTx: Record<string, Hex>,
  createdTx: Record<string, Hex>,
): CsvRow[] {
  return list.map((i) => {
    const isPaid = i.status === "paid";
    const tx = isPaid ? paidTx[i.id] : createdTx[i.id];
    return {
      date_utc: formatUtc(isPaid ? i.paidAt : i.createdAt),
      ref: i.ref,
      status: i.status,
      amount: formatUsdc(i.amount),
      token: tokenSymbol(i.token),
      payer: isPaid ? i.payer : "",
      issuer: i.issuer,
      invoice_id: i.id,
      tx_hash: tx ?? "",
      explorer_url: tx ? `${EXPLORER}/tx/${tx}` : "",
    };
  });
}

/** consigna-<issuer-short>-<YYYYMMDD>.csv, with the date in UTC. */
export function csvFilename(issuer: string, now: Date): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `consigna-${issuer.slice(0, 10)}-${y}${m}${d}.csv`;
}

/**
 * Splits [from, to] (inclusive) into inclusive chunks of at most MAX_BLOCK_SPAN blocks, in order.
 * Used only for the creation-transaction lookup at CSV export. It never runs on a normal page load.
 */
export function chunkRanges(from: bigint, to: bigint): Array<[bigint, bigint]> {
  const out: Array<[bigint, bigint]> = [];
  for (let a = from; a <= to; ) {
    const b = a + MAX_BLOCK_SPAN - 1n < to ? a + MAX_BLOCK_SPAN - 1n : to;
    out.push([a, b]);
    a = b + 1n;
  }
  return out;
}
