import { useCallback, useEffect, useRef, useState } from "react";
import type { Address, Hex } from "viem";
import { usePublicClient } from "wagmi";
import { listInvoices, paidEvent, type Invoice } from "../../lib/consigna.ts";
import { COPY } from "../../lib/invoice-logic.ts";

/**
 * Reads one issuer's invoices and the paid-transaction map. Used by the dashboard (once) and by the /ledger route.
 * E14: on a read error it retries with backoff (at most five times). Stale results and the pending retry timer
 * are dropped when the issuer changes or the component unmounts.
 */
export function useLedgerData(issuer: string, enabled: boolean) {
  const publicClient = usePublicClient();
  const validIssuer = /^0x[0-9a-fA-F]{40}$/.test(issuer);
  const [rows, setRows] = useState<Invoice[] | undefined>(undefined); // undefined = loading
  const [paidTx, setPaidTx] = useState<Record<string, Hex>>({});
  const [loadError, setLoadError] = useState<string | undefined>();
  const generation = useRef(0);
  const timer = useRef<number | undefined>(undefined);

  const run = useCallback(
    async (attempt: number, gen: number): Promise<void> => {
      if (!publicClient || !validIssuer) {
        // Stay in the loading state until the client exists. Do not flash an empty list.
        return;
      }
      let list: Invoice[];
      try {
        list = await listInvoices(publicClient, issuer as Address);
      } catch {
        if (gen !== generation.current) return;
        setLoadError(COPY.rpcDown);
        if (attempt < 5) timer.current = window.setTimeout(() => void run(attempt + 1, gen), 3_000 * (attempt + 1));
        return;
      }
      if (gen !== generation.current) return;
      setLoadError(undefined);
      setRows(list);
      // One single-block InvoicePaid lookup per paid invoice, at its paidBlock only (CLAUDE.md §9).
      const entries = await Promise.all(
        list
          .filter((i) => i.status === "paid")
          .map(async (i) => {
            try {
              const ev = await paidEvent(publicClient, i.id, i.paidBlock);
              return [i.id, ev?.txHash] as const;
            } catch (e) {
              console.error("paidEvent failed", i.ref, e);
              return [i.id, undefined] as const;
            }
          }),
      );
      if (gen !== generation.current) return;
      const map: Record<string, Hex> = {};
      for (const [id, tx] of entries) if (tx) map[id] = tx;
      setPaidTx(map);
    },
    [publicClient, issuer, validIssuer],
  );

  useEffect(() => {
    if (!enabled) return;
    generation.current += 1;
    const gen = generation.current;
    setRows(undefined);
    setPaidTx({});
    void run(0, gen);
    return () => {
      // Unmount or issuer change: drop in-flight results and the pending retry.
      generation.current += 1;
      window.clearTimeout(timer.current);
    };
  }, [enabled, run]);

  /** Re-reads from chain (NFR-R2). Used after a cancel. */
  const reload = useCallback(() => {
    window.clearTimeout(timer.current);
    generation.current += 1;
    void run(0, generation.current);
  }, [run]);

  return { rows, paidTx, loadError, reload };
}
