# DoraHacks submission — Consigna

## Required fields (copy from the DoraHacks form)
- [ ] Field: ______  → value: ______

## Links (fill on Wednesday)
- Live app: TODO (Railway URL)
- Public repo: https://github.com/<you>/consigna
- Contract on Arc mainnet: TODO (address) — https://explorer.arc.io/address/TODO
- Demo video: TODO
- Builder profile: https://github.com/<you>

## Description

**Consigna: duplicate-proof USDC invoice payments on Arc.**

Businesses paying suppliers in USDC lose time to manual reconciliation and lose money to duplicate payments, which can't be reversed once they settle. Existing tools only detect duplicates after the fact. Consigna prevents them: an issuer creates an invoice on Arc with the amount and recipient locked on-chain, the payer pays once directly to the issuer, and any second payment is rejected by the contract. The issuer exports an accountant-ready CSV rebuilt purely from chain data.

**What it uses Arc for:** USDC as both payment and gas (about one cent, predictable fees), sub-second deterministic finality so "paid" is final immediately, native Circle tokens (USDC, EURC), and the contract deployed on Arc mainnet. No backend, no database, no admin keys, and the contract never holds funds.
