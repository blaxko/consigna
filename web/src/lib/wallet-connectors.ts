import { metaMask, walletConnect } from "wagmi/connectors";
import { LIVE_URL, WALLETCONNECT_PROJECT_ID } from "./wagmi.ts";

// Loaded only through a dynamic import, when the wallet picker opens. Keeps the MetaMask SDK and WalletConnect
// out of the app's entry bundle (NFR-P4).

const ICON = `${LIVE_URL}/apple-touch-icon.png`;

/** MetaMask SDK: QR on desktop, deep link into the MetaMask app on mobile. */
export function metaMaskSdk() {
  return metaMask({ dappMetadata: { name: "Consigna", url: LIVE_URL, iconUrl: ICON } });
}

/** WalletConnect: QR modal on desktop, wallet deep links on mobile. Only call when a project id is set. */
export function walletConnectSdk() {
  return walletConnect({
    projectId: WALLETCONNECT_PROJECT_ID,
    showQrModal: true,
    metadata: {
      name: "Consigna",
      description: "One invoice. One payment. Enforced by Arc.",
      url: LIVE_URL,
      icons: [ICON],
    },
  });
}
