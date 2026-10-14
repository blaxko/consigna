import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { router } from "./router.tsx";
import { wagmiConfig } from "./lib/wagmi.ts";
import { WalletPickerProvider } from "./components/WalletPicker.tsx";
import "@fontsource-variable/wix-madefor-display";
import "@fontsource/geist-mono/400.css";
import "@fontsource/geist-mono/500.css";
import "@fontsource/geist-mono/600.css";
import "./index.css";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {/* Displacement filter for .glass-liquid (Chromium only). Zero-size and hidden, but the filter still resolves by id. */}
    <svg aria-hidden="true" focusable="false" width="0" height="0" style={{ position: "absolute" }}>
      <filter id="consigna-liquid" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.012 0.02" numOctaves="2" seed="7" result="noise" />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="14" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </svg>
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <WalletPickerProvider>
          <RouterProvider router={router} />
        </WalletPickerProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>,
);
