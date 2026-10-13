import { Link } from "react-router";
import { CONSIGNA_ADDRESS, EXPLORER } from "../lib/chain.ts";
import { shortAddress } from "../lib/format.ts";
import { BLOCKED_DUPLICATE_TX, DEMO_ISSUER, DEMO_PAID_REF, invoiceIdFor } from "../lib/demo.ts";

/** Home: the offer, one primary action, three demo links, and the live contract line. */
export function Home() {
  const paidInvoicePath = `/i/${invoiceIdFor(DEMO_ISSUER, DEMO_PAID_REF)}`;
  return (
    <section className="flex flex-col gap-10 py-8 sm:py-16">
      <div className="flex flex-col gap-5">
        <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          One invoice. One payment. Enforced by Arc.
        </h1>
        <p className="max-w-xl text-base text-[color:var(--color-muted)] sm:text-lg">
          Stablecoin duplicates settle before anyone notices, and matching payments to invoices is still manual work.
        </p>
      </div>

      <div className="flex flex-col gap-6">
        <Link
          to="/new"
          className="inline-flex w-fit items-center rounded-md bg-[color:var(--color-accent)] px-5 py-3 text-base font-semibold text-white transition duration-100 ease-linear hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Create invoice
        </Link>

        <ul className="flex flex-col gap-3 text-base">
          <li>
            <Link to={paidInvoicePath} className="font-medium underline underline-offset-4">
              See a paid invoice
            </Link>
          </li>
          <li>
            <a
              href={`${EXPLORER}/tx/${BLOCKED_DUPLICATE_TX}`}
              target="_blank"
              rel="noreferrer"
              className="font-medium underline underline-offset-4"
            >
              See a blocked duplicate on the explorer
            </a>
          </li>
          <li>
            <Link to={`/ledger/${DEMO_ISSUER}`} className="font-medium underline underline-offset-4">
              View ledger
            </Link>
          </li>
        </ul>
      </div>

      <p className="border-t border-[color:var(--color-line)] pt-5 text-sm text-[color:var(--color-muted)]">
        Live on Arc mainnet · Contract{" "}
        <a
          href={`${EXPLORER}/address/${CONSIGNA_ADDRESS}`}
          target="_blank"
          rel="noreferrer"
          className="font-mono underline underline-offset-4"
          title={CONSIGNA_ADDRESS}
        >
          {CONSIGNA_ADDRESS ? shortAddress(CONSIGNA_ADDRESS) : "not configured"}
        </a>
      </p>
    </section>
  );
}
