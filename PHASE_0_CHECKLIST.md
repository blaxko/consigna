# PHASE 0 CHECKLIST — Consigna

Everything that must be true **before you open Claude Code**. Arc **mainnet only** (chain ID 5042): no testnet, no faucet, anywhere.

**Do sections 1–2 tonight (Mon).** Exchange verification and withdrawals can take hours. Sections 3–9 fit in Tue 08:00–10:00 Lagos.

---

## 1. Accounts and API keys

### GitHub (required: public repo plus builder profile)
- [ ] Signed in at https://github.com
- [ ] Profile has your real or chosen display name, an avatar and a one-line bio (DoraHacks needs a **public builder profile**)
- [ ] Settings → Emails → **"Keep my email addresses private"** turned on. Copy your noreply address (`<id>+<username>@users.noreply.github.com`) for §8.
- [ ] Created an **empty public** repo `consigna` (no README, no .gitignore, no licence, so the first push is clean). Repo URL written down: `https://github.com/<you>/consigna`

### DoraHacks (required: where you submit)
- [ ] Signed in at https://dorahacks.io and opened https://dorahacks.io/hackathon/arc-microgrants
- [ ] Found the submit button (usually "Submit BUIDL") and noted every required field in §6.1
- [ ] Profile linked to your GitHub (or X/Farcaster) so the builder profile is public

### Railway (required: hosting the live link)
- [ ] Signed in at https://railway.com with GitHub
- [ ] Billing page shows available credit or an active plan (a static site uses very little, but it can't run with $0)
- [ ] Created an empty project named `consigna` (you'll connect the repo in Phase 5)

### Exchange that withdraws USDC on Arc (required: funding)
Pick **one** you can already use from Nigeria: **OKX**, **KuCoin** or **Kraken**. All three support USDC deposits and withdrawals on the Arc network.
- [ ] Account verified (KYC complete). **Do this tonight.**
- [ ] At least **3 USDC + the withdrawal fee** in the spot/funding account (bought via P2P or a deposit). If the exchange's minimum withdrawal is above 3 USDC, buy the minimum instead.
- [ ] Opened Withdraw → USDC and **confirmed "Arc" appears as a network**. Noted the withdrawal fee and minimum: `fee: ____ USDC, minimum: ____ USDC`

### RPC (no key needed)
- [ ] Primary `https://rpc.mainnet.arc.io` answers `eth_chainId` with `0x13b2` (command in §3.6)
- [ ] Fallback `https://rpc.quicknode.mainnet.arc.io` answers `0x13b2`
- [ ] Second fallback `https://rpc.drpc.mainnet.arc.io` answers `0x13b2`
- [ ] *(Optional, skip unless the above fail)* Alchemy key from https://dashboard.alchemy.com with Arc mainnet enabled and an allowlist set to your Railway domain. URL format: `https://arc-mainnet.g.alchemy.com/v2/<KEY>`

---

## 2. Wallets and credentials

> ⚠️ **Safety rules**
> - Use a **brand-new wallet (new seed phrase)** for this hackathon. Never use your main wallet: its private key goes into a `.env` file on disk.
> - This hackathon wallet **never holds more than $10**.
> - Never paste a seed phrase or private key into Claude, chat, GitHub, Discord or any website. Only into your local `.env`.
> - Anyone offering "free mainnet USDC" or an "ARC token airdrop" is a scam. There is no Arc token and no mainnet faucet.

- [ ] MetaMask installed in Chrome from https://metamask.io/download (check the publisher is "MetaMask" in the Chrome Web Store)
- [ ] Created a **new** wallet (not imported). Seed phrase written **on paper** and stored offline.
- [ ] Renamed Account 1 to **`Consigna Issuer`**. This is also the deployer.
- [ ] Added Account 2, renamed **`Consigna Payer`**
- [ ] Added Arc mainnet to MetaMask (Settings → Networks → Add network manually):
  - Network name `Arc` · RPC `https://rpc.mainnet.arc.io` · Chain ID `5042` · Symbol `USDC` · Explorer `https://explorer.arc.io`
  - A symbol mismatch warning is expected. The native balance is USDC even if anything says "ETH".
- [ ] **Test withdrawal:** sent the exchange's minimum USDC to `Consigna Issuer` on the **Arc** network, and it arrived
- [ ] **Main withdrawal:** total of **≈ 3 USDC** on Arc in `Consigna Issuer` (skip this if the test withdrawal already brought 3 USDC)
- [ ] Sent **1.5 USDC** from Issuer to `Consigna Payer` inside MetaMask. This is your first Arc mainnet transaction, and it confirms gas works.
- [ ] Both balances checked on https://explorer.arc.io (search each address). Issuer ≈ 1.5 USDC, Payer ≈ 1.5 USDC.
- [ ] Exported both private keys (MetaMask → account → Account details → Show private key). They go **only** into `.env` in §6.6, never into any other file.
- [ ] Second Chrome profile created (`Consigna Payer`) with MetaMask set up for the payer account only. This lets the video show two people. *(Or accept switching accounts on camera.)*
- [ ] *(Optional, for mobile check E-tests)* OKX Wallet or MetaMask mobile installed, with Arc mainnet visible

Money flow sanity: in the demo the payer pays the issuer, and both wallets are yours. **You only lose gas** (about $0.01 per transaction) plus exchange withdrawal fees.

---

## 3. Tools to install (Windows, PowerShell)

Open **PowerShell** (not as administrator unless winget asks).

### 3.1 Node.js (even LTS: 22.x or 24.x)
- [ ] `winget install OpenJS.NodeJS.LTS`
- [ ] Closed and reopened PowerShell
- [ ] `node -v` prints `v22.x.x` or `v24.x.x`
- [ ] `npm -v` prints `10.x` or higher

### 3.2 Git
- [ ] `winget install Git.Git`
- [ ] Reopened PowerShell; `git --version` prints `git version 2.4x` or higher

### 3.3 GitHub CLI (makes pushing painless)
- [ ] `winget install GitHub.cli`
- [ ] `gh auth login` → GitHub.com → HTTPS → login with browser → done
- [ ] `gh auth status` shows "Logged in to github.com"

### 3.4 Claude Code desktop
- [ ] Claude desktop app updated to the latest version, Code tab opens
- [ ] Can open a local folder in it (you'll point it at `C:\dev\consigna` in §9)

### 3.5 Recording and demo tools
- [ ] Screen recording works: Windows 11 Snipping Tool video (**Win + Shift + R**), or `winget install OBSProject.OBSStudio`
- [ ] Captions editor: Clipchamp (preinstalled on Windows 11) opens
- [ ] Google Sheets opens in Chrome (for the CSV step of the demo)

### 3.6 Chain checks (paste into PowerShell)
- [ ] Chain ID on all three RPCs:
  ```powershell
  $b = '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}'
  foreach ($u in 'https://rpc.mainnet.arc.io','https://rpc.quicknode.mainnet.arc.io','https://rpc.drpc.mainnet.arc.io') {
    (Invoke-RestMethod -Uri $u -Method Post -ContentType 'application/json' -Body $b).result
  }
  ```
  Each line prints `0x13b2`.
- [ ] USDC ERC-20 has code (must **not** be `0x`):
  ```powershell
  $b = '{"jsonrpc":"2.0","id":1,"method":"eth_getCode","params":["0x3600000000000000000000000000000000000000","latest"]}'
  (Invoke-RestMethod -Uri https://rpc.mainnet.arc.io -Method Post -ContentType 'application/json' -Body $b).result.Length
  ```
  Prints a number greater than 2.
- [ ] **Memo contract check (decides stretch F10):**
  ```powershell
  $b = '{"jsonrpc":"2.0","id":1,"method":"eth_getCode","params":["0x5294E9927c3306DcBaDb03fe70b92e01cCede505","latest"]}'
  (Invoke-RestMethod -Uri https://rpc.mainnet.arc.io -Method Post -ContentType 'application/json' -Body $b).result
  ```
  Result recorded: **Memo on mainnet = LIVE / NOT LIVE** (circle one). `0x` means not live.

> **Not installed, on purpose:** VS Code, Foundry, WSL, Docker, any testnet tooling. Hardhat comes in through `npm` in Phase 1.

---

## 4. Docs and repos to read first (about 90 minutes total)

Read in this order. Tick only when you can answer the question in brackets.

- [ ] Arc: connect to Arc / RPC endpoints, https://docs.arc.io/arc/references/rpc-endpoints *(What's the getLogs block limit? → 10,000)*
- [ ] Arc: contract addresses, https://docs.arc.io/arc/references/contract-addresses *(How many decimals does USDC's ERC-20 interface use? → 6)*
- [ ] Arc: EVM differences / gas page, linked from https://docs.arc.io/build *(What's the `maxFeePerGas` floor? → 20 gwei)*
- [ ] Arc: transaction memos, https://docs.arc.io/arc/concepts/transaction-memos *(Can a Safe wallet call Memo directly? → no, EOA only)*
- [ ] Arc: EIP-3009 relayer page, https://docs.arc.io/integrate/relayers-and-paymasters/eip-3009-relayer *(What happens with a blocklisted transfer? → reverts, may have no receipt)*
- [ ] Arc: sample apps index, https://docs.arc.io/arc/references/sample-applications. Skim **Arc commerce** and **Arc P2P payments** for how they configure wagmi/viem for Arc.
- [ ] OpenZeppelin `SafeERC20`, https://docs.openzeppelin.com/contracts/5.x/api/token/erc20#SafeERC20 *(Why not plain `transferFrom`? → non-standard return values)*
- [ ] viem `sendTransaction` and `waitForTransactionReceipt`, https://viem.sh/docs/actions/wallet/sendTransaction *(How do you set a fixed gas limit? → `gas`)*
- [ ] viem `decodeErrorResult`, https://viem.sh/docs/contract/decodeErrorResult *(Input needed? → ABI + revert data)*
- [ ] wagmi getting started, https://wagmi.sh/react/getting-started *(Where do you define a custom chain? → `defineChain` from viem)*
- [ ] Hardhat + viem toolbox, https://hardhat.org/hardhat-runner/docs/getting-started *(Which command runs coverage? → `npx hardhat coverage`)*
- [ ] Railway static sites, https://docs.railway.com *(Search "static"; know which start command serves `dist`.)*
- [ ] Re-read the DoraHacks page rules once more (your own `docs/PRD.md` §1–2 lists them)
- [ ] Your own `CLAUDE.md` and `docs/PRD.md`, end to end

---

## 5. Risk parameters (decide now, write the values here)

These get baked into an **immutable** contract and the UI. Changing them after Phase 2 means a redeploy.

| # | Parameter | Decision |
|---|---|---|
| R1 | Max USD ever held in hackathon wallets | **$10** |
| R2 | Money landing on Arc / actually spent | **3 USDC** on Arc; spend ≈ $0.50 gas + the exchange withdrawal fee. The rest stays yours. |
| R3 | Smoke-test invoice amount (Phase 2) | **0.01 USDC** |
| R4 | Demo invoice amounts | **0.10–0.50 USDC** (money loops Payer → Issuer; send it back to Payer if it runs low) |
| R5 | Tokens allowlisted in the constructor (immutable) | **USDC + EURC** (EURC only shown in the UI if F9 ships) |
| R6 | Payer balance margin required before Pay | **amount + 0.05 USDC** |
| R7 | Approval size | **Exactly the invoice amount**, never unlimited |
| R8 | Gas limit for the deliberate duplicate transaction | **120,000** |
| R9 | `maxFeePerGas` floor | **20 gwei** |
| R10 | Receipt timeout before "not confirmed" message | **30 s**, then poll status every 3 s for 60 s |
| R11 | `ref` rules | **1–32 chars**, `[A-Za-z0-9-_./]` |
| R12 | Max details JSON size in link | **1,500 bytes** |
| R13 | Fallback RPC order | Arc public → QuickNode → dRPC |
| R14 | Explorer URL | `https://explorer.arc.io` |
| R15 | Memo (F10) | **Build only if §3.6 says LIVE**, and only after submission |
| R16 | Licence | **MIT** |
| R17 | Railway URL | `https://consigna-<suffix>.up.railway.app` (write the real one in Phase 5) |

- [ ] Every row above has been read and you agree. Anything changed is written in the table.

---

## 6. Content to pre-write (save each as a file in the repo folder)

### 6.1 DoraHacks submission fields → `docs/SUBMISSION.md`
- [ ] Required fields copied from the DoraHacks form (§1)
- [ ] Draft description pasted in (edit freely):
  > **Consigna: duplicate-proof USDC invoice payments on Arc.**
  > Businesses paying suppliers in USDC lose time to manual reconciliation and lose money to duplicate payments, which can't be reversed once they settle. Existing tools only detect duplicates after the fact. Consigna prevents them: an issuer creates an invoice on Arc with the amount and recipient locked on-chain, the payer pays once directly to the issuer, and any second payment is rejected by the contract. The issuer exports an accountant-ready CSV rebuilt purely from chain data.
  >
  > **What it uses Arc for:** USDC as both payment and gas (about one cent, predictable fees), sub-second deterministic finality so "paid" is final immediately, native Circle tokens (USDC, EURC), and the contract deployed on Arc mainnet. No backend, no database, no admin keys, and the contract never holds funds.
- [ ] Placeholders listed for links you'll fill on Wednesday: live link, repo, contract address, video, builder profile

### 6.2 Seed invoice set (Phase 6) → `docs/DEMO_DATA.md`
- [ ] Table written:

| Ref | Client | Line item | Amount | End state |
|---|---|---|---|---|
| INV-0040 | Acme Inc. | Brand audit | 0.10 USDC | Paid |
| INV-0041 | Lagos Studio | Landing page copy | 0.20 USDC | Paid |
| INV-0042 | Acme Inc. | Logo design | 0.50 USDC | Paid + **1 duplicate attempt** (video invoice) |
| INV-0043 | Northwind | API integration | 0.30 USDC | Paid |
| INV-0044 | Northwind | Rush fee (issued by mistake) | 0.25 USDC | Cancelled |
| INV-0045 | Acme Inc. | Monthly retainer | 0.40 USDC | Open (judges can see a payable invoice) |

### 6.3 Video captions → `docs/VIDEO.md`
- [ ] Caption 1 (0–20 s): "An issuer creates invoice INV-0042 on Arc mainnet."
- [ ] Caption 2 (20–45 s): "The client pays once. Settled in under a second, for about one cent."
- [ ] Caption 3 (45–65 s): "They try to pay again. The contract refuses. It's a real failed transaction on Arc's explorer."
- [ ] Caption 4 (65–90 s): "Books close themselves: a CSV rebuilt purely from the chain."
- [ ] End card: "One invoice. One payment. Enforced by Arc."

### 6.4 Pitch
- [ ] Read the 60-second pitch in `CLAUDE.md` §8 aloud once with a timer. It comes in at ≤ 60 s, or you've trimmed it.

### 6.5 First prompt for Claude Code → `docs/SESSION_START.md`
- [ ] Saved:
  > Read CLAUDE.md and docs/PRD.md fully before doing anything. We are on Arc mainnet only (chain 5042), never a testnet. Phase 0 is complete; the results are in PHASE_0_CHECKLIST.md (Memo on mainnet = ____). Start Phase 1: scaffold Hardhat with the viem toolbox per CLAUDE.md §6, write MockUSDC and the tests for AC1.1–AC1.8 first, then Consigna.sol until they pass and coverage is 100% branches. Show me the test output. Don't deploy anything yet. Commit messages must not include any AI attribution.

### 6.6 Environment files
- [ ] `.env.example` (committed) contains only names:
  ```
  DEPLOYER_KEY=
  PAYER_KEY=
  ARC_RPC=https://rpc.mainnet.arc.io
  ```
- [ ] `.env` (never committed) contains the real `Consigna Issuer` key as `DEPLOYER_KEY` and the `Consigna Payer` key as `PAYER_KEY`, each starting with `0x`
- [ ] `web/.env.example` (created in Phase 3) will hold `VITE_CONSIGNA_ADDRESS=`, `VITE_ARC_RPC_FALLBACK=https://rpc.quicknode.mainnet.arc.io`, `VITE_EXPLORER_URL=https://explorer.arc.io`

---

## 7. The demo target (visualize before coding)

Sketch these four screens on paper or in Figma, one box per screen. Tick each when sketched. The finished app should look like your sketches.

- [ ] **`/new`**: one card. Reference field, client field, one line-item row (+ add row), total ("0.50 USDC"), single primary button "Review", then a review state with "Create on Arc".
- [ ] **`/i/<id>`**: invoice "paper" in the centre: ref, client, line items, total, issuer address. Status badge top-right (Open / Paid / Cancelled). Green "✓ Details match the on-chain invoice". One primary button "Pay 0.50 USDC" with a 2-step stepper (Allow → Pay).
- [ ] **Paid state plus duplicate result**: big "Paid · settled in 0.6 s · fee 0.01 USDC" with explorer link. Secondary "Try paying again". The **red** result card: "Blocked by contract: AlreadyPaid. Paid by 0xab…12 at 10:42:07", with a link to the failed transaction.
- [ ] **`/ledger/<issuer>`**: table (Ref, Created, Status, Amount, Payer, Paid at, Tx), filter pills (All/Open/Paid/Cancelled), totals (Paid / Outstanding), "Download CSV" top-right.
- [ ] The **one frame** a judge must remember is the red "Blocked by contract" card next to the explorer's failed transaction. It's the visual climax of the video.

---

## 8. Git identity (before the first commit)

- [ ] `git config --global user.name "Oladipupo Ayoola"`
- [ ] `git config --global user.email "<your GitHub noreply address from §1>"`
- [ ] `git config --global init.defaultBranch main`
- [ ] `git config --global core.autocrlf input` (stops Windows CRLF line endings from changing the compiled contract's metadata, which would break `verify-bytecode`)
- [ ] `git config --global --list` shows all four values above
- [ ] Repo folder created and linked:
  ```powershell
  mkdir C:\dev\consigna; cd C:\dev\consigna
  git init
  gh repo set-default <you>/consigna   # or: git remote add origin https://github.com/<you>/consigna.git
  ```
- [ ] `.gitattributes` created with exactly: `* text=auto eol=lf`
- [ ] `.gitignore` created with: `node_modules/` `.env` `artifacts/` `cache/` `coverage/` `coverage.json` `typechain-types/` `dist/` `web/dist/` `web/.env`
- [ ] Copied `CLAUDE.md`, `PHASE_0_CHECKLIST.md`, `docs/PRD.md` and the `docs/*.md` files from §6 into the folder
- [ ] **No AI attribution:** in Claude Code, set commit attribution off (Settings, or `.claude/settings.json` in the repo with `{ "includeCoAuthoredBy": false }`). Rule 2 in `CLAUDE.md` also says it.
- [ ] First commit made **by you**: `git add . ; git commit -m "Project brain: CLAUDE.md, PRD, Phase 0 checklist"`
- [ ] `git log -1 --format=%B` shows **no** `Co-Authored-By` or AI lines
- [ ] `git ls-files | findstr /i ".env"` shows **only** `.env.example`
- [ ] `git push -u origin main` succeeded, and the files are visible on GitHub

---

## 9. Final sanity check (all must be ✓ before opening Claude Code)

- [ ] `node -v`, `git --version` and `gh auth status` all succeed
- [ ] All three RPCs return `0x13b2`
- [ ] Memo result written in §3.6 **and** in `docs/SESSION_START.md`
- [ ] `Consigna Issuer` ≈ 1.5 USDC and `Consigna Payer` ≈ 1.5 USDC, **verified on explorer.arc.io**, not just in MetaMask
- [ ] Hackathon wallets total ≤ $10. Main wallet not involved anywhere.
- [ ] `.env` exists locally with both keys. `git status` does **not** list it.
- [ ] GitHub repo is **public** and shows your first commit, with no AI attribution
- [ ] Railway project exists and has credit
- [ ] DoraHacks form fields known; `docs/SUBMISSION.md` drafted
- [ ] Risk table (§5) agreed
- [ ] Four screens sketched (§7)
- [ ] Time check: it's Tuesday ≤ 10:00 Lagos. If later, every Phase 1+ time in `CLAUDE.md` shifts by the same amount, and the stretch features are the first to go.
- [ ] Opened `C:\dev\consigna` in Claude Code's Code tab and pasted the prompt from `docs/SESSION_START.md`

---
*Sources: Arc docs ([RPC endpoints](https://docs.arc.io/arc/references/rpc-endpoints), [contract addresses](https://docs.arc.io/arc/references/contract-addresses), [transaction memos](https://docs.arc.io/arc/concepts/transaction-memos)); exchange support for USDC on Arc: [OKX](https://www.okx.com/en-us/help/okx-to-support-usdc-on-the-arc-chain), [Kraken](https://blog.kraken.com/product/new-features/usdc-on-arc-deposits-and-withdrawals-now-available), [KuCoin](https://www.cryptotimes.io/2026/09/16/kucoin-opens-direct-usdc-transfers-as-circles-arc-blockchain-goes-live/); MetaMask fields: [Datawallet](https://www.datawallet.com/crypto/add-arc-to-metamask).*
