# CLAUDE.md — Consigna

**Consigna: duplicate-proof USDC invoice payments on Arc mainnet. One invoice, one payment, enforced by the chain, with books that export themselves.**

Spec: `docs/PRD.md` is the source of truth. If this file and the PRD disagree, the PRD wins. Update the PRD first, then the code.

---

## 0. Hard rules (read every session)

1. **Arc MAINNET ONLY.** Chain ID **5042**, RPC `https://rpc.mainnet.arc.io`. Never deploy, configure or suggest a testnet (5042002, faucets, Sepolia, anything). Unit tests run on Hardhat's in-memory local network. That is not a testnet and nothing is deployed there.
2. **Git commits have no AI attribution.** No `Co-Authored-By`, no "Generated with", no Claude/AI lines in commit messages or PR bodies.
3. **Deadline:** submit by **Wed Oct 14, 22:00 Lagos**. The hard close is Thu Oct 15, 04:59 Lagos (Oct 14, 23:59 ET). Scope bends, the date doesn't.
4. **F1–F8 must ship. F9–F11 are stretch and only start after submission (Phase 7) is done.**
5. Dev machine is **Windows**. Give PowerShell-compatible commands. Don't assume WSL, bash-only tools or VS Code.

## 1. What and why

**What:** an issuer creates an invoice on-chain. The ID is derived from issuer + ref, and the amount, token and payee are bound to it. A payer pays it once, straight to the issuer. Any second payment **reverts in the contract** (`AlreadyPaid`). The ledger and CSV are rebuilt purely from chain reads. There's no backend, no database and no indexer.

**Why:** businesses paying in USDC hit duplicate payments and manual reconciliation (quotes in PRD §1). Every existing tool (Request Network, Solana Pay references, ERC-7699, Arc Memo, Cryptio-style accounting tools) **detects** a duplicate after it settles. Consigna **prevents** it at settlement.

**Why it qualifies for Arc Microgrants** (Circle / Arc, DoraHacks, 20 × 500 USDC):
- It's deployed and working on **Arc mainnet**, which is required. Testnet-only builds are ineligible.
- It has a real Arc component. It uses USDC as both the payment token and gas (~$0.01 predictable fees), ~0.5s deterministic finality ("paid" is final), native Circle tokens (USDC + EURC) and optionally Arc's native Memo contract.
- It fits Circle's thesis of programmable dollars for payments and back-office settlement, the institutional use case Arc targets.
- Submission needs: live link, public repo, short description including **what it uses Arc for**, and a public builder profile (GitHub/X/Farcaster).
- Ineligible: mockups, decks, testnet-only builds, work already funded by Circle/Arc. Consigna is new work.
- Judged on relevance to Arc, technical credibility, build quality and whether it's worth taking further.

## 1b. Budget

~3 USDC on Arc mainnet total (~1.5 Issuer/deployer, ~1.5 Payer). Real spend ≈ $0.50 gas + exchange withdrawal fee. Smoke test uses 0.01 USDC invoices; demo invoices 0.10–0.50 USDC. Payments loop Payer → Issuer; top Payer back up from Issuer when low. Never ask the user to add more money unless a balance check proves it's needed.

## 2. Tech stack

Pin exact versions at install time (`npm i -E`) and commit the lockfile. Keep the majors below.

| Layer | Tool | Version |
|---|---|---|
| Runtime | Node.js LTS | 22.x or 24.x (even-numbered LTS only) |
| Contract language | Solidity | **0.8.26** (exact, optimizer on, 200 runs) |
| Contract libs | `@openzeppelin/contracts` | 5.x (`SafeERC20`, `IERC20`) |
| Contract tooling | `hardhat` | 2.26.x (pinned 2.26.5). Toolbox 3.0.0 pulls `hardhat-verify` 2.1.3, which needs Hardhat ≥ 2.26, so 2.22.x cannot resolve. |
| | `@nomicfoundation/hardhat-toolbox-viem` | 3.0.0, the only 3.x release (includes viem, chai, solidity-coverage) |
| | `dotenv` | 16.x |
| | `tsx` / TypeScript | 5.x |
| Frontend | `vite` + `@vitejs/plugin-react` | 6.x |
| | `react`, `react-dom` | 19.x |
| | `react-router` | 7.x |
| | `wagmi` | 2.x |
| | `viem` | 2.x |
| | `@tanstack/react-query` | 5.x |
| | `tailwindcss` + `@tailwindcss/vite` | 4.x |
| | Untitled UI (free components, no PRO) | latest via its CLI |
| Hosting | Railway, static (`serve -s dist`) | `serve` 14.x |

### Arc mainnet constants (`web/src/lib/chain.ts` and `hardhat.config.ts`)

| Name | Value |
|---|---|
| Chain ID | `5042` (`0x13b2`) |
| RPC (primary) | `https://rpc.mainnet.arc.io` |
| RPC (fallback) | `https://rpc.quicknode.mainnet.arc.io` (no key), then `https://rpc.drpc.mainnet.arc.io` (`VITE_ARC_RPC_FALLBACK`) |
| Native currency | USDC, **18 decimals** (gas only, never used for amounts) |
| USDC ERC-20 | `0x3600000000000000000000000000000000000000`, **6 decimals** |
| EURC | `0xbEf5f6d51CB62b58e6A8f77868681825C6fe21c1`, 6 decimals |
| Memo (stretch) | `0x5294E9927c3306DcBaDb03fe70b92e01cCede505` (confirm on mainnet with `eth_getCode` in Phase 0) |
| Multicall3 | `0xcA11bde05977b3631167028862bE2a173976CA11` |
| Fee floor | `maxFeePerGas` ≥ **20 gwei** |
| Explorer | `https://explorer.arc.io` (canonical, per Arc RPC docs) |
| `eth_getLogs` limit | **10,000 blocks per request** on the public RPC (error `-32012`) |

## 3. Repo structure

```
consigna/
├─ CLAUDE.md                  ← this file
├─ README.md                  ← judge-facing: problem, what it uses Arc for, live link, contract address, video
├─ docs/
│  └─ PRD.md                  ← source of truth for requirements and acceptance criteria
├─ contracts/
│  ├─ Consigna.sol            ← the only production contract
│  └─ test/MockUSDC.sol       ← 6-decimal ERC-20 for local unit tests only
├─ test/
│  └─ Consigna.test.ts        ← every acceptance criterion in AC1.x; 100% branch coverage
├─ scripts/
│  ├─ deploy.ts               ← mainnet deploy; writes address + block to deployments/arc.json
│  ├─ smoke.ts                ← mainnet: 0.01 USDC create → pay → duplicate (reverts) → cancel
│  ├─ seed.ts                 ← optional helper; demo data should mainly come through the UI
│  └─ verify-bytecode.ts      ← compiles and compares against eth_getCode; prints MATCH
├─ deployments/arc.json       ← { address, deployBlock, txHash } (committed after deploy)
├─ hardhat.config.ts          ← networks: hardhat (local), arc (5042)
├─ .env.example               ← DEPLOYER_KEY=, PAYER_KEY=, ARC_RPC=  (real .env is git-ignored)
└─ web/
   ├─ index.html
   ├─ vite.config.ts
   └─ src/
      ├─ main.tsx, App.tsx    ← router: /, /new, /i/:id, /ledger/:issuer
      ├─ pages/               ← Home, NewInvoice, PayInvoice, Ledger
      ├─ components/          ← StatusBadge, TxStepper, ConnectButton, DuplicateResult, ...
      └─ lib/
         ├─ chain.ts          ← Arc chain def, addresses, fallback transport
         ├─ abi.ts            ← Consigna ABI (generated from artifacts)
         ├─ consigna.ts       ← readInvoice, listInvoices, create, approveExact, pay, payUnsimulated, cancel, decodeRevert
         ├─ details.ts        ← encodeDetails / decodeDetails / hashDetails (the ONLY place canonical JSON lives)
         ├─ csv.ts            ← toCsv with formula-injection escaping
         └─ format.ts         ← 6-decimal parse/format, address truncation, times
```

## 4. Contract summary (full interface in PRD §7.3)

- `createInvoice(string ref, address token, uint96 amount, bytes32 detailsHash) → bytes32 id`. Sets `id = keccak256(abi.encode(msg.sender, ref))`. Ref is 1–32 bytes and can never be reused, even after cancel. Token must be USDC or EURC (immutable). Amount must be > 0.
- `pay(bytes32 id)` requires `Open`. It **sets `Paid` + payer + paidAt + paidBlock first**, then calls `SafeERC20.safeTransferFrom(msg.sender, issuer, amount)`. The contract never holds funds.
- `cancel(bytes32 id)`: issuer only, `Open` only.
- Views: `idFor`, `getInvoice`, `invoiceCount`, `invoicesOf(issuer, offset, limit)`, `isAllowedToken`.
- Errors: `InvoiceNotFound`, `AlreadyPaid(id, paidBy, paidAt)`, `InvoiceWasCancelled`, `NotIssuer`, `TokenNotAllowed`, `InvalidAmount`, `InvalidRef`, `RefAlreadyUsed`.
- Events: `InvoiceCreated`, `InvoicePaid`, `InvoiceCancelled`.
- **No owner. No admin. No pause. No proxy. No upgrade.**

## 5. Build phases

Times are Lagos (UTC+1). Exit checks reference the PRD's acceptance criteria.

- [ ] **Phase 0: Setup (Tue 09:00–10:00)**
  - [ ] Scaffold the repo per §3, initialize git, add `.gitignore` (`.env`, `node_modules`, `artifacts`, `cache`, `coverage`, `dist`)
  - [ ] Withdraw ~3 USDC to Arc (exchange withdrawal on the Arc network); split ~1.5 Issuer / ~1.5 Payer
  - [ ] Confirm `eth_chainId` = `0x13b2`
  - [ ] `eth_getCode` on Memo → record **live / not live** (decides F10)
- [ ] **Phase 1: Contract (Tue 10:00–14:00)**
  - [ ] `MockUSDC.sol` (6 decimals)
  - [ ] Tests written first for AC1.1–AC1.8
  - [ ] `Consigna.sol` passes them
  - [ ] `npx hardhat coverage`: 100% branches on `Consigna.sol` (AC1.9)
- [ ] **Phase 2: Mainnet deploy (Tue 14:00–16:00)**
  - [ ] `deploy.ts` → `deployments/arc.json`
  - [ ] `smoke.ts` passes on mainnet, prints 4 explorer links (AC1.10)
  - [ ] `verify-bytecode.ts` prints `MATCH` (AC8.1)
  - [ ] Contract address in the README
  - [ ] **Contract frozen.** Any change after this means a redeploy and re-seed. Ask first.
- [ ] **Phase 3: Create and pay UI (Tue 16:00–23:00)**
  - [ ] `chain.ts`, `consigna.ts`, `details.ts`, `format.ts` (+ unit test: `parse("5.00") === 5_000_000n`)
  - [ ] `/new` (Flow A) → AC2.1, AC2.2
  - [ ] `/i/:id` (Flow B) → AC3.1–AC3.4
- [ ] **Phase 4: Duplicate, ledger, cancel (Wed 09:00–13:00)**
  - [ ] Duplicate flow (Flow C) → AC4.1, AC4.2
  - [ ] `/ledger/:issuer` plus CSV (Flow D) → AC5.1–AC5.3
  - [ ] Cancel → AC6.1
- [ ] **Phase 5: Harden and host (Wed 13:00–16:00)**
  - [ ] Deploy to Railway
  - [ ] Fallback RPC transport
  - [ ] Pass through edge cases E1–E20 (PRD §8)
  - [ ] Check in one mobile wallet's in-app browser
- [ ] **Phase 6: Demo assets (Wed 16:00–19:00)**
  - [ ] Seed via the **deployed UI**: ≥ 6 invoices (≥ 4 paid, ≥ 1 cancelled, ≥ 1 open) plus ≥ 1 duplicate reverted on-chain
  - [ ] README first screen: problem, what it uses Arc for, live link, contract, video
  - [ ] Record the 90-second video (§7)
- [ ] **Phase 7: Submit (Wed 19:00–22:00)**
  - [ ] DoraHacks: live link, public repo, description, builder profile
- [ ] **Buffer / stretch (Wed 22:00–Thu 04:59), only after Phase 7**
  - [ ] F9: EURC selector in `/new`
  - [ ] F10: pay via Memo (only if live in Phase 0; EOA only)
  - [ ] F11: QR code for the payment link

**Overrun rule:** if a phase runs more than 2 hours late, drop the next stretch item. Never cut F1–F8.

## 6. Commands

```powershell
# --- one-time scaffold (repo root) ---
npm init -y
npm i -D -E hardhat@2.26.5 @nomicfoundation/hardhat-toolbox-viem@3.0.0 typescript tsx dotenv
npm i -E @openzeppelin/contracts
copy .env.example .env                 # then fill DEPLOYER_KEY, PAYER_KEY, ARC_RPC
# (hardhat.config.ts is hand-written: `npx hardhat init` is interactive and was not used)

# --- contracts ---
npx hardhat compile
npm run test                           # = npx hardhat test; local in-memory network only
npm run coverage                       # must be 100% branches for Consigna.sol
#   Without npm, PowerShell:  $env:SOLIDITY_COVERAGE="true"; npx hardhat coverage
#   The hardhat-viem plugin refuses to run coverage unless SOLIDITY_COVERAGE=true is set.

# --- Arc mainnet (chainId 5042) ---
npx hardhat run scripts/deploy.ts --network arc
npx hardhat run scripts/smoke.ts --network arc
npx hardhat run scripts/verify-bytecode.ts --network arc

# --- chain sanity checks (PowerShell) ---
$b = '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}'
Invoke-RestMethod -Uri https://rpc.mainnet.arc.io -Method Post -ContentType 'application/json' -Body $b
$b = '{"jsonrpc":"2.0","id":1,"method":"eth_getCode","params":["0x5294E9927c3306DcBaDb03fe70b92e01cCede505","latest"]}'
Invoke-RestMethod -Uri https://rpc.mainnet.arc.io -Method Post -ContentType 'application/json' -Body $b

# --- frontend ---
npm create vite@latest web -- --template react-ts
cd web
npm i -E wagmi viem @tanstack/react-query react-router
npm i -D -E tailwindcss @tailwindcss/vite
npm run dev
npm run build
npx serve -s dist                      # local check of the production build (SPA fallback)

# --- Railway (from web/) ---
#   Build:  npm ci && npm run build
#   Start:  npx serve -s dist -l $PORT
#   Env:    VITE_CONSIGNA_ADDRESS, VITE_ARC_RPC_FALLBACK, VITE_EXPLORER_URL
```

`hardhat.config.ts` network entry:
```ts
arc: { type: "http", url: process.env.ARC_RPC ?? "https://rpc.mainnet.arc.io", chainId: 5042, accounts: [process.env.DEPLOYER_KEY!] }
```

## 7. Demo plan: what the judge sees, in order

**90-second video, no narration, on-screen captions only:**
1. **0–20 s:** `/new` → create **INV-0042**, 0.50 USDC, one line item → confirm → "Copy link".
2. **20–45 s:** open the link as the payer → "✓ Details match the on-chain invoice" → Approve 0.50 USDC → Pay → **"Paid · settled in 0.6 s · fee 0.01 USDC"**.
3. **45–65 s:** "Try paying again" → **red "Blocked by contract: AlreadyPaid — paid by 0xab…12 at 10:42:07"** → click through to the **failed transaction on the Arc explorer**.
4. **65–90 s:** `/ledger/<issuer>` → Download CSV → open in Google Sheets → INV-0042 row with its transaction link. End card: **"One invoice. One payment. Enforced by Arc."**

**What a judge can check without a wallet:** the live pay page for a paid invoice, the ledger, the contract on the explorer, the failed duplicate transaction and `verify-bytecode.ts` in the repo.

## 8. 60-second spoken pitch

> Businesses already pay contractors and suppliers in USDC because it's cheaper than bank rails. But their finance teams say the back office is breaking. Payments don't carry invoice numbers, month-end close is manual, and duplicate payments slip through. Once a stablecoin duplicate settles, it's gone.
>
> Every tool today spots a duplicate after the money has left. Consigna stops it before.
>
> An issuer creates an invoice on Arc. The amount and the recipient are locked to that invoice on-chain. The payer pays once, straight to the issuer, settled in under a second for about a cent. If anyone tries to pay it again, a colleague, a retry or a double click, the contract rejects it. You can see the failed transaction on the explorer.
>
> Then the issuer downloads a CSV that's rebuilt purely from the chain, ready for their accountant.
>
> No backend, no database, no admin keys, and the contract never holds funds. It runs on Arc mainnet today because Arc makes dollars the gas, makes finality instant, and is built for exactly this: programmable money that institutions can trust.
>
> Consigna. One invoice, one payment, enforced by Arc.

## 9. Known errors and bad patterns to avoid

| Trap | Do this instead |
|---|---|
| Mixing **18-decimal native USDC** with the **6-decimal ERC-20** | All amounts go through `format.ts` with 6 decimals via `0x3600…0000`. Never use `getBalance()` for payment math, only `balanceOf`. |
| Wallet shows the native balance as "ETH" | Cosmetic. In `wallet_addEthereumChain`, set `nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 }`. |
| `maxFeePerGas` below the 20 gwei floor → transaction rejected | Set the floor explicitly in Hardhat scripts and in viem writes if estimation comes in low. |
| viem `writeContract` **simulates first**, so a duplicate never reaches the chain and the demo shows nothing on the explorer | `payUnsimulated()` uses `sendTransaction` with encoded calldata and a fixed `gas: 120_000n`, then decodes the revert via `eth_call` at the receipt block. |
| Blocklist reverts **produce no receipt** | `waitForTransactionReceipt` with a 30 s timeout, then re-read `getInvoice`. Never resend automatically. |
| Same name for an error and an event (`InvoiceCancelled`) → compile error | Error is `InvoiceWasCancelled`, event is `InvoiceCancelled`. |
| Making invoice IDs a function argument → squatting and front-running | ID is derived in the contract from `msg.sender` + ref only. |
| Interactions before effects | Status changes to `Paid` **before** `safeTransferFrom`. |
| Plain `transferFrom` and ignoring its return value | `SafeERC20.safeTransferFrom`. |
| Unlimited approvals (`maxUint256`) | Approve exactly the invoice amount. |
| Trusting amount or payee from the URL | Pay with values read from `getInvoice` only. The link's details are display-only, after the hash check. |
| Moving details from `#fragment` to `?query` | Never. The fragment stays client-side and is never sent to Railway or logged. |
| Scanning logs from the deploy block for every page load | Use `invoicesOf` + Multicall3. Fetch an `InvoicePaid` log only at `paidBlock`. |
| CSV formula injection via `ref` | Prefix cells starting with `= + - @`, tab or CR with `'`. |
| Calling Memo from a smart-contract wallet, or via `DELEGATECALL`/`STATICCALL` | Memo is EOA-only. Check `getCode(account)` and fall back to direct `pay`. |
| Expecting explorer source verification | Not available on Arc yet. Rely on `verify-bytecode.ts` and the public repo. |
| `eth_getLogs` over more than 10,000 blocks → `-32012` | Never range-scan. Query only `paidBlock` (single block). Any history paging uses chunks of ≤ 9,999 blocks, sequentially. |
| Public RPC returns `-32014` on very recent blocks (load-balanced) | Retry with short backoff (300 ms, 600 ms, 1.2 s), then fall back to the next transport. |
| CRLF line endings on Windows change the Solidity metadata hash → `verify-bytecode` mismatch on other machines | `.gitattributes` with `* text=auto eol=lf`; `git config --global core.autocrlf input`. |
| SPA routes 404 on Railway refresh | Serve with `serve -s` (single-page fallback). |
| Hardcoding testnet values copied from Arc docs (many examples use 5042002 / `rpc.testnet.arc.io`) | Always replace with mainnet values from §2. |
| Showing an error banner when the user rejects in the wallet | Return silently to the current step. |

## 10. Things NOT to do

- Don't deploy to, configure or mention any testnet or faucet.
- Don't add an owner, admin, pause, proxy, upgradeability or `selfdestruct`.
- Don't let the contract hold funds or add escrow, refunds, partial or over-payments.
- Don't add a backend, database, indexer, login or email. The PRD rules them out.
- Don't put personal data in `ref`, since it's public on-chain.
- Don't change the contract after the Phase 2 freeze without asking. It means a redeploy and re-seed.
- Don't add dependencies beyond §2 without asking.
- Don't commit `.env`, private keys or RPC keys. Hackathon wallets hold ≤ $10 total (plan: ~3 USDC).
- Don't auto-retry payment transactions.
- Don't start stretch features (F9–F11) before Phase 7 is submitted.
- Don't use `tx.origin`, `block.timestamp` for anything but `paidAt`/`createdAt`, or a floating pragma.
- Don't add AI attribution (`Co-Authored-By`, "Generated with Claude") to commits or PRs.
- Don't write marketing copy in the UI. One primary action per screen, plain labels, status as text and icon.
