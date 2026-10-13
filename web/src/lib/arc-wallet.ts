import { ARC_CHAIN_ID, EXPLORER, RPC_URLS } from "./chain.ts";
import { COPY, isUserRejection } from "./invoice-logic.ts";

// Shared wallet actions for the header and both pages. Chain 5042 only.

type EthProvider = { request(args: { method: string; params?: unknown[] }): Promise<unknown> };
const injected = () => (window as unknown as { ethereum?: EthProvider }).ethereum;

/** E1: wagmi always lists the injected connector, so detect a real provider instead. */
export function hasInjectedWallet(): boolean {
  return Boolean(injected());
}

/** Adds Arc to the wallet (EIP-3085). Called when a switch fails with 4902 (chain not added). */
export async function addArc(): Promise<void> {
  const p = injected();
  if (!p) throw new Error(COPY.noWallet);
  await p.request({
    method: "wallet_addEthereumChain",
    params: [
      {
        chainId: `0x${ARC_CHAIN_ID.toString(16)}`,
        chainName: "Arc",
        nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
        rpcUrls: [...RPC_URLS],
        blockExplorerUrls: [EXPLORER],
      },
    ],
  });
}

/**
 * Switches the wallet to Arc. Adds Arc on 4902. A user rejection (4001) returns silently (PRD E3).
 * Any other error is rethrown for the caller to show.
 */
export async function ensureArc(switchChainAsync: (args: { chainId: number }) => Promise<unknown>): Promise<void> {
  try {
    await switchChainAsync({ chainId: ARC_CHAIN_ID });
  } catch (e) {
    if (isUserRejection(e)) return; // E3: silent
    const code = (e as { code?: unknown; cause?: { code?: unknown } })?.code ?? (e as { cause?: { code?: unknown } })?.cause?.code;
    try {
      if (code !== 4902) throw e;
      await addArc();
      await switchChainAsync({ chainId: ARC_CHAIN_ID });
    } catch (inner) {
      if (isUserRejection(inner)) return;
      throw new Error(COPY.addArc); // E2: switch and add both failed
    }
  }
}
