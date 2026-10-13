import { defineChain, fallback, http, type Address } from "viem";

// Arc MAINNET only (CLAUDE.md §2). There is no testnet chain anywhere in this app.
export const ARC_CHAIN_ID = 5042;
export const EXPLORER = "https://explorer.arc.io";

// Fallback order from PRD §6 / CLAUDE.md §2: Arc public, then QuickNode, then dRPC.
export const RPC_URLS = [
  "https://rpc.mainnet.arc.io",
  "https://rpc.quicknode.mainnet.arc.io",
  "https://rpc.drpc.mainnet.arc.io",
] as const;

export const USDC_ADDRESS: Address = "0x3600000000000000000000000000000000000000"; // 6-decimal ERC-20 view
export const EURC_ADDRESS: Address = "0xbEf5f6d51CB62b58e6A8f77868681825C6fe21c1";
export const MULTICALL3_ADDRESS: Address = "0xcA11bde05977b3631167028862bE2a173976CA11";

// Consigna deploy block (deployments/arc.json). The creation-tx lookup for CSV export starts here, never earlier.
export const DEPLOY_BLOCK = 25736521n;

// Vite injects import.meta.env at build time. Node tests don't have it, so read it defensively.
const env = (import.meta as { env?: Record<string, string | undefined> }).env ?? {};
export const CONSIGNA_ADDRESS = (env.VITE_CONSIGNA_ADDRESS ?? "") as Address;

export const arc = defineChain({
  id: ARC_CHAIN_ID,
  name: "Arc",
  // Native balance is USDC with 18 decimals. Use it for gas only, never for amounts.
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: [...RPC_URLS] } },
  blockExplorers: { default: { name: "Arc Explorer", url: EXPLORER } },
  contracts: { multicall3: { address: MULTICALL3_ADDRESS } },
});

export const arcTransport = fallback(RPC_URLS.map((url) => http(url)));
