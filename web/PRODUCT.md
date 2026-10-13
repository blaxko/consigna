# Product

**Consigna**: duplicate-proof USDC invoice payments on Arc mainnet (chain 5042).

- **Users:** finance and operations people at businesses that pay or get paid in USDC. Some are issuers (they create invoices and export a ledger). Some are payers (they open a link and pay once).
- **Job:** an invoice is paid once. The contract rejects any second payment with `AlreadyPaid`. The ledger and CSV come from chain reads only.
- **Truth to keep:** the contract never holds funds, has no owner or admin keys, and has no backend or database. Only true numbers appear on the site: 1 payment per invoice, under 1s finality on Arc, about $0.01 per transaction, 0 admin keys.
- **Not in scope:** invented users, volumes, logos or testimonials; a testnet of any kind.
- **Surfaces:** marketing (`/`, `/how-it-works`, `/why-arc`, `/proof`) in Persuade mode. App screens (`/new`, `/i/:id`, `/ledger/:issuer`) in Operate mode.
- **Brand feel:** calm, exact, financial-grade. Glass is a surface treatment, not a theme.
