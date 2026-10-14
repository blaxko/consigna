import { createConfig } from "wagmi";
import { injected } from "wagmi/connectors";
import { arc, arcTransport } from "./chain.ts";

// Arc mainnet is the only chain in this config. No testnet is listed anywhere.

/** Public site URL. Fallback for wallet dapp metadata when no window is present (the live page uses its own origin). */
export const LIVE_URL = "https://consigna-production.up.railway.app";

/** WalletConnect needs a project id from cloud.reown.com. Without one, that option is hidden and the rest still works. */
export const WALLETCONNECT_PROJECT_ID = (import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ?? "") as string;

if (!WALLETCONNECT_PROJECT_ID) {
  console.warn("VITE_WALLETCONNECT_PROJECT_ID is not set. WalletConnect is hidden; injected wallets still work.");
}

// Only the injected connector (with EIP-6963 discovery) ships in the entry bundle. MetaMask SDK and WalletConnect
// load on demand from wallet-connectors.ts, when the wallet picker opens. See source-driven notes in the README.
export const wagmiConfig = createConfig({
  chains: [arc],
  connectors: [injected()],
  transports: { [arc.id]: arcTransport },
  multiInjectedProviderDiscovery: true,
});
