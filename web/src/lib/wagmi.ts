import { createConfig } from "wagmi";
import { injected } from "wagmi/connectors";
import { arc, arcTransport } from "./chain.ts";

// Arc mainnet is the only chain in this config. No testnet is listed anywhere.
export const wagmiConfig = createConfig({
  chains: [arc],
  connectors: [injected()],
  transports: { [arc.id]: arcTransport },
  multiInjectedProviderDiscovery: true,
});
