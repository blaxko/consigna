import { useAccount } from "wagmi";
import { shortAddress } from "../lib/format.ts";
import { useWalletPicker } from "./WalletPicker.tsx";

/** Header wallet control. Always "Connect wallet" when disconnected. Opens the shared picker. */
export function WalletButton() {
  const { address, isConnected } = useAccount();
  const { open } = useWalletPicker();

  if (!isConnected || !address) {
    return (
      <button
        type="button"
        onClick={open}
        className="btn-secondary min-h-11 !px-4 !py-2 text-sm"
      >
        Connect wallet
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={open}
      className="btn-secondary min-h-11 !px-4 !py-2 font-mono text-sm"
      title={address}
    >
      {shortAddress(address)}
    </button>
  );
}
