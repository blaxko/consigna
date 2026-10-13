import { useEffect, useRef } from "react";
import type { Address, Hex } from "viem";
import { XCircle } from "@untitledui/icons";
import { EXPLORER } from "../lib/chain.ts";
import { blockedCopy } from "../lib/ledger-logic.ts";

/**
 * Flow C result (PRD 5.4 step 3): the duplicate was refused by the contract. Error banners are not dismissable.
 * It scrolls into view when it appears, so it cannot be missed in a recording.
 */
export function BlockedCard({
  payer,
  paidAt,
  txHash,
  scroll = true,
}: {
  payer: Address;
  paidAt: number;
  txHash: Hex;
  /** Off for the static sample on the landing page, so the hero never scrolls the page. */
  scroll?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scroll) ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [scroll]);
  return (
    <div
      ref={ref}
      role="alert"
      className="flex flex-col gap-4 rounded-xl border-2 border-red-700 bg-red-50 p-6 text-red-950 shadow-sm"
    >
      <div className="flex items-start gap-4">
        <XCircle className="mt-1 size-8 shrink-0 text-red-700" aria-hidden="true" />
        <div className="flex flex-col gap-2">
          {/* Same copy as blockedCopy(); the line break sits at the em dash so the address never wraps mid-way. */}
          <p className="text-xl font-bold leading-snug sm:text-2xl">
            {blockedCopy(payer, paidAt).split(" — ")[0]} —
            <span className="block">{blockedCopy(payer, paidAt).split(" — ")[1]}</span>
          </p>
          <p className="text-base">No USDC moved. Only gas was charged.</p>
        </div>
      </div>
      <a
        className="w-fit font-semibold text-red-800 underline underline-offset-4"
        href={`${EXPLORER}/tx/${txHash}`}
        target="_blank"
        rel="noreferrer"
      >
        View failed transaction
      </a>
    </div>
  );
}
