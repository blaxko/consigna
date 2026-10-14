import { metaMask, walletConnect } from "wagmi/connectors";
import { LIVE_URL, WALLETCONNECT_PROJECT_ID } from "./wagmi.ts";

// Loaded only through a dynamic import, when the wallet picker opens or a lazy session is restored. Keeps the MetaMask SDK
// and WalletConnect out of the app's entry bundle (NFR-P4).

/** The page's own origin, so local dev and the live site both give wallets a correct return URL. */
const siteOrigin = () => (typeof window !== "undefined" ? window.location.origin : LIVE_URL);

/** MetaMask SDK: QR on desktop, deep link into the MetaMask app on mobile (the connect handshake, not the in-app browser). */
export function metaMaskSdk() {
  const origin = siteOrigin();
  return metaMask({ dappMetadata: { name: "Consigna", url: origin, iconUrl: `${origin}/apple-touch-icon.png` } });
}

/** WalletConnect: QR modal on desktop, wallet deep links on mobile. Only call when a project id is set. */
export function walletConnectSdk() {
  const origin = siteOrigin();
  return walletConnect({
    projectId: WALLETCONNECT_PROJECT_ID,
    showQrModal: true,
    metadata: {
      name: "Consigna",
      description: "One invoice. One payment. Enforced by Arc.",
      url: origin,
      icons: [`${origin}/apple-touch-icon.png`],
      redirect: { universal: origin },
    },
  });
}

// One instance per kind. Each factory call builds a new connector with its own emitter and session, so connect and reconnect
// share these, which avoids two live instances with the same id.
let metaMaskInstance: ReturnType<typeof metaMaskSdk> | undefined;
let walletConnectInstance: ReturnType<typeof walletConnectSdk> | undefined;

export function metaMaskConnector() {
  metaMaskInstance ??= metaMaskSdk();
  return metaMaskInstance;
}

export function walletConnectConnector() {
  walletConnectInstance ??= walletConnectSdk();
  return walletConnectInstance;
}
