# Consigna

**Duplicate-proof USDC invoice payments on Arc mainnet. One invoice, one payment, enforced by the chain.**

## The problem

Businesses that pay suppliers in USDC save on bank fees but lose time to manual reconciliation. A duplicate payment, once it settles, cannot be reversed. Existing tools detect a duplicate after the money has moved, but none of them prevent it.

## What it uses Arc for

- **USDC as payment and gas.** One token for both, with fees of about a cent.
- **Deterministic finality.** "Paid" is final as soon as the transaction is included.
- **Native Circle tokens.** The contract allows USDC and EURC, both 6-decimal ERC-20s on Arc.
- **Mainnet contract.** It is deployed on Arc mainnet (chain 5042). Nothing runs on a testnet.

## Contract on Arc mainnet

- **Address:** `0x7416bfbed0d79e8604c09e0225e6baab56f0c728`
- **Explorer:** https://explorer.arc.io/address/0x7416bfbed0d79e8604c09e0225e6baab56f0c728
- **Deploy transaction:** https://explorer.arc.io/tx/0x7568e87de00f9449a840793eff8818e8fdb9d50ed720985ab1205728710a8afb

No owner, no admin, no pause, no proxy. The contract never holds funds.

## Mainnet smoke test (proof)

Run with `scripts/smoke.ts` on Arc mainnet, using 0.01 USDC invoices:

1. Create invoice: https://explorer.arc.io/tx/0xe289ba1682a746935e12bd4a8fd137d527632b4d255b53adfd4b93f9e898b62c
2. Pay (exact approval, then pay): https://explorer.arc.io/tx/0xc1343f18adfbab42514eb1fa9c68b9c77768abfa75cd883f0ac3d630f7dc3584
3. Duplicate payment, **failed on-chain** with `AlreadyPaid`: https://explorer.arc.io/tx/0xa16c4bcccf23fd1f3c343511a2723e459013487f09d7771aad0d4d10de39520c
4. Cancel a second invoice: https://explorer.arc.io/tx/0xf0a6a8ff83020b1540ae55aecbc06b1593c89c3f549370e84ac47b90a286067c

## How to verify

The explorer cannot verify source yet. Instead, compile the repo and compare the code on chain:

```bash
npm install
npx hardhat compile
npx hardhat run scripts/verify-bytecode.ts --network arc
```

The script prints `MATCH` when the on-chain bytecode equals the local compile, with the immutable USDC/EURC slots masked.

## How it works

1. The issuer creates an invoice. Its id is `keccak256(issuer, ref)`, computed in the contract, so nobody can squat it.
2. The amount, token and payee are bound to that id on-chain.
3. The payer approves exactly the amount and calls `pay(id)`. USDC moves straight to the issuer.
4. A second `pay` reverts `AlreadyPaid(id, payer, paidAt)`, and the failed transaction stays on the explorer.
5. The ledger and CSV are rebuilt from chain reads only. There is no backend and no database.

## Run locally

```bash
npm install
npm run test        # 22 tests on the in-memory Hardhat network (no deployment)
npm run coverage    # branch coverage for Consigna.sol (must be 100%)
```

Scripts that touch mainnet need `.env` with `DEPLOYER_KEY` and `PAYER_KEY`. The file is git-ignored and never committed.

## Live app

- **App:** https://consigna-production.up.railway.app
- Landing page `/`, plus `/how-it-works`, `/why-arc` and `/proof` (links to the mainnet records above).
- The paid demo invoice `TEST-001` and its ledger are linked from `/proof`.

## Status

- [x] Contract deployed on Arc mainnet and verified by bytecode
- [x] Mainnet smoke test passed
- [x] Live app on Railway
- [ ] Demo video: TODO (90 seconds)

## Licence

MIT
