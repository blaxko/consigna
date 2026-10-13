import { useAccount, useConnect, useDisconnect, useReadContract, useSwitchChain } from "wagmi";
import { ARC_CHAIN_ID, USDC_ADDRESS } from "../lib/chain.ts";
import { erc20Abi } from "../lib/abi.ts";
import { formatUsdc, shortAddress } from "../lib/format.ts";
import { ensureArc, hasInjectedWallet } from "../lib/arc-wallet.ts";
import { isUserRejection } from "../lib/invoice-logic.ts";

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

  if (!isConnected) {
    const connector = connectors[0];
    if (!connector || !hasInjectedWallet()) {
      return <span className="text-sm text-[color:var(--color-muted)]">Install a wallet to pay</span>;
    }
    return (
      <button
        type="button"
        disabled={isPending}
        onClick={async () => {
          try {
            await connectAsync({ connector });
            await ensureArc(switchChainAsync);
          } catch (e) {
            if (!isUserRejection(e)) console.error(e);
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
        <button type="button" onClick={() => ensureArc(switchChainAsync).catch(console.error)} className="text-[color:var(--color-accent)] underline">
          Switch to Arc
        </button>
      )}
      <button type="button" onClick={() => disconnect()} className="text-[color:var(--color-muted)] underline">
        Disconnect
      </button>
    </div>
  );
}
