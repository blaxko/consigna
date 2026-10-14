# Consigna

**One invoice. One payment. Enforced by Arc.**

Consigna takes USDC invoice payments on Arc mainnet. An invoice can be paid once. A second payment is rejected by the contract, so the duplicate never settles.

## The problem

Businesses that pay suppliers in USDC lose time to manual reconciliation. A duplicate payment that settles cannot be reversed. Existing tools detect duplicates after the money has moved, but nothing stops them at settlement.

## What it uses Arc for

- **USDC as payment and gas.** One token for both, at about $0.01 per transaction.
- **Sub-second finality.** Once a payment is included on Arc, it is final.
- **Native Circle tokens.** The contract accepts USDC and EURC. Both are 6-decimal ERC-20s on Arc.
- **Arc mainnet.** The contract is deployed on chain 5042. Nothing runs on a testnet.

## Links

- **Live app:** https://consigna-production.up.railway.app
- **Contract:** `0x7416bfbed0d79e8604c09e0225e6baab56f0c728`
  - https://explorer.arc.io/address/0x7416bfbed0d79e8604c09e0225e6baab56f0c728
  - Deploy transaction: https://explorer.arc.io/tx/0x7568e87de00f9449a840793eff8818e8fdb9d50ed720985ab1205728710a8afb
- **TEST-001 (paid):** https://consigna-production.up.railway.app/i/0x76314ccab634e6f1ebe4d1009574ff9a3b70088bc807915fab66b8d055c61e27
- **Blocked duplicate (`0xa16c4bcc…520c`, reverted with `AlreadyPaid`):** https://explorer.arc.io/tx/0xa16c4bcccf23fd1f3c343511a2723e459013487f09d7771aad0d4d10de39520c
- **Demo video:** TODO (90 seconds)

## How it works

```
Issuer                      Contract (Arc mainnet)                 Payer
  |  createInvoice(ref,       |                                       |
  |    token, amount, hash) → |  id = keccak256(issuer, ref)          |
  |                           |  amount, token, payee fixed           |
  |                           |  ← pay(id) with exact approval ─────  |
  |  ← USDC goes straight     |  status = Paid, payer and block set   |
  |    to the issuer          |                                       |
  |                           |  ← second pay(id) reverts             |
  |                           |    AlreadyPaid(id, payer, paidAt)     |
```

- The contract holds no funds. USDC moves from payer to issuer in one transfer.
- The invoice id is derived from the issuer and the reference, so nobody can take it.
- The ledger and CSV come only from chain reads. There is no backend and no database.

## Features

- **Create an invoice:** reference, token, amount and line items. The line items travel in the payment link (after the # sign, which stays in the browser). The contract stores only their hash.
- **Pay once:** the payer approves the exact amount, then pays. Any second payment reverts on-chain, and the failed transaction stays on the explorer.
- **Dashboard:** totals, paid against outstanding, recent invoices, and the full invoice list with filters.
- **Ledger and CSV export:** rebuilt from chain reads. Paid rows include the payment transaction.
- **Cancel:** the issuer can cancel an open invoice. The reference stays used.
- **Wallets:** any installed browser wallet, MetaMask (approve in the MetaMask app, then return to this browser), and WalletConnect (QR on desktop, wallet list on mobile).

## Verify the bytecode

The explorer cannot verify source yet. Compile the repo and compare with the chain:

```bash
npm install
npx hardhat compile
npx hardhat run scripts/verify-bytecode.ts --network arc
```

The script prints `MATCH` when the on-chain bytecode equals the local compile. Immutable USDC and EURC slots are masked.

## Run locally

You need Node 22 or 24.

```bash
# Contract tests (in-memory Hardhat network, nothing is deployed)
npm install
npm run test
SOLIDITY_COVERAGE=true npx hardhat coverage   # PowerShell: $env:SOLIDITY_COVERAGE="true"; npx hardhat coverage

# Web app
cd web
cp .env.example .env     # set VITE_CONSIGNA_ADDRESS and VITE_WALLETCONNECT_PROJECT_ID
npm install
npm run dev
```

- `VITE_CONSIGNA_ADDRESS`: the contract address. Use `0x7416bfbed0d79e8604c09e0225e6baab56f0c728`.
- `VITE_WALLETCONNECT_PROJECT_ID`: a project id from cloud.reown.com. Without it, the WalletConnect option is hidden and injected wallets and MetaMask still work.

Scripts that touch mainnet need `.env` at the repo root with `DEPLOYER_KEY`, `PAYER_KEY` and `ARC_RPC`. The file is git-ignored.

## Tests

- **Contract:** 22 tests on the in-memory Hardhat network. The coverage command reports branch coverage for `Consigna.sol` (100% on the last run).
- **Web app:** 52 unit tests for the invoice, ledger, CSV, format and details logic (`npm test` in `web/`).

## Known limitations

- **CSV tx hash:** open and cancelled rows have no transaction hash. Only paid rows link to a payment. The app does not search for the creation transaction.
- **iOS:** after approving in the MetaMask app, Safari may not switch back on its own. Tap Safari to return to the page. The page keeps its state.
- **WalletConnect sessions** are not restored after a full page reload, unless the session still exists in the wallet. Reconnect from the picker in that case.
- **Explorer source:** the contract source is not verified on the explorer. Use the bytecode check above.
- **Single chain:** Arc mainnet only. There is no testnet build.

## Status

- [x] Contract deployed on Arc mainnet and verified by bytecode
- [x] Mainnet smoke test passed
- [x] Live app on Railway
- [ ] Demo video (TODO)

## Licence

MIT. See [LICENSE](LICENSE).
