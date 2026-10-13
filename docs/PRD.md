# Consigna — Product Requirements Document

**Duplicate-proof USDC invoice payments on Arc mainnet, with books that close themselves.**

| | |
|---|---|
| Owner | Oladipupo Ayoola |
| Program | Arc Microgrants (Circle / Arc, DoraHacks) |
| Network | **Arc mainnet only** (chain ID 5042). No testnet at any stage. |
| Hard deadline | Oct 14, 2026 23:59 ET = **Thu Oct 15, 04:59 Lagos** |
| Target submit | **Wed Oct 14, 22:00 Lagos** (7-hour buffer) |
| Appetite | 2 build days (Tue + Wed). Scope is cut to fit, not the other way round. |
| Status | Draft for approval |

---

## 1. Problem

Businesses that pay suppliers and contractors in USDC say on-chain payouts are already cheaper than bank rails, but **the back office breaks**:

> "Stablecoin payouts are operationally cheaper than bank rails, but reconciliation is killing them … matching + catching issues quickly is still manual. With at least one scary incident involving a duplicate." — r/StableCoins

> "We've started using USDC for a portion of vendor payouts, and our monthly close has gotten messier … downloading wallet transaction history, manually tagging vendors…" — r/CFO

Two failures cause this:

1. **Duplicates are only caught after the money has gone.** A standard USDC transfer has no idea which invoice it pays. Every existing approach (reference proxies, Solana Pay references, ERC-7699, Arc Memo, accounting tools) *detects* a payment against an invoice. None of them *prevents* paying the same invoice twice. Once a duplicate settles, it can't be reversed.
2. **Transfers carry no business context.** Matching a wallet's history back to invoices means exporting CSVs and tagging by hand.

**Why Arc:** fees are a predictable ~$0.01 in USDC, with no second token to buy. Finality is ~0.5s, so "paid" is final straight away. Circle tokens (USDC, EURC) are native there. Consigna turns those properties into a back-office guarantee: **one invoice, one payment, enforced by the chain.**

## 2. Goals, non-goals, success metrics

### Goals
- **G1.** The contract makes it impossible to pay an invoice twice. The protection is in the contract, not only the UI.
- **G2.** A payer can't pay the wrong amount or the wrong recipient. Both are bound to the invoice on-chain.
- **G3.** An issuer gets an accountant-ready CSV rebuilt purely from chain data, with no database.
- **G4.** A judge understands the product from a 90-second video with no narration, and can check it on the Arc mainnet explorer.

### Non-goals (this version)
Escrow, refunds, partial or over-payment, recurring invoices, fiat on/off-ramp, accounts/login, email delivery, multi-chain. (Full list in §11.)

### Success metrics (measured at submission)
| # | Metric | Target |
|---|---|---|
| M1 | Real invoices on Arc mainnet created through the deployed UI | ≥ 6 (≥ 4 paid, ≥ 1 cancelled, ≥ 1 open) |
| M2 | Duplicate payment attempts visible as **failed transactions** on the explorer with reason `AlreadyPaid` | ≥ 1 |
| M3 | Branch coverage of `Consigna.sol` | 100% |
| M4 | Time from opening a payment link to "Paid" for a user with USDC on Arc and a wallet already set to Arc | ≤ 45 s |
| M5 | Exported CSV imports into Google Sheets with no column fixes; every row has a working explorer link | 100% of rows |
| M6 | Submission complete (live link, public repo, description, profile) | Before Wed 22:00 Lagos |
| M7 | Grant outcome | Selected for a 500 USDC microgrant (decided by Oct 21) |

## 3. Users and user stories

| Persona | Who | What they need |
|---|---|---|
| **Issuer** | A freelancer, agency or SMB billing clients in USDC (e.g. a Lagos designer invoicing a US client) | Get paid the exact amount once, and know which invoice each payment settled |
| **Payer** | The client's accounts-payable person, or any wallet holder | Pay confidently, without double-paying even if they click twice or two colleagues both pay |
| **Accountant** | The issuer's bookkeeper | A clean export to import, not a wallet dump |
| **Judge** | Arc / Circle reviewer | See the guarantee working on mainnet in 90 seconds, and check it in the explorer |

| ID | Story |
|---|---|
| US-1 | As an **issuer**, I create an invoice with a reference, amount and line items, and get a payment link to send. |
| US-2 | As a **payer**, I open the link and see who I'm paying, how much, and what for, already checked against the chain. |
| US-3 | As a **payer**, I pay in USDC and see a final confirmation within seconds, with the fee. |
| US-4 | As a **payer** (or a second colleague), if I try to pay an invoice that's already paid, the chain refuses and tells me who paid it and when. |
| US-5 | As an **issuer**, I can cancel an unpaid invoice so it can no longer be paid. |
| US-6 | As an **issuer**, I see all my invoices and their status, and download a CSV for my accountant. |
| US-7 | As **anyone with the link**, including someone without a wallet, I can see an invoice's status and its on-chain proof. |
| US-8 | *(stretch)* As an **issuer**, I can bill in EURC instead of USDC. |
| US-9 | *(stretch)* As an **issuer**, my payments also appear in Arc's native Memo log, so any Arc tool can reconcile them. |

## 4. Features, prioritized

| ID | Feature | Priority | Stories |
|---|---|---|---|
| F1 | `Consigna.sol`: create / pay / cancel with exactly-once payment | **Must** | US-1, 3, 4, 5 |
| F2 | Create invoice page (`/new`) | **Must** | US-1 |
| F3 | Pay page (`/i/:id`): connect wallet, approve, pay, status | **Must** | US-2, 3, 7 |
| F4 | Duplicate-attempt display (real failed transaction plus decoded reason) | **Must** | US-4 |
| F5 | Ledger (`/ledger/:issuer`) plus CSV export | **Must** | US-6 |
| F6 | Cancel invoice | **Must** (cheap, already in the contract) | US-5 |
| F7 | Seeded mainnet demo data, README, 90-second video | **Must** | Judge |
| F8 | Bytecode verify script (the explorer can't verify source yet) | **Must** | Judge |
| F9 | EURC selectable in the UI (the contract allows it from day 1) | Stretch | US-8 |
| F10 | Pay through Arc's Memo contract | Stretch, only if live on mainnet | US-9 |
| F11 | QR code for the payment link | Stretch | US-1 |

**Cut order if behind schedule:** F11 → F10 → F9. F1–F8 are not negotiable.

## 5. Functional requirements and user flows

### 5.1 Contract rules (F1)

- **FR-1** The invoice ID is deterministic: `id = keccak256(abi.encode(issuer, ref))`, computed **in the contract** from `msg.sender`. Nobody can pre-register or squat another issuer's ID.
- **FR-2** `ref` is 1–32 bytes. An issuer can't reuse a ref (`RefAlreadyUsed`), even after cancelling.
- **FR-3** The token must be USDC `0x3600000000000000000000000000000000000000` or EURC `0xbEf5f6d51CB62b58e6A8f77868681825C6fe21c1`. Both are fixed at deploy (immutable). The contract has no admin role.
- **FR-4** `amount` is greater than 0, in the token's **6-decimal** ERC-20 units. Native 18-decimal values are never used for amounts.
- **FR-5** `pay(id)` succeeds only if the invoice status is `Open`. It sets `Paid`, then records the payer, timestamp and block, **before** calling `transferFrom(payer → issuer, amount)`. If the transfer fails, the whole transaction reverts.
- **FR-6** The contract **never holds funds**. Money moves directly from payer to issuer in one call.
- **FR-7** A second `pay` on a paid invoice reverts with `AlreadyPaid(id, paidBy, paidAt)`. On a cancelled invoice it reverts with `InvoiceWasCancelled(id)`, and on an unknown ID with `InvoiceNotFound(id)`.
- **FR-8** `cancel(id)` works only for the issuer, and only while `Open`.
- **FR-9** Every state change emits an event (§7.3), and the paid invoice stores `paidBlock` so the UI can fetch the exact payment log without scanning the chain.
- **FR-10** Anyone can pay, including the issuer themselves (useful for judges testing with one wallet).

### 5.2 Flow A: Create invoice (`/new`), Issuer, web

```
Goal: issuer gets a shareable payment link → Success = invoice is Open on-chain and link is copied
Entry: landing page "Create invoice" · ledger page "New invoice"

Step 1 — Invoice form
  Shows: token (USDC fixed; EURC if F9), fields     Asks for: reference, client name, line items (desc, qty, unit price), due date (optional), note (optional)
  Primary: "Review"                                   Secondary: back to ledger
  Validation (inline, on blur): ref 1–32 chars [A-Za-z0-9-_./]; ref not already used (read idFor + getInvoice);
    unit price ≤ 6 decimals; total > 0; serialized details ≤ 1,500 bytes
  Errors: "You've already used INV-0042. Pick a new reference."  ·  "USDC supports up to 6 decimal places."
Step 2 — Connect wallet (only if not connected) → standard connect-wallet pattern (§5.6)
Step 3 — Review
  Shows: total (e.g. "5.00 USDC"), payee = connected address, fee estimate (~$0.01), "This can't be edited after creation. You can cancel it while unpaid."
  Primary: "Create on Arc"                            Secondary: "Edit"
Step 4 — Confirm in wallet → submitted (explorer link) → confirmed
  States: waiting for wallet · submitted · confirmed · failed (decoded reason) · rejected (back to Step 3, no error banner)
Step 5 — Success
  Shows: payment link, Copy (with "Copied" toast), QR (F11), "View invoice", "Go to ledger"
Edge cases: §8
Metrics: form-to-confirmed time; create failures by reason
```

### 5.3 Flow B: Pay invoice (`/i/:id#d=<details>`), Payer, web

```
Goal: pay exactly once → Success = invoice shows Paid with tx link
Entry: link from issuer (email/chat/QR)

Step 1 — Invoice view (no wallet needed)
  Shows: status badge (Open / Paid / Cancelled), issuer address, ref, amount + token, line items from link,
         "✓ Details match the on-chain invoice" (hash check) or a warning (see §8), created time, explorer link to contract
  Primary (Open): "Pay 5.00 USDC"     Paid: "Paid by 0xab…12 · Oct 14, 10:42 · View transaction"     Cancelled: "This invoice was cancelled by the issuer"
Step 2 — Connect wallet if needed (§5.6), wrong network → one-click switch/add Arc (chain 5042)
Step 3 — Review & balance check
  Shows: amount, recipient, fee ~$0.01, wallet USDC balance
  Block if balance < amount + 0.05 USDC: "You need 5.05 USDC on Arc (5.00 + fees). You have 2.10." + link "How to move USDC to Arc (CCTP)"
  Stepper: ① Allow USDC (skipped if allowance ≥ amount) → ② Pay
Step 4 — ① Approve: "Allow Consigna to send exactly 5.00 USDC for this invoice" → wallet → confirmed
Step 5 — ② Pay: re-read status just before sending; if no longer Open → jump to Step 6 with the paid/cancelled state
  → wallet → submitted → confirmed
Step 6 — Paid
  Shows: "Paid · settled in 0.6 s · fee 0.01 USDC", tx link, payer, block
  Secondary: "Try paying again" (demo of F4, see Flow C)
States everywhere: loading · error (decoded, with next action) · rejected-in-wallet (return to current step silently)
Metrics: open→paid time, drop-off per step, approve-skipped rate
```

### 5.4 Flow C: Duplicate attempt (F4)

```
Trigger: "Try paying again" on a Paid invoice, or any pay attempt that races another payer
Step 1 — Explain (inline, not modal): "This sends a real transaction to show the contract refusing it. It costs about $0.01 in fees and no USDC is transferred."
  Primary: "Send duplicate payment"      Secondary: "Cancel"
Step 2 — Send WITHOUT pre-simulation, fixed gas limit 120,000 → wallet → mined with status = reverted
Step 3 — Result (red): "Blocked by contract: AlreadyPaid — paid by 0xab…12 at 10:42:07" + "View failed transaction"
  Reason decoding: re-run eth_call of the same calldata at the receipt's block; fall back to reading getInvoice()
```

### 5.5 Flow D: Ledger and CSV (`/ledger/:issuer`), Issuer / Accountant

```
Goal: books ready for the accountant → Success = CSV downloaded and opens cleanly
Entry: nav "Ledger" (defaults to connected address) · direct URL (read-only, no wallet)

Step 1 — Table: Ref · Created · Status · Amount · Token · Payer · Paid at · Tx
  Filters: All / Open / Paid / Cancelled. Totals: paid, outstanding.
  Empty: "No invoices yet — create your first" (primary)
  Row action (issuer only, Open rows): "Cancel" → confirm dialog: "Cancel INV-0042? It can never be paid or reused." → wallet → done
Step 2 — "Download CSV" (scope = current filter)
```

### 5.6 Shared pattern: connect wallet and network

Injected wallets (MetaMask, Rabby, OKX) are listed first. If none is installed, show "Install a wallet" help, and the page stays readable. On a wrong chain, call `wallet_switchEthereumChain` and fall back to `wallet_addEthereumChain` with Arc's parameters (chain 5042, RPC `https://rpc.mainnet.arc.io`, currency USDC with 18 decimals for the native balance). The connected state shows a truncated address, "Arc" and the USDC balance from the ERC-20 interface. If the user switches account mid-flow, re-read balances, allowance and issuer rights.

## 6. Non-functional requirements

### Performance
| ID | Requirement |
|---|---|
| NFR-P1 | Invoice page shows on-chain status ≤ 2.0 s after load on 4G (one `getInvoice` call plus at most one `getLogs` call scoped to `paidBlock`). |
| NFR-P2 | The UI shows "confirmed" ≤ 3 s after the wallet broadcasts (Arc finality ~0.5 s; poll the receipt every 400 ms). |
| NFR-P3 | Ledger of 100 invoices renders ≤ 3 s, using Multicall3 (`0xcA11bde05977b3631167028862bE2a173976CA11`) for invoice reads. No block-range scans. |
| NFR-P4 | JS bundle ≤ 300 KB gzipped. |
| NFR-P5 | Fee per create/approve/pay ≤ $0.02 at normal load. Fee settings use a **20 gwei `maxFeePerGas` floor** per Arc docs. |

### Security
| ID | Requirement |
|---|---|
| NFR-S1 | **Never holds funds, no admin, no upgrades.** No `owner`, no pause, no proxy. Token allowlist is immutable. |
| NFR-S2 | State changes happen before the external call. `SafeERC20` (OpenZeppelin v5) for `transferFrom`. Custom errors only. |
| NFR-S3 | IDs are derived from `msg.sender` (FR-1), so they can't be front-run or squatted. |
| NFR-S4 | Approvals are for the **exact invoice amount**, never unlimited. |
| NFR-S5 | **Privacy:** the `ref` is public on-chain. The UI warns "Don't put personal data in the reference." Line items travel only in the URL fragment (`#…`, never sent to any server) and are committed on-chain as a `keccak256` hash. |
| NFR-S6 | **CSV injection:** any cell starting with `=`, `+`, `-`, `@`, tab or CR is prefixed with `'`. |
| NFR-S7 | Details from the link are always checked against the on-chain hash. The amount and payee shown for payment **always come from the chain, never from the link**. |
| NFR-S8 | No private keys in the repo or on Railway. The deployer key exists only in a local `.env` (git-ignored) and is used once to deploy. Hackathon wallets hold ≤ $10 total (plan: ~3 USDC). |
| NFR-S9 | Supply chain: pin dependency versions with a committed lockfile. Use no third-party analytics scripts. |

### Reliability and integrity
| ID | Requirement |
|---|---|
| NFR-R1 | viem `fallback()` transport: Arc public RPC first, then one Arc endpoint from Alchemy or QuickNode (key restricted to the app's domain). |
| NFR-R2 | **The chain is the source of truth.** After any timeout or error, re-read `getInvoice` before telling the user anything. |
| NFR-R3 | Transactions blocked by the USDC blocklist can revert **without a receipt** (Arc docs). After 30 s with no receipt, show "Not confirmed. Check the explorer" and re-read status. Never retry automatically. |
| NFR-R4 | Contract source is published with exact compiler settings. `scripts/verify-bytecode.ts` compiles and compares with `eth_getCode` on mainnet. |

### Accessibility and UX
WCAG AA contrast. Every status is shown as text and icon, never color alone. Keyboard-operable. One primary action per screen. Amounts always show token symbol and 2 decimals ("5.00 USDC"). Each step has its own URL, so refresh and back navigation work.

## 7. Architecture, stack, data models, APIs

### 7.1 Architecture

```
          ┌──────────────────────── Browser (static SPA on Railway) ─────────────────────────┐
          │  /new        /i/:id#d=…        /ledger/:issuer                                    │
          │     │             │                   │                                           │
          │     └──── wagmi + viem (fallback transport: Arc RPC → Alchemy/QuickNode) ─────────│
          └──────────────────────────────────────┬────────────────────────────────────────────┘
                                                 │ JSON-RPC (reads, writes via user's wallet)
          ┌──────────────────────────────────────▼──────────────────── Arc mainnet (5042) ───┐
          │  Consigna.sol ──transferFrom──▶ USDC 0x3600…0000 / EURC 0xbEf5…21c1 (6 decimals)  │
          │       ▲  (stretch) Memo 0x5294…e505 wraps pay(), preserves msg.sender           │
          │  Multicall3 0xcA11…CA11 for batched reads                                         │
          └──────────────────────────────────────────────────────────────────────────────────┘
   No backend. No database. No indexer. Invoice details live in the link fragment + an on-chain hash.
```

### 7.2 Stack

| Layer | Choice | Why |
|---|---|---|
| Contract | Solidity 0.8.26, OpenZeppelin 5 (`SafeERC20`, `IERC20`) | Standard and audited building blocks |
| Contract tooling | **Hardhat 2 + `@nomicfoundation/hardhat-toolbox-viem`**, TypeScript tests | Runs natively on Windows with Node, so no WSL needed. Arc's Foundry fork (`arc-forge`) is optional if WSL is available. |
| Unit tests | Local in-memory Hardhat network with a 6-decimal `MockUSDC` | Not a testnet; nothing is deployed anywhere but mainnet |
| Mainnet smoke test | `scripts/smoke.ts` running against Arc mainnet with **0.01 USDC** invoices | Proves the real USDC path end to end |
| Frontend | Vite + React 19 + TypeScript, React Router, wagmi v2 + viem v2, TanStack Query | Static output with no server to keep alive |
| UI | Untitled UI free components + Tailwind v4 | Polished without design time. The user's design-stack skills apply. |
| Hosting | Railway (static build served with `serve -s dist`) | Already used on previous projects |
| Repo | Public GitHub, MIT licence | Required by the program |

### 7.3 Contract interface (the API)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

interface IConsigna {
    enum Status { None, Open, Paid, Cancelled }

    struct Invoice {
        address issuer;      // receives funds
        address token;       // USDC or EURC
        uint96  amount;      // 6-decimal units (max ~79 billion tokens)
        Status  status;
        address payer;       // set on payment
        uint64  createdAt;
        uint64  paidAt;
        uint64  paidBlock;   // lets the UI fetch the exact log, no range scans
        bytes32 detailsHash; // keccak256 of canonical details JSON (or 0x0)
        string  ref;         // public, 1–32 bytes
    }

    event InvoiceCreated(bytes32 indexed id, address indexed issuer, address token, uint256 amount, string ref, bytes32 detailsHash);
    event InvoicePaid(bytes32 indexed id, address indexed issuer, address indexed payer, address token, uint256 amount, string ref);
    event InvoiceCancelled(bytes32 indexed id, address indexed issuer);

    error InvoiceNotFound(bytes32 id);
    error AlreadyPaid(bytes32 id, address paidBy, uint64 paidAt);
    error InvoiceWasCancelled(bytes32 id);
    error NotIssuer(bytes32 id);
    error TokenNotAllowed(address token);
    error InvalidAmount();
    error InvalidRef();
    error RefAlreadyUsed(bytes32 id);

    function createInvoice(string calldata ref, address token, uint96 amount, bytes32 detailsHash) external returns (bytes32 id);
    function pay(bytes32 id) external;
    function cancel(bytes32 id) external;

    function idFor(address issuer, string calldata ref) external pure returns (bytes32);
    function getInvoice(bytes32 id) external view returns (Invoice memory);
    function invoiceCount(address issuer) external view returns (uint256);
    function invoicesOf(address issuer, uint256 offset, uint256 limit) external view returns (bytes32[] memory);
    function isAllowedToken(address token) external view returns (bool);
}
```

**Storage:** `mapping(bytes32 => Invoice) invoices`, `mapping(address => bytes32[]) issuerInvoices`, `address immutable USDC`, `address immutable EURC`.

### 7.4 Off-chain data formats

**Payment link:** `https://<app>/i/<id>#d=<base64url(canonical JSON)>`

```json
{ "v": 1, "client": "Acme Inc.", "due": "2026-10-31",
  "items": [ { "desc": "Logo design", "qty": 1, "unit": "5.00" } ],
  "note": "Thanks!" }
```
Canonical form: keys in the order shown, no whitespace, amounts as decimal strings. `detailsHash = keccak256(utf8(canonical))`. Maximum 1,500 bytes before encoding.

**CSV export** (`consigna-<issuer-short>-<YYYYMMDD>.csv`, UTF-8, RFC 4180):

```
date_utc,ref,status,amount,token,payer,issuer,invoice_id,tx_hash,explorer_url
2026-10-14T09:42:07Z,INV-0042,paid,5.00,USDC,0xab…,0xcd…,0x9f…,0x51…,https://<explorer>/tx/0x51…
```
`date_utc` is the paid time, or the created time for open and cancelled invoices. For open and cancelled rows, `tx_hash` is the creation transaction.

### 7.5 Client module boundaries (`web/src/lib`)

| Module | Responsibility |
|---|---|
| `chain.ts` | Arc chain definition, contract addresses, transports |
| `consigna.ts` | Typed reads/writes: `readInvoice`, `listInvoices`, `create`, `approveExact`, `pay`, `payUnsimulated`, `cancel`, `decodeRevert` |
| `details.ts` | `encodeDetails`, `decodeDetails`, `hashDetails` (canonicalization lives here only) |
| `csv.ts` | `toCsv(rows)` with injection escaping |
| `format.ts` | 6-decimal ⇄ string, address truncation, times |

### 7.6 Project structure and commands

```
consigna/
  contracts/Consigna.sol      contracts/test/MockUSDC.sol
  test/Consigna.test.ts
  scripts/deploy.ts  scripts/smoke.ts  scripts/seed.ts  scripts/verify-bytecode.ts
  web/  (Vite app)  →  web/src/{pages,components,lib}
  docs/PRD.md  README.md  .env.example
```
```
npx hardhat test                                   # unit tests (local, in-memory)
npx hardhat coverage                               # must report 100% branches for Consigna.sol
npx hardhat run scripts/deploy.ts --network arc    # mainnet deploy (chainId 5042)
npx hardhat run scripts/smoke.ts  --network arc    # 0.01 USDC create → pay → duplicate → cancel
npm --prefix web run dev | build
```

## 8. Edge cases and error handling

| # | Situation | Behaviour (exact copy where shown) |
|---|---|---|
| E1 | No wallet installed | Page fully readable. Pay button reads "Install a wallet to pay", with a help link. |
| E2 | Wrong network | "Switch to Arc" (one click). On failure: "Add Arc in your wallet: chain 5042" with copyable values. |
| E3 | User rejects in wallet | Return to the same step silently. No error banner. |
| E4 | Insufficient USDC (amount + 0.05) | Pay disabled. "You need X USDC on Arc. You have Y." plus a CCTP guide link. |
| E5 | Approve confirmed, pay never sent or rejected | On return, the allowance is detected and step ① shows ✓, so the user can resume. |
| E6 | Invoice paid by someone else while the page is open | Pre-send re-read catches it and shows "Already paid by 0x… at …". If two transactions race, the loser reverts `AlreadyPaid` and the UI shows the same message. |
| E7 | Invoice cancelled | No pay action. "This invoice was cancelled by the issuer." |
| E8 | Unknown or invalid ID | "No Consigna invoice with this ID on Arc mainnet." Link to home. |
| E9 | Link details don't match the on-chain hash | Amber: "These line items don't match what the issuer recorded on-chain. Only the amount and recipient below are verified." Line items hidden. Pay allowed with chain values. |
| E10 | Link has no `#d=` fragment | Show the on-chain ref, amount and issuer. Note: "Line items weren't included in this link." |
| E11 | Ref already used (create) | Inline: "You've already used INV-0042. Pick a new reference." Caught before the wallet opens. |
| E12 | Amount precision > 6 decimals, or ≤ 0 | Inline validation. Contract `InvalidAmount` as backstop. |
| E13 | Transaction submitted, no receipt within 30 s (e.g. blocklist revert) | "Not confirmed yet. View on explorer." Status re-read every 3 s for 60 s, never auto-resend. |
| E14 | RPC failure | Fallback transport. If all fail: banner "Can't reach Arc right now. Retrying…" with exponential backoff, and the UI keeps its last known state. |
| E15 | Wallet account switched mid-flow | Re-read balance, allowance and issuer rights. Cancel buttons hide if the account isn't the issuer. |
| E16 | Smart-contract wallet (Safe/4337) as payer | Direct `pay` works. The Memo path (F10) is EOA-only, so fall back to direct `pay` when `getCode(account) != 0x`. |
| E17 | Page closed while pending | Reopening the link reads status from the chain. Nothing is stored locally. |
| E18 | Issuer pays own invoice | Allowed (FR-10). Ledger shows payer = issuer. |
| E19 | CSV cell starts with `=`/`+`/`-`/`@` | Prefixed with `'` (NFR-S6). |
| E20 | Native-vs-ERC-20 decimals mix-up | All amount math goes through `format.ts` using 6 decimals from the ERC-20 interface. A unit test asserts `parse("5.00") == 5_000_000n`. |

**Revert-decoding rule:** decode custom errors against the Consigna ABI. If decoding fails, show "Transaction failed on-chain" with the explorer link, and re-read `getInvoice`.

## 9. Acceptance criteria (Given / When / Then)

**F1 — Contract**
- AC1.1 Given no invoice for (issuer, "INV-1"), when the issuer calls `createInvoice("INV-1", USDC, 5_000_000, h)`, then `getInvoice(idFor(issuer,"INV-1"))` returns status `Open`, amount 5,000,000, and `InvoiceCreated` is emitted.
- AC1.2 Given an Open invoice and a payer with ≥ 5 USDC and allowance ≥ 5 USDC, when the payer calls `pay(id)`, then the issuer's balance rises by exactly 5,000,000, the payer's falls by exactly 5,000,000, the status is `Paid`, `paidBlock` equals the transaction's block, the contract's token balance is 0, and `InvoicePaid` is emitted.
- AC1.3 Given a Paid invoice, when **anyone** calls `pay(id)`, then it reverts `AlreadyPaid(id, firstPayer, paidAt)` and no balances change.
- AC1.4 Given a Cancelled invoice, `pay` reverts `InvoiceWasCancelled`. Given an unknown ID, it reverts `InvoiceNotFound`.
- AC1.5 Given an Open invoice, when a non-issuer calls `cancel`, it reverts `NotIssuer`. When the issuer cancels a Paid invoice, it reverts `AlreadyPaid`.
- AC1.6 `createInvoice` reverts `TokenNotAllowed` for any other token, `InvalidAmount` for 0, `InvalidRef` for an empty or 33-byte ref, and `RefAlreadyUsed` for a repeated ref, including after cancel.
- AC1.7 Two issuers can each use ref "INV-1", producing different IDs.
- AC1.8 If `transferFrom` fails (insufficient allowance or balance), the whole call reverts and the status stays `Open`.
- AC1.9 `npx hardhat coverage` shows 100% branch coverage for `Consigna.sol`.
- AC1.10 `smoke.ts` on **Arc mainnet** completes create → pay → duplicate (reverted on-chain) → cancel with 0.01 USDC invoices, and prints 4 explorer links.

**F2 — Create**
- AC2.1 Given a connected wallet on Arc, when the issuer submits a valid form and confirms, then within 5 s of the wallet broadcast a link is shown, and opening it shows status Open with "Details match".
- AC2.2 Given a ref the issuer already used, the error appears before the wallet opens.

**F3 — Pay**
- AC3.1 Given a fresh link and no wallet, the invoice, amount, issuer and status render in ≤ 2 s.
- AC3.2 Given a payer with no allowance, the stepper shows Approve then Pay. The approve request is for exactly the invoice amount.
- AC3.3 Given an existing allowance ≥ amount, step ① is skipped.
- AC3.4 After the pay transaction confirms, the page shows Paid with settlement time, fee and a working explorer link, without a manual refresh.

**F4 — Duplicate**
- AC4.1 Given a Paid invoice, when "Send duplicate payment" is confirmed, a transaction is mined with status reverted, the UI shows "Blocked by contract: AlreadyPaid — paid by … at …", and the explorer link opens that failed transaction.
- AC4.2 No USDC moves in AC4.1. The payer's USDC changes only by the gas fee.

**F5 — Ledger and CSV**
- AC5.1 `/ledger/<issuer>` lists every invoice from `invoicesOf`, with correct status, totals and filters, with or without a wallet.
- AC5.2 Download produces a file matching §7.4 exactly. Importing into Google Sheets yields the same row count as the table, and every `explorer_url` opens the right transaction.
- AC5.3 A ref beginning with `=` is exported as `'=…`.

**F6 — Cancel**
- AC6.1 The issuer sees Cancel on Open rows only. After confirming, the row shows Cancelled and the pay page shows the cancelled state.

**F7/F8 — Submission assets**
- AC7.1 Mainnet holds the M1/M2 data, created through the deployed UI.
- AC7.2 The README's first screen states the problem, "what it uses Arc for", the live link, contract address and video link.
- AC8.1 `verify-bytecode.ts` prints `MATCH` for the deployed address.

## 10. Testing strategy (mainnet-only)

There is **no testnet anywhere in this plan.**

1. **Unit tests:** an in-memory local Hardhat network with `MockUSDC` (6 decimals) covers every branch in AC1.x.
2. **Mainnet smoke test:** `smoke.ts` uses real USDC at 0.01 per invoice. Total cost is a few cents including gas.
3. **Manual end-to-end on mainnet** through the deployed UI, with two wallets (issuer and payer), following Flows A–D. This doubles as the demo seed (M1, M2).
4. **Browser checks:** Chrome + MetaMask desktop, and one mobile wallet in-app browser (OKX or MetaMask mobile).

**Funding:** withdraw about 3 USDC to Arc (directly from an exchange on the Arc network), split ~1.5 / ~1.5 across the deployer/issuer and payer wallets. Real spend is about $0.50 in gas plus the exchange fee; payments loop between your own wallets.

## 11. Out of scope

Escrow or holding funds · refunds · partial payments and over-payments · recurring or subscription invoices · invoice editing after creation · multiple currencies within one invoice · fiat on/off-ramp · email or notification delivery · accounts, login or a backend database · PDF invoices · multi-chain or CCTP inside the app · tax calculation · direct Xero/QuickBooks API sync (CSV only) · a mobile app · gas sponsorship or paymasters · admin, pause or upgrade functions.

## 12. Milestones (all times Lagos, UTC+1)

| # | When | Deliverable | Exit check |
|---|---|---|---|
| M0 | Tue 09:00–10:00 | Repo scaffolded. ~3 USDC on Arc (1.5 Issuer / 1.5 Payer). Chain ID 5042 confirmed from RPC. `eth_getCode` run on Memo `0x5294…e505` to decide whether F10 is possible. | `eth_chainId` = `0x13b2`; both wallets funded |
| M1 | Tue 10:00–14:00 | `Consigna.sol` plus tests | AC1.1–AC1.9 green |
| M2 | Tue 14:00–16:00 | **Mainnet deploy** plus smoke test plus bytecode script | AC1.10, AC8.1; address in README |
| M3 | Tue 16:00–23:00 | `/new` and `/i/:id` (Flows A, B) against the mainnet contract | AC2.x, AC3.x |
| M4 | Wed 09:00–13:00 | Duplicate flow, ledger, CSV, cancel (Flows C, D) | AC4.x, AC5.x, AC6.1 |
| M5 | Wed 13:00–16:00 | Railway deploy, edge-case pass (§8), RPC fallback, mobile check | E1–E20 spot-checked |
| M6 | Wed 16:00–19:00 | Seed real invoices via the UI. README. 90-second video. | AC7.x |
| M7 | Wed 19:00–22:00 | **Submit on DoraHacks** | M6 metric met |
| — | Wed 22:00–Thu 04:59 | Buffer. Stretch features (F9 → F10 → F11) **only** if M7 is done. | — |

**Schedule rule:** if a milestone overruns by more than 2 hours, cut the next stretch feature and move polish into the buffer. Never cut F1–F8.

### 90-second demo script (no narration, on-screen captions only)
1. 0–20 s: `/new`, create **INV-0042** for 0.50 USDC, copy link.
2. 20–45 s: open link as payer. "✓ Details match on-chain". Approve, then Pay. **"Settled in 0.6 s · fee $0.01"**.
3. 45–65 s: "Try paying again", then **red "Blocked by contract: AlreadyPaid"**, then the failed transaction in the explorer.
4. 65–90 s: ledger, Download CSV, open in Sheets: INV-0042 matched to its transaction. End card: "One invoice. One payment. Enforced by Arc."

## 13. Boundaries for whoever builds this

- **Always:** mainnet only. 6-decimal ERC-20 amounts. Re-read chain state after any error. Run tests before every deploy. Exact-amount approvals.
- **Ask first:** adding any dependency beyond §7.2. Any contract change after the mainnet deploy (it means redeploying and re-seeding). Changing the CSV columns.
- **Never:** deploy to a testnet. Commit keys or `.env`. Add an owner, admin or pause. Hold user funds in the contract. Auto-retry a payment transaction. Put personal data in `ref`.

## 14. Open questions

1. **Is Arc Memo live on mainnet?** It's listed on the mainnet address page, but Arc's June blog said testnet only. Answered by M0's `eth_getCode`, which decides F10.
2. **`eth_getLogs` limits on Arc's public RPC.** The design avoids range scans (`paidBlock`), but confirm a single-block query works on the fallback provider too.
3. **Which explorer URL is canonical** for links in the UI and CSV: `explorer.arc.io` vs Arcscan. Confirm in M0 and put it in `chain.ts`.
4. **Does the Arc USDC blocklist also block `transferFrom` to an issuer who gets blocklisted after creating an invoice?** Assume yes: the payment reverts and E13 handles it.

---
*Sources behind design decisions: Arc docs (contract addresses, transaction memos, EIP-3009 relayer), Request Network payment-network docs, Coinbase Commerce Onchain Payment Protocol, the Commerce Payments Protocol (Shopify Engineering), ERC-7699, Solana Pay transfer requests, and the user's own problem research (r/StableCoins, r/CFO, r/Accounting).*
