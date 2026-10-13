import { useAccount, useConnect, useDisconnect, useReadContract, useSwitchChain } from "wagmi";
import { ARC_CHAIN_ID, EXPLORER, RPC_URLS, USDC_ADDRESS } from "../lib/chain.ts";
import { erc20Abi } from "../lib/abi.ts";
import { formatUsdc, shortAddress } from "../lib/format.ts";

type EthProvider = { request(args: { method: string; params?: unknown[] }): Promise<unknown> };
const provider = () => (window as unknown as { ethereum?: EthProvider }).ethereum;

function errorCode(e: unknown): number | undefined {
  const c = (e as { code?: unknown; cause?: { code?: unknown } })?.code ?? (e as { cause?: { code?: unknown } })?.cause?.code;
  return typeof c === "number" ? c : undefined;
}

/** Adds Arc to the wallet (EIP-3085). Used when the switch fails with 4902 (chain not added). */
async function addArc() {
  const p = provider();
  if (!p) throw new Error("No injected wallet found");
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

export function WalletButton() {
  const { address, chainId, isConnected } = useAccount();
  const { connectors, connectAsync, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChainAsync } = useSwitchChain();

  // USDC balance via ERC-20 balanceOf, 6 decimals. Never the 18-decimal native balance.
  const balance = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: ARC_CHAIN_ID,
    query: { enabled: Boolean(address) && chainId === ARC_CHAIN_ID },
  });

  async function ensureArc() {
    try {
      await switchChainAsync({ chainId: ARC_CHAIN_ID });
    } catch (e) {
      if (errorCode(e) === 4902) {
        await addArc();
        await switchChainAsync({ chainId: ARC_CHAIN_ID });
      } else if (errorCode(e) !== 4001) {
        throw e; // 4001 = user rejected: return silently, no error banner (PRD E3)
      }
    }
  }

  if (!isConnected) {
    const connector = connectors[0];
    if (!connector) {
      return <span className="text-sm text-[color:var(--color-muted)]">Install a wallet to pay</span>;
    }
    return (
      <button
        type="button"
        disabled={isPending}
        onClick={async () => {
          try {
            await connectAsync({ connector });
            await ensureArc();
          } catch (e) {
            if (errorCode(e) !== 4001) console.error(e);
          }
        }}
        className="rounded-md bg-[color:var(--color-accent)] px-3 py-1.5 text-sm font-medium text-white"
      >
        Connect wallet
      </button>
    );
  }

  const onArc = chainId === ARC_CHAIN_ID;
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="font-mono" title={address}>{shortAddress(address ?? "")}</span>
      <span className="rounded bg-gray-100 px-2 py-0.5">Arc</span>
      {onArc ? (
        <span className="tabular-nums">
          {balance.data !== undefined ? `${formatUsdc(balance.data as bigint)} USDC` : "…"}
        </span>
      ) : (
        <button type="button" onClick={() => ensureArc().catch(console.error)} className="text-[color:var(--color-accent)] underline">
          Switch to Arc
        </button>
      )}
      <button type="button" onClick={() => disconnect()} className="text-[color:var(--color-muted)] underline">
        Disconnect
      </button>
    </div>
  );
}
