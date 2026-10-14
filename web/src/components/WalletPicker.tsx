import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Dialog, Heading, Modal, ModalOverlay } from "react-aria-components";
import { Wallet01 } from "@untitledui/icons";
import { useAccount, useConnect, useConnectors, useDisconnect, useReadContract, useSwitchChain, type Connector, type CreateConnectorFn } from "wagmi";
import { getAccount, reconnect } from "wagmi/actions";
import { Button } from "@/components/base/buttons/button";
import { ARC_CHAIN_ID, USDC_ADDRESS } from "../lib/chain.ts";
import { erc20Abi } from "../lib/abi.ts";
import { formatUsdc, shortAddress } from "../lib/format.ts";
import { ensureArc, hasInjectedWallet } from "../lib/arc-wallet.ts";
import { COPY, isUserRejection } from "../lib/invoice-logic.ts";
import { WALLETCONNECT_PROJECT_ID, wagmiConfig } from "../lib/wagmi.ts";

type Ctx = { open: () => void };
const WalletPickerContext = createContext<Ctx>({ open: () => undefined });

/** Any "Connect wallet" control calls this. One picker serves the header and both app pages. */
export const useWalletPicker = () => useContext(WalletPickerContext);

type ConnectArg = Connector | CreateConnectorFn;

const WC_NO_ARC = "This wallet doesn't support Arc yet. Try MetaMask, or open this page in MetaMask's browser.";
const CONNECT_FAILED = "Couldn't connect to that wallet. Try again, or pick another.";

// Connector ids of the lazy connectors (see wallet-connectors.ts). Wagmi persists the id under "recentConnectorId".
const LAZY_ID_TO_KIND: Record<string, "metamask" | "walletconnect"> = {
  metaMaskSDK: "metamask",
  walletConnect: "walletconnect",
};

export function WalletPickerProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  // Fetch the connector chunk once the page is idle, so a tap on "Connect wallet" does not wait for the download.
  useEffect(() => {
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1500));
    const id = idle(() => void prefetchWalletConnectors());
    return () => {
      if (typeof id === "number" && window.cancelIdleCallback) window.cancelIdleCallback(id);
    };
  }, []);
  // After first paint, restore a MetaMask SDK or WalletConnect session. Those connectors are not in the config, so wagmi's own reconnect skips them.
  useEffect(() => {
    const timer = window.setTimeout(() => void reconnectLazy(), 0);
    return () => window.clearTimeout(timer);
  }, []);
  return (
    <WalletPickerContext.Provider value={{ open: () => setOpen(true) }}>
      {children}
      <WalletPicker isOpen={isOpen} onOpenChange={setOpen} />
    </WalletPickerContext.Provider>
  );
}

let connectorsChunk: Promise<typeof import("../lib/wallet-connectors.ts")> | undefined;
/** Starts the MetaMask and WalletConnect chunk once. Called on idle, and on hover or touch of "Connect wallet". */
export function prefetchWalletConnectors() {
  connectorsChunk ??= import("../lib/wallet-connectors.ts");
  return connectorsChunk;
}

async function reconnectLazy() {
  let recent: unknown;
  try {
    recent = await wagmiConfig.storage?.getItem("recentConnectorId");
  } catch {
    return;
  }
  const kind = typeof recent === "string" ? LAZY_ID_TO_KIND[recent] : undefined;
  if (!kind || getAccount(wagmiConfig).isConnected) return;
  if (kind === "walletconnect" && !WALLETCONNECT_PROJECT_ID) return;
  try {
    const mod = await prefetchWalletConnectors();
    // wagmi's own on-load reconnect guards against overlap and returns at once while it runs. Wait for it to finish first.
    for (let i = 0; i < 50 && ["reconnecting", "connecting"].includes(wagmiConfig.state.status); i++) {
      await new Promise((r) => setTimeout(r, 100));
    }
    const connector = kind === "metamask" ? mod.metaMaskConnector() : mod.walletConnectConnector();
    await reconnect(wagmiConfig, { connectors: [connector] });
  } catch {
    // Silent. The user can connect again from the picker.
  }
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
  const injectedRows = [...discovered, ...browserFallback];
  const hasInjectedMetaMask = discovered.some((c) => c.id === "io.metamask");

  function close() {
    setError(undefined);
    onOpenChange(false);
  }

  /**
   * `connector` is a connector instance or a factory. Wagmi sets up a factory on first use.
   * Connected state is shown at once: the picker closes as soon as wagmi reports the connection.
   * The Arc switch runs after that. If it fails, the picker reopens on the connected view with the error.
   */
  async function connectWith(connector: ConnectArg, label: string) {
    setError(undefined);
    setBusy(label);
    let result: { chainId: number };
    try {
      result = await connectAsync({ connector });
    } catch (e) {
      if (!isUserRejection(e)) setError(CONNECT_FAILED);
      setBusy(undefined);
      return;
    }
    setBusy(undefined);
    close();
    if (result.chainId === ARC_CHAIN_ID) return;
    try {
      await ensureArc(switchChainAsync);
    } catch {
      onOpenChange(true);
      setError(label === "WalletConnect" ? WC_NO_ARC : COPY.addArc);
    }
  }

  // MetaMask SDK and WalletConnect are imported only when the user picks them, so they stay out of the entry bundle.
  async function connectLazy(kind: "metamask" | "walletconnect") {
    const label = kind === "metamask" ? "MetaMask" : "WalletConnect";
    setError(undefined);
    setBusy(label);
    let connector: CreateConnectorFn;
    try {
      const mod = await prefetchWalletConnectors();
      connector = kind === "metamask" ? mod.metaMaskConnector() : mod.walletConnectConnector();
    } catch {
      setBusy(undefined);
      setError(CONNECT_FAILED);
      return;
    }
    await connectWith(connector, label);
  }

  // Inside a wallet's in-app browser (an injected provider on mobile), connect straight away. No picker.
  useEffect(() => {
    const first = injectedRows[0];
    if (isOpen && !isConnected && isMobile() && first) void connectWith(first, first.name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

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
                {injectedRows.map((c) => (
                  <WalletRow
                    key={c.uid}
                    name={c.name}
                    logo={c.icon}
                    busy={busy === c.name}
                    disabled={busy !== undefined}
                    onClick={() => connectWith(c, c.name)}
                  />
                ))}
                {!hasInjectedMetaMask && (
                  <WalletRow
                    name="MetaMask"
                    logo="/wallets/metamask.svg"
                    busy={busy === "MetaMask"}
                    disabled={busy !== undefined}
                    onClick={() => connectLazy("metamask")}
                  />
                )}
                {WALLETCONNECT_PROJECT_ID && (
                  <WalletRow
                    name="WalletConnect"
                    logo="/wallets/walletconnect.svg"
                    detail={isMobile() ? "Wallet apps" : "QR code"}
                    busy={busy === "WalletConnect"}
                    disabled={busy !== undefined}
                    onClick={() => connectLazy("walletconnect")}
                  />
                )}
              </ul>

              {isMobile() && (
                <p className="text-sm text-[color:var(--color-muted)]">
                  After approving in MetaMask, return to this tab if it doesn't switch back automatically.
                </p>
              )}
              {error && <p role="alert" className="text-sm font-medium text-red-700">{error}</p>}
              {isMobile() && (
                <a
                  href={metaMaskAppLink()}
                  aria-label="Prefer MetaMask's built-in browser? Opens this page in the MetaMask app's browser."
                  className="self-start text-sm text-[color:var(--color-muted)] underline underline-offset-2"
                >
                  Prefer MetaMask's built-in browser?
                </a>
              )}
            </>
          )}
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}

function WalletRow({
  name,
  logo,
  detail,
  busy,
  disabled,
  onClick,
}: {
  name: string;
  logo?: string;
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
        {logo ? (
          <img src={logo} alt="" width={28} height={28} className="size-7 shrink-0 rounded-md" />
        ) : (
          <Wallet01 aria-hidden="true" size={28} className="size-7 shrink-0 text-[color:var(--color-muted)]" />
        )}
        <span className="flex-1">{name}</span>
        <span className="text-xs text-[color:var(--color-muted)]">{busy ? "Connecting…" : detail}</span>
      </button>
    </li>
  );
}
