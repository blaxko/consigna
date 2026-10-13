import type { Hex } from "viem";
import { formatUsdc, parseUsdc, shortAddress } from "./format.ts";
import { fromFragment, hashDetails, toFragment, type Details } from "./details.ts";

// Pure rules and copy for Flow A (/new) and Flow B (/i/:id). PRD §5.2, §5.3, §8. No chain or DOM access here.

const REF_CHARS = /^[A-Za-z0-9\-_./]+$/;
const PAY_MARGIN = 50_000n; // 0.05 USDC, PRD R6: amount + 0.05 required before Pay
const NATIVE_TO_UNITS6 = 1_000_000_000_000n; // 18-decimal native gas amount to 6-decimal USDC

/** PRD 5.2 Flow A validation: 1-32 chars, [A-Za-z0-9-_./]. Returns the error text, or null if valid. */
export function validateRef(ref: string): string | null {
  if (ref.length === 0) return "Enter a reference.";
  if (ref.length > 32) return "References can be up to 32 characters.";
  if (!REF_CHARS.test(ref)) return "Use letters, numbers, and - _ . / only.";
  return null;
}

/** Sum of qty x unit price, in 6-decimal units. Throws if any unit price is invalid or the total is zero. */
export function lineTotal(items: { qty: number; unit: string }[]): bigint {
  let total = 0n;
  for (const item of items) total += BigInt(item.qty) * parseUsdc(item.unit);
  if (total <= 0n) throw new Error("Total must be greater than 0");
  return total;
}

/** PRD 5.3 step 3 and R6: the wallet needs amount + 0.05 USDC. */
export function checkBalance(balance: bigint, amount: bigint): { ok: boolean; required: bigint } {
  const required = amount + PAY_MARGIN;
  return { ok: balance >= required, required };
}

export type DetailsMatch =
  | { status: "absent" }
  | { status: "match"; details: Details }
  | { status: "mismatch" };

/**
 * PRD NFR-S7: line items from the link are display-only. They count only if their hash equals the on-chain detailsHash.
 * A missing fragment is "absent" (E10). Any malformed or non-matching fragment is "mismatch" (E9).
 */
export function matchDetails(fragment: string | null, onchainHash: Hex): DetailsMatch {
  if (!fragment) return { status: "absent" };
  let details: Details;
  try {
    details = fromFragment(fragment);
  } catch {
    return { status: "mismatch" };
  }
  return hashDetails(details).toLowerCase() === onchainHash.toLowerCase()
    ? { status: "match", details }
    : { status: "mismatch" };
}

/** PRD 5.2 step 5 / 5.3: the link is origin + /i/<id> + #d=<fragment>. The fragment is never sent to a server. */
export function paymentLink(origin: string, id: Hex, details: Details): string {
  return `${origin}/i/${id}#d=${toFragment(details)}`;
}

/** PRD 5.3 step 6: "Paid · settled in 0.6 s". Takes milliseconds from broadcast to receipt. */
export function settledLabel(ms: number): string {
  return `Paid · settled in ${(ms / 1000).toFixed(1)} s`;
}

/** PRD 5.3 step 6: "fee 0.01 USDC". Takes gas in 18-decimal native units. */
export function feeLabel(native18: bigint): string {
  return `fee ${formatUsdc(native18 / NATIVE_TO_UNITS6)} USDC`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Oct 14, 10:42" in UTC, the PRD short time form. */
export function formatShortTime(unixSeconds: number): string {
  const d = new Date(unixSeconds * 1000);
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${hh}:${mm}`;
}

/** PRD E4: "You need 5.05 USDC on Arc (5.00 + fees). You have 2.10." */
export function insufficientCopy(amount: bigint, balance: bigint): string {
  return `You need ${formatUsdc(amount + PAY_MARGIN)} USDC on Arc (${formatUsdc(amount)} + fees). You have ${formatUsdc(balance)}.`;
}

/** PRD E6: "Already paid by 0xab…12 at Oct 14, 10:42". */
export function alreadyPaidCopy(payer: string, paidAtSeconds: number): string {
  return `Already paid by ${shortAddress(payer)} at ${formatShortTime(paidAtSeconds)}`;
}

/** EIP-1193 code 4001 = the user rejected the request. Return to the same step with no error banner (PRD E3). */
export function isUserRejection(e: unknown): boolean {
  const code = (e as { code?: unknown })?.code ?? (e as { cause?: { code?: unknown } })?.cause?.code;
  return code === 4001;
}

/** Exact copy from PRD §5.2, §5.3 and §8. Do not reword without updating the PRD first. */
export const COPY = {
  notFound: "No Consigna invoice with this ID on Arc mainnet.", // E8
  cancelled: "This invoice was cancelled by the issuer.", // E7
  detailsMismatch:
    "These line items don't match what the issuer recorded on-chain. Only the amount and recipient below are verified.", // E9
  noFragment: "Line items weren't included in this link.", // E10
  notConfirmed: "Not confirmed yet. View on explorer.", // E13
  refUsed: (ref: string) => `You've already used ${ref}. Pick a new reference.`, // E11
  decimals: "USDC supports up to 6 decimal places.", // E12
  noWallet: "Install a wallet to pay", // E1
  addArc: "Add Arc in your wallet: chain 5042", // E2 fallback when the switch and add both fail
  rpcDown: "Can't reach Arc right now. Retrying…", // E14
  refWarning: "Don't put personal data in the reference.", // NFR-S5
  reviewWarning: "This can't be edited after creation. You can cancel it while unpaid.", // PRD 5.2 step 3
} as const;
