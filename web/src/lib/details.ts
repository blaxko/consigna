import { keccak256, toBytes, type Hex } from "viem";
import { parseUsdc } from "./format.ts";

// The ONLY place canonical JSON lives (CLAUDE.md §3). PRD §7.4: keys in fixed order, no whitespace,
// amounts as decimal strings. The hash binds the on-chain invoice to these line items.

export const MAX_DETAILS_BYTES = 1500;

export type LineItem = { desc: string; qty: number; unit: string };
export type Details = { v: 1; client: string; due?: string; items: LineItem[]; note?: string };

const enc = new TextEncoder();

function validateItem(item: LineItem): LineItem {
  if (typeof item.desc !== "string") throw new Error("item desc must be a string");
  if (!Number.isInteger(item.qty) || item.qty <= 0) throw new Error(`qty must be a positive integer, got ${item.qty}`);
  try {
    parseUsdc(item.unit);
  } catch {
    throw new Error(`unit price is not a valid USDC amount (max 6 decimals): "${item.unit}"`);
  }
  return item;
}

/** Canonical JSON for the details. Same input data always yields the same string, whatever the key order. */
export function encodeDetails(d: Details): string {
  if (typeof d.client !== "string") throw new Error("client must be a string");
  const o: Record<string, unknown> = { v: 1, client: d.client };
  if (d.due !== undefined) o.due = d.due;
  o.items = d.items.map(validateItem).map((i) => ({ desc: i.desc, qty: i.qty, unit: i.unit }));
  if (d.note !== undefined) o.note = d.note;
  const json = JSON.stringify(o);
  if (enc.encode(json).length > MAX_DETAILS_BYTES) {
    throw new Error(`Details are over ${MAX_DETAILS_BYTES} bytes. Shorten the line items or note.`);
  }
  return json;
}

/** Validates an untrusted parsed object (from a link) and returns a normalised Details. */
export function decodeDetails(input: unknown): Details {
  const o = input as Record<string, unknown>;
  if (!o || typeof o !== "object") throw new Error("details must be an object");
  if (o.v !== 1) throw new Error(`Unsupported details version: ${String(o.v)}`);
  if (typeof o.client !== "string") throw new Error("client must be a string");
  if (!Array.isArray(o.items)) throw new Error("items must be an array");
  const items = (o.items as LineItem[]).map(validateItem);
  const out: Details = { v: 1, client: o.client, items };
  if (o.due !== undefined) out.due = String(o.due);
  if (o.note !== undefined) out.note = String(o.note);
  return out;
}

/** keccak256 of the UTF-8 canonical JSON. This is what the contract stores as detailsHash. */
export function hashDetails(d: Details): Hex {
  return keccak256(toBytes(encodeDetails(d)));
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]*$/.test(s)) throw new Error("Invalid fragment: not base64url");
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (s.length % 4)) % 4);
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

/** The URL fragment value (#d=…). Stays client-side, never sent to a server. */
export function toFragment(d: Details): string {
  return toBase64Url(enc.encode(encodeDetails(d)));
}

/** Parses a fragment from a link. Treat the result as display-only until its hash matches on-chain. */
export function fromFragment(s: string): Details {
  const bytes = fromBase64Url(s);
  if (bytes.length > MAX_DETAILS_BYTES) throw new Error(`Details are over ${MAX_DETAILS_BYTES} bytes`);
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new Error("Invalid fragment: not JSON");
  }
  return decodeDetails(parsed);
}
