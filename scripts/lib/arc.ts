import { createPublicClient, defineChain, formatUnits, http, parseGwei, type Address, type Hex, type PublicClient } from "viem";

// Source: https://docs.arc.io/arc/references/gas-and-fees.md ("Set maxFeePerGas to at least 20 Gwei")
//         https://docs.arc.io/arc/references/evm-differences.md ("The minimum base fee is 20 Gwei")
// Note: the gas page says these values reflect Arc Testnet and may change before mainnet launch.
// Re-check the floor against the live chain before any mainnet write.

export const ARC_CHAIN_ID = 5042;
export const ARC_RPC = process.env.ARC_RPC ?? "https://rpc.mainnet.arc.io";
export const EXPLORER = "https://explorer.arc.io";

export const USDC: Address = "0x3600000000000000000000000000000000000000"; // 6-decimal ERC-20 view
export const EURC: Address = "0xbEf5f6d51CB62b58e6A8f77868681825C6fe21c1";

export const FEE_FLOOR = parseGwei("20");
export const PRIORITY_FEE = parseGwei("1");

export const arc = defineChain({
  id: ARC_CHAIN_ID,
  name: "Arc",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 }, // gas only, never used for amounts
  rpcUrls: { default: { http: [ARC_RPC] } },
  blockExplorers: { default: { name: "Arc Explorer", url: EXPLORER } },
});

export const erc20Abi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "value", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

export function publicClient(): PublicClient {
  return createPublicClient({ chain: arc, transport: http(ARC_RPC) });
}

/** Aborts unless the RPC reports chain 5042. Call before every script action. */
export async function assertArcMainnet(client: PublicClient): Promise<void> {
  const id = await client.getChainId();
  if (id !== ARC_CHAIN_ID) {
    throw new Error(`Refusing to run: RPC reports chainId ${id}, expected ${ARC_CHAIN_ID} (Arc mainnet).`);
  }
}

/** maxFeePerGas = max(20 gwei floor, 2 x latest base fee + tip). The 2x headroom absorbs base-fee moves. */
export async function getFees(client: PublicClient) {
  const block = await client.getBlock({ blockTag: "latest" });
  const base = block.baseFeePerGas ?? FEE_FLOOR;
  const twiceBase = base * 2n + PRIORITY_FEE;
  const maxFeePerGas = twiceBase > FEE_FLOOR ? twiceBase : FEE_FLOOR;
  return { maxFeePerGas, maxPriorityFeePerGas: PRIORITY_FEE };
}

/** Accepts a 32-byte private key with or without the 0x prefix (MetaMask exports omit it). Never prints the value. */
export function requireKey(name: "DEPLOYER_KEY" | "PAYER_KEY"): Hex {
  const raw = (process.env[name] ?? "").trim();
  const withPrefix = raw.startsWith("0x") ? raw : `0x${raw}`;
  if (!/^0x[0-9a-fA-F]{64}$/.test(withPrefix)) {
    throw new Error(`${name} is missing or not a 32-byte hex private key in .env (value not printed).`);
  }
  return withPrefix as Hex;
}

/** Formats a 6-decimal ERC-20 amount as USDC with 2 decimals shown, full precision kept in logs. */
export const fmtUsdc = (units6: bigint) => formatUnits(units6, 6);

/** Converts an 18-decimal native (gas) amount to 6-decimal USDC units, rounding up. */
export function nativeToUnits6Ceil(native18: bigint): bigint {
  const d = 10n ** 12n;
  return (native18 + d - 1n) / d;
}
