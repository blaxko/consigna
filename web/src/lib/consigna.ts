import {
  decodeErrorResult,
  encodeFunctionData,
  parseGwei,
  type Abi,
  type Address,
  type Hex,
  type PublicClient,
  type WalletClient,
} from "viem";
import { consignaAbi, erc20Abi } from "./abi.ts";
import { CONSIGNA_ADDRESS, USDC_ADDRESS } from "./chain.ts";

export const STATUS_NAMES = ["none", "open", "paid", "cancelled"] as const;
export type InvoiceStatus = (typeof STATUS_NAMES)[number];

export type Invoice = {
  id: Hex;
  issuer: Address;
  token: Address;
  amount: bigint; // 6-decimal units
  status: InvoiceStatus;
  payer: Address;
  createdAt: number;
  paidAt: number;
  paidBlock: bigint;
  detailsHash: Hex;
  ref: string;
};

// Raw struct as viem returns it (uint64 fields are numbers, uint96 is bigint).
type RawInvoice = {
  issuer: Address;
  token: Address;
  amount: bigint;
  status: number;
  payer: Address;
  createdAt: number | bigint;
  paidAt: number | bigint;
  paidBlock: number | bigint;
  detailsHash: Hex;
  ref: string;
};

// PRD NFR-P3 and CLAUDE.md §2: Multicall batches, and eth_getLogs stays block-scoped. Page size keeps calls small.
const PAGE = 100;
const MAX_FEE_FLOOR = parseGwei("20"); // mempool floor, CLAUDE.md §2 / docs.arc.io gas page
const PRIORITY_FEE = parseGwei("1");
const DUPLICATE_GAS = 120_000n; // CLAUDE.md R8: fixed gas, no simulation
const CONFIRM_TIMEOUT_MS = 30_000; // CLAUDE.md R10 / PRD NFR-R3

function toInvoice(id: Hex, r: RawInvoice): Invoice {
  return {
    id,
    issuer: r.issuer,
    token: r.token,
    amount: r.amount,
    status: STATUS_NAMES[r.status] ?? "none",
    payer: r.payer,
    createdAt: Number(r.createdAt),
    paidAt: Number(r.paidAt),
    paidBlock: BigInt(r.paidBlock),
    detailsHash: r.detailsHash,
    ref: r.ref,
  };
}

/** Thrown when no receipt arrives in time. The caller shows "not confirmed" and re-reads. It never resends. */
export class NotConfirmedError extends Error {
  constructor(public readonly hash: Hex) {
    super(`Not confirmed yet: ${hash}`);
  }
}

export async function idFor(client: PublicClient, issuer: Address, ref: string): Promise<Hex> {
  return (await client.readContract({
    address: CONSIGNA_ADDRESS,
    abi: consignaAbi,
    functionName: "idFor",
    args: [issuer, ref],
  })) as Hex;
}

export async function readInvoice(client: PublicClient, id: Hex): Promise<Invoice> {
  const raw = (await client.readContract({
    address: CONSIGNA_ADDRESS,
    abi: consignaAbi,
    functionName: "getInvoice",
    args: [id],
  })) as RawInvoice;
  return toInvoice(id, raw);
}

/** Every invoice of an issuer: ids via invoicesOf pages, then Multicall3 batches of getInvoice. */
export async function listInvoices(client: PublicClient, issuer: Address): Promise<Invoice[]> {
  const count = Number(
    await client.readContract({ address: CONSIGNA_ADDRESS, abi: consignaAbi, functionName: "invoiceCount", args: [issuer] }),
  );
  const ids: Hex[] = [];
  for (let offset = 0; offset < count; offset += PAGE) {
    const page = (await client.readContract({
      address: CONSIGNA_ADDRESS,
      abi: consignaAbi,
      functionName: "invoicesOf",
      args: [issuer, BigInt(offset), BigInt(PAGE)],
    })) as Hex[];
    ids.push(...page);
  }
  if (ids.length === 0) return [];

  const raws = (await client.multicall({
    allowFailure: false,
    contracts: ids.map((id) => ({
      address: CONSIGNA_ADDRESS,
      abi: consignaAbi,
      functionName: "getInvoice" as const,
      args: [id] as const,
    })),
  })) as RawInvoice[];
  return raws.map((r, i) => toInvoice(ids[i], r));
}

/** True if this issuer has never used the ref. Cancelled refs stay used (RefAlreadyUsed). */
export async function isRefAvailable(client: PublicClient, issuer: Address, ref: string): Promise<boolean> {
  const id = await idFor(client, issuer, ref);
  return (await readInvoice(client, id)).status === "none";
}

export async function allowanceOf(client: PublicClient, owner: Address): Promise<bigint> {
  return (await client.readContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "allowance",
    args: [owner, CONSIGNA_ADDRESS],
  })) as bigint;
}

/** Fee settings: maxFeePerGas = max(20 gwei floor, 2 x base fee + tip). Never below the floor. */
export async function arcFees(client: PublicClient) {
  const block = await client.getBlock({ blockTag: "latest" });
  const base = block.baseFeePerGas ?? MAX_FEE_FLOOR;
  const headroom = base * 2n + PRIORITY_FEE;
  return {
    maxFeePerGas: headroom > MAX_FEE_FLOOR ? headroom : MAX_FEE_FLOOR,
    maxPriorityFeePerGas: PRIORITY_FEE,
  };
}

export async function create(
  client: PublicClient,
  wallet: WalletClient,
  args: { ref: string; token: Address; amount: bigint; detailsHash: Hex },
): Promise<Hex> {
  const account = wallet.account;
  if (!account) throw new Error("No wallet account");
  return wallet.writeContract({
    account,
    chain: wallet.chain,
    address: CONSIGNA_ADDRESS,
    abi: consignaAbi,
    functionName: "createInvoice",
    args: [args.ref, args.token, args.amount, args.detailsHash],
    ...(await arcFees(client)),
  });
}

/** Approves exactly `amount` for Consigna. Never unlimited (PRD NFR-S4). */
export async function approveExact(client: PublicClient, wallet: WalletClient, amount: bigint): Promise<Hex> {
  const account = wallet.account;
  if (!account) throw new Error("No wallet account");
  return wallet.writeContract({
    account,
    chain: wallet.chain,
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "approve",
    args: [CONSIGNA_ADDRESS, amount],
    ...(await arcFees(client)),
  });
}

export async function pay(client: PublicClient, wallet: WalletClient, id: Hex): Promise<Hex> {
  const account = wallet.account;
  if (!account) throw new Error("No wallet account");
  return wallet.writeContract({
    account,
    chain: wallet.chain,
    address: CONSIGNA_ADDRESS,
    abi: consignaAbi,
    functionName: "pay",
    args: [id],
    ...(await arcFees(client)),
  });
}

/**
 * Sends a duplicate pay WITHOUT simulation, so the failed transaction lands on-chain (CLAUDE.md §9).
 * Gas is fixed at 120,000. Used only by the deliberate duplicate demo, never for a real payment.
 */
export async function payUnsimulated(client: PublicClient, wallet: WalletClient, id: Hex): Promise<Hex> {
  const account = wallet.account;
  if (!account) throw new Error("No wallet account");
  return wallet.sendTransaction({
    account,
    chain: wallet.chain,
    to: CONSIGNA_ADDRESS,
    data: encodeFunctionData({ abi: consignaAbi, functionName: "pay", args: [id] }),
    gas: DUPLICATE_GAS,
    ...(await arcFees(client)),
  });
}

export async function cancel(client: PublicClient, wallet: WalletClient, id: Hex): Promise<Hex> {
  const account = wallet.account;
  if (!account) throw new Error("No wallet account");
  return wallet.writeContract({
    account,
    chain: wallet.chain,
    address: CONSIGNA_ADDRESS,
    abi: consignaAbi,
    functionName: "cancel",
    args: [id],
    ...(await arcFees(client)),
  });
}

/** Waits up to 30 s. On timeout it throws NotConfirmedError. The caller re-reads state, never resends. */
export async function waitForConfirmation(client: PublicClient, hash: Hex) {
  try {
    return await client.waitForTransactionReceipt({ hash, timeout: CONFIRM_TIMEOUT_MS });
  } catch {
    throw new NotConfirmedError(hash);
  }
}

/** Pulls the first hex revert payload out of a viem/RPC error chain. */
export function extractRevertData(e: unknown): Hex | undefined {
  let cur: any = e;
  for (let depth = 0; cur && depth < 10; depth++) {
    if (typeof cur.data === "string" && /^0x[0-9a-fA-F]*$/.test(cur.data)) return cur.data as Hex;
    if (typeof cur.data?.data === "string" && /^0x[0-9a-fA-F]*$/.test(cur.data.data)) return cur.data.data as Hex;
    cur = cur.cause;
  }
  return undefined;
}

/** Decodes custom-error revert data against the Consigna ABI. Returns undefined if it can't match. */
export function decodeRevertData(data: Hex, abi: Abi): { errorName: string; args: readonly unknown[] } | undefined {
  try {
    const d = decodeErrorResult({ abi, data });
    return { errorName: d.errorName, args: d.args ?? [] };
  } catch {
    return undefined;
  }
}

/**
 * Explains a failed transaction: re-runs the same calldata with eth_call at the failed tx's block.
 * Falls back to "unknown" if the call doesn't revert or the data can't be decoded.
 */
export async function decodeRevert(
  client: PublicClient,
  args: { from: Address; to: Address; data: Hex; blockNumber: bigint },
): Promise<{ errorName: string; args: readonly unknown[] } | { errorName: "unknown"; message: string }> {
  try {
    await client.call({ account: args.from, to: args.to, data: args.data, blockNumber: args.blockNumber });
    return { errorName: "unknown", message: "The call did not revert at that block." };
  } catch (e) {
    const raw = extractRevertData(e);
    const decoded = raw ? decodeRevertData(raw, consignaAbi) : undefined;
    if (decoded) return decoded;
    return { errorName: "unknown", message: (e as Error).message?.split("\n")[0] ?? "Transaction failed on-chain" };
  }
}
