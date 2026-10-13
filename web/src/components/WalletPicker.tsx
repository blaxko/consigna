import { createContext, useContext, useState, type ReactNode } from "react";
import { Dialog, Heading, Modal, ModalOverlay } from "react-aria-components";
import { useAccount, useConnect, useConnectors, useDisconnect, useReadContract, useSwitchChain, type Connector } from "wagmi";
import type { CreateConnectorFn } from "wagmi";
import { Button } from "@/components/base/buttons/button";
import { ARC_CHAIN_ID, USDC_ADDRESS } from "../lib/chain.ts";
import { erc20Abi } from "../lib/abi.ts";
import { formatUsdc, shortAddress } from "../lib/format.ts";
import { ensureArc, hasInjectedWallet } from "../lib/arc-wallet.ts";
import { COPY, isUserRejection } from "../lib/invoice-logic.ts";
import { WALLETCONNECT_PROJECT_ID } from "../lib/wagmi.ts";

type Ctx = { open: () => void };
const WalletPickerContext = createContext<Ctx>({ open: () => undefined });

/** Any "Connect wallet" control calls this. One picker serves the header and both app pages. */
export const useWalletPicker = () => useContext(WalletPickerContext);

type ConnectArg = Connector | CreateConnectorFn;

const WC_NO_ARC = "This wallet doesn't support Arc yet. Try MetaMask, or open this page in MetaMask's browser.";
const CONNECT_FAILED = "Couldn't connect to that wallet. Try again, or pick another.";

export function WalletPickerProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  return (
    <WalletPickerContext.Provider value={{ open: () => setOpen(true) }}>
      {children}
      <WalletPicker isOpen={isOpen} onOpenChange={setOpen} />
    </WalletPickerContext.Provider>
  );
}

const isMobile = () => typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

// Opens this page inside MetaMask's in-app browser. Host and path only: the #d= fragment carries invoice details and stays on this device.
const metaMaskAppLink = () => `https://metamask.app.link/dapp/${window.location.host}${window.location.pathname}`;

function WalletPicker({ isOpen, onOpenChange }: { isOpen: boolean; onOpenChange: (open: boolean) => void }) {
  const { address, chainId, isConnected } = useAccount();
  const connectors = useConnectors();
  const { connectAsync, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChainAsync } = useSwitchChain();
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState<string | undefined>();

  const balance = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: ARC_CHAIN_ID,
    query: { enabled: Boolean(address) && chainId === ARC_CHAIN_ID },
  });

  // Injected wallets discovered via EIP-6963, listed by their own name and icon. Fall back to window.ethereum if none are discovered.
  const discovered = connectors.filter((c) => c.type === "injected" && c.id !== "injected");
  const browserFallback = discovered.length === 0 && hasInjectedWallet() ? connectors.filter((c) => c.id === "injected") : [];
  const hasInjectedMetaMask = discovered.some((c) => c.id === "io.metamask");

  function close() {
    setError(undefined);
    onOpenChange(false);
  }

  /** `connector` is a connector instance or a factory. Wagmi sets up a factory on first use. */
  async function connectWith(connector: ConnectArg, label: string) {
    setError(undefined);
    setBusy(label);
    let connected = false;
    try {
      await connectAsync({ connector });
      connected = true;
      await ensureArc(switchChainAsync);
      close();
    } catch (e) {
      if (isUserRejection(e)) return;
      if (!connected) setError(CONNECT_FAILED);
      else setError(label === "WalletConnect" ? WC_NO_ARC : COPY.addArc);
    } finally {
      setBusy(undefined);
    }
  }

  // MetaMask SDK and WalletConnect are imported only when the user picks them, so they stay out of the entry bundle.
  async function connectLazy(kind: "metamask" | "walletconnect") {
    setError(undefined);
    setBusy(kind === "metamask" ? "MetaMask" : "WalletConnect");
    try {
      const mod = await import("../lib/wallet-connectors.ts");
      const connector = kind === "metamask" ? mod.metaMaskSdk() : mod.walletConnectSdk();
      setBusy(undefined);
      await connectWith(connector, kind === "metamask" ? "MetaMask" : "WalletConnect");
    } catch {
      setBusy(undefined);
      setError(CONNECT_FAILED);
    }
  }

  const onArc = chainId === ARC_CHAIN_ID;

  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) setError(undefined);
        onOpenChange(open);
      }}
      isDismissable
      className="fixed inset-0 z-50 flex items-end justify-center bg-[rgb(20_18_43/0.35)] p-0 sm:items-center sm:p-4"
    >
      <Modal className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-6 text-[color:var(--color-ink)] shadow-xl sm:max-w-md sm:rounded-2xl">
        <Dialog className="flex flex-col gap-5 outline-none">
          {isConnected && address ? (
            <>
              <Heading slot="title" className="font-display text-xl font-bold">
                Account
              </Heading>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div className="col-span-2">
                  <dt className="text-[color:var(--color-muted)]">Address</dt>
                  <dd className="font-mono" title={address}>{shortAddress(address)}</dd>
                </div>
                <div>
                  <dt className="text-[color:var(--color-muted)]">Network</dt>
                  <dd>{onArc ? "Arc (5042)" : "Not Arc"}</dd>
                </div>
                <div>
                  <dt className="text-[color:var(--color-muted)]">USDC balance</dt>
                  <dd className="font-mono tabular-nums">
                    {onArc && balance.data !== undefined ? `${formatUsdc(balance.data as bigint)} USDC` : "—"}
                  </dd>
                </div>
              </dl>
              {error && <p role="alert" className="text-sm font-medium text-red-700">{error}</p>}
              <div className="flex flex-wrap gap-3">
                {!onArc && (
                  <Button size="md" color="primary" isLoading={isPending} onClick={() => ensureArc(switchChainAsync).catch((e) => setError((e as Error).message))}>
                    Switch to Arc
                  </Button>
                )}
                <Button
                  size="md"
                  color="secondary"
                  onClick={() => {
                    disconnect();
                    close();
                  }}
                >
                  Disconnect
                </Button>
              </div>
            </>
          ) : (
            <>
              <Heading slot="title" className="font-display text-xl font-bold">
                Connect wallet
              </Heading>
              <p className="text-sm text-[color:var(--color-muted)]">Use Arc mainnet (chain 5042). Pick a wallet.</p>

              <ul className="flex flex-col gap-2">
                {[...discovered, ...browserFallback].map((c) => (
                  <WalletRow
                    key={c.uid}
                    name={c.name}
                    icon={c.icon}
                    busy={busy === c.name}
                    disabled={busy !== undefined}
                    onClick={() => connectWith(c, c.name)}
                  />
                ))}
                {!hasInjectedMetaMask && (
                  <WalletRow name="MetaMask" busy={busy === "MetaMask"} disabled={busy !== undefined} onClick={() => connectLazy("metamask")} />
                )}
                {WALLETCONNECT_PROJECT_ID && (
                  <WalletRow
                    name="WalletConnect"
                    detail={isMobile() ? "Wallet apps" : "QR code"}
                    busy={busy === "WalletConnect"}
                    disabled={busy !== undefined}
                    onClick={() => connectLazy("walletconnect")}
                  />
                )}
              </ul>

              {isMobile() && (
                <a
                  href={metaMaskAppLink()}
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-[color:var(--color-line)] px-4 text-sm font-semibold"
                >
                  Open in MetaMask app
                </a>
              )}

              {error && <p role="alert" className="text-sm font-medium text-red-700">{error}</p>}
            </>
          )}
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}

function WalletRow({
  name,
  icon,
  detail,
  busy,
  disabled,
  onClick,
}: {
  name: string;
  icon?: string;
  detail?: string;
  busy: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="flex min-h-11 w-full items-center gap-3 rounded-xl border border-[color:var(--color-line)] px-4 py-3 text-left font-medium transition duration-100 ease-linear hover:bg-[rgb(105_65_198/0.06)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {icon ? (
          <img src={icon} alt="" width={28} height={28} className="size-7 rounded-md" />
        ) : (
          <span aria-hidden="true" className="flex size-7 items-center justify-center rounded-md bg-[color:var(--color-accent)] text-xs font-bold text-white">
            {name.slice(0, 1)}
          </span>
        )}
        <span className="flex-1">{name}</span>
        <span className="text-xs text-[color:var(--color-muted)]">{busy ? "Connecting…" : detail}</span>
      </button>
    </li>
  );
}
