# BUILD GUIDE — Consigna

Solo build with Claude Code. **Arc mainnet only** (chain 5042), never a testnet.

- **Day 1 = Tue Oct 13.** Contract, mainnet deploy, create and pay screens.
- **Day 2 = Wed Oct 14.** Duplicate demo, ledger, hosting, video, **submit by 22:00 Lagos**.
- **Day 3 = Thu Oct 15, 00:00–04:59 Lagos.** Buffer only. The hard deadline is 04:59 (23:59 ET Wednesday).

**How to read this guide**
- 🔴 **CRITICAL PATH**: if this step fails, nothing after it works. Fix it before moving on.
- Each step lists four things: **Do** (what you do), **Prompt** (paste into Claude Code), **Success** (how you know it worked) and **If it fails** (what to do).
- Start every Claude Code session with the prompt in `docs/SESSION_START.md`, so Claude reads `CLAUDE.md` and the PRD first.
- **Commit at the end of every phase.** Check each commit with `git log -1 --format=%B` and make sure it has no AI attribution lines.
- If you're more than 2 hours behind, cut a stretch feature (F11 → F10 → F9). Never cut the core.

---

## Day 1 — Tuesday: contract live on mainnet, people can create and pay

### Phase 0 wrap-up (08:00–10:00)

**Step 1. Finish Phase 0** 🔴
- **Do:** Work through `PHASE_0_CHECKLIST.md` §9 until every box is ticked. Open `C:\dev\consigna` in Claude Code's Code tab.
- **Prompt:**
  > Read CLAUDE.md, docs/PRD.md and PHASE_0_CHECKLIST.md. Don't write code yet. Tell me in 5 bullets: what we're building, the hard rules, today's phases, and anything in the files that contradicts something else.
- **Success:** Claude repeats back "mainnet only, chain 5042", "no AI attribution in commits", and Phases 1–3 for today. It finds no contradictions, or only small ones you can fix in 2 minutes.
- **If it fails:** If Claude can't see the files, you opened the wrong folder; reopen `C:\dev\consigna`. If it lists real contradictions, fix the PRD first (the PRD wins), then rerun the prompt.

---

### Phase 1: The contract (10:00–14:00)

**Step 2. Set up Hardhat**
- **Do:** Let Claude scaffold the contract project.
- **Prompt:**
  > Phase 1, step 1. Set up Hardhat 2 with @nomicfoundation/hardhat-toolbox-viem in this repo root, TypeScript, Solidity 0.8.26 exact with optimizer on (200 runs), and @openzeppelin/contracts 5.x. Install with exact versions (npm i -E). Add two networks in hardhat.config.ts: the default in-memory hardhat network, and "arc" (url from ARC_RPC env, chainId 5042, accounts from DEPLOYER_KEY). Load .env with dotenv. Use PowerShell-friendly commands. Don't create any testnet config. Run `npx hardhat compile` and show me the output.
- **Success:** `npx hardhat compile` prints "Compiled … Solidity file(s) successfully" (or "Nothing to compile"). `package-lock.json` exists. There's no network with chain ID 5042002 anywhere.
- **If it fails:**
  - `npx hardhat init` gets stuck waiting for answers → tell Claude: *"Don't use the interactive init. Create hardhat.config.ts, tsconfig.json and package.json scripts by hand."*
  - Hardhat complains about your Node version → run `node -v`. You need 22.x or 24.x. Reinstall with `winget install OpenJS.NodeJS.LTS`.
  - `DEPLOYER_KEY` is undefined and blocks compiling → tell Claude: *"Only add the arc accounts if DEPLOYER_KEY is set, so compile and test work without it."*

**Step 3. Write the tests first** 🔴
- **Do:** Get tests for every rule before the contract exists.
- **Prompt:**
  > Phase 1, step 2. Create contracts/test/MockUSDC.sol (ERC-20, 6 decimals, public mint for tests). Then write test/Consigna.test.ts covering every acceptance criterion AC1.1 to AC1.8 in docs/PRD.md §9, plus: two issuers can both use "INV-1" (AC1.7), cancel by issuer works, ref of exactly 32 bytes is allowed and 33 is rejected, and the contract's token balance is always 0 after pay. Use the interface in PRD §7.3 exactly, including the error name InvoiceWasCancelled. Don't write Consigna.sol yet. Run the tests and show me that they fail because the contract doesn't exist.
- **Success:** The test file has roughly 15–25 `it(...)` cases. Running `npx hardhat test` fails with "artifact not found" or similar. That's expected: the tests exist before the code.
- **If it fails:** If Claude writes the contract too, say *"Delete Consigna.sol. Tests only for now."* If tests are missing for an AC, name it: *"Add a test for AC1.5."*

**Step 4. Write the contract until the tests pass** 🔴
- **Do:** Now let Claude implement.
- **Prompt:**
  > Phase 1, step 3. Write contracts/Consigna.sol to make every test pass. Follow CLAUDE.md §4 and PRD §5.1 exactly: id = keccak256(abi.encode(msg.sender, ref)); ref 1–32 bytes and never reusable; token must be USDC or EURC (immutable constructor args); amount > 0 as uint96; pay() sets Paid + payer + paidAt + paidBlock BEFORE SafeERC20.safeTransferFrom(msg.sender, issuer, amount); contract never holds funds; no owner, no admin, no pause, no proxy. Custom errors only. Run `npx hardhat test` and show the full output.
- **Success:** Every test passes (green). `Consigna.sol` is about 80–120 lines. Searching it for `owner`, `Ownable`, `pause` or `selfdestruct` finds nothing.
- **If it fails:**
  - Some tests fail → paste the failing test output back and say *"Fix the contract, not the test, unless the test contradicts the PRD. If it does, tell me first."*
  - Error "Identifier already declared" → an error and an event share a name. It must be the error `InvoiceWasCancelled` and the event `InvoiceCancelled`.
  - Stuck for more than 45 minutes → **fallback:** drop `invoicesOf` pagination, keep a simple `invoicesOf(issuer)` returning the full array, and note it in the PRD.

**Step 5. Hit 100% branch coverage**
- **Do:** Prove every path is tested.
- **Prompt:**
  > Run `npx hardhat coverage`. Show me the Consigna.sol row. If branch coverage is below 100%, add tests for the missing branches (don't change the contract to game coverage) and rerun.
- **Success:** The `Consigna.sol` row shows **100%** in the "% Branch" column (AC1.9).
- **If it fails:** If coverage crashes on Windows → run `npx hardhat clean`, then retry. If it's still broken after 20 minutes, **fallback:** accept ≥ 95% branches, list the uncovered branch in the README as a known gap, and move on. Don't burn the morning on this.

**Step 6. Security self-review**
- **Do:** A quick, focused review before money touches it.
- **Prompt:**
  > Review contracts/Consigna.sol as a hostile auditor against CLAUDE.md §9 and §10 and PRD NFR-S1 to NFR-S3. Check: checks-effects-interactions order, reentrancy through the token, id squatting/front-running, uint96 overflow on input, ref length in bytes (not characters), whether anything can lock or hold funds, and whether a cancelled ref can be reused. List findings as High/Medium/Low. Fix High and Medium only, then rerun tests and coverage.
- **Success:** No High or Medium findings remain, and tests are green with coverage still 100%.
- **If it fails:** If Claude suggests big redesigns (escrow, admin roles, upgrades) → say no; CLAUDE.md §10 forbids them. Only fix real bugs.

**Step 7. Commit Phase 1**
- **Do:**
  ```powershell
  git add .
  git commit -m "Phase 1: Consigna contract with full test suite"
  git log -1 --format=%B
  git push
  ```
- **Success:** The commit message shows **no** `Co-Authored-By` line, and the push succeeds. `git status` doesn't show `.env`.
- **If it fails:** If an AI line appears, run `git commit --amend -m "Phase 1: Consigna contract with full test suite"` and push again (with `--force-with-lease` if you already pushed).

---

### Phase 2: Deploy to Arc mainnet (14:00–16:00)

**Step 8. Write the deploy script and deploy** 🔴
- **Do:** Put the contract on mainnet. This costs a few cents of USDC from `Consigna Issuer`.
- **Prompt:**
  > Phase 2. Write scripts/deploy.ts that deploys Consigna to the "arc" network with constructor args USDC 0x3600000000000000000000000000000000000000 and EURC 0xbEf5f6d51CB62b58e6A8f77868681825C6fe21c1. Before deploying: assert chainId is 5042 and abort otherwise; print the deployer address and its USDC balance via the ERC-20 balanceOf (6 decimals). Use maxFeePerGas of at least 20 gwei. After deploying, write deployments/arc.json with { address, deployBlock, txHash, chainId } and print the explorer link https://explorer.arc.io/address/<address>. Then show me the command to run, and wait for me to run it.
- **Do (you):** `npx hardhat run scripts/deploy.ts --network arc`
- **Success:** The terminal prints an address and an explorer link. On explorer.arc.io the address shows as a contract with a creation transaction. `deployments/arc.json` exists.
- **If it fails:**
  - "max fee per gas less than block base fee" or an underpriced error → tell Claude: *"Raise maxFeePerGas to 2× the current base fee and keep the 20 gwei floor."*
  - "insufficient funds" → `Consigna Issuer` has no USDC on Arc. Check explorer.arc.io and top up (Phase 0 §2).
  - RPC error `-32014` or timeouts → set `ARC_RPC=https://rpc.quicknode.mainnet.arc.io` in `.env` and rerun.
  - Wrong chain ID detected → stop. Your `ARC_RPC` points somewhere else. It must answer `0x13b2`.

**Step 9. Mainnet smoke test** 🔴
- **Do:** Prove the real flow works on mainnet with tiny amounts (0.01 USDC).
- **Prompt:**
  > Write scripts/smoke.ts for the arc network using DEPLOYER_KEY as issuer and PAYER_KEY as payer and the address from deployments/arc.json. Steps: (1) issuer creates invoice ref "SMOKE-<unix time>" for 10000 units (0.01 USDC), (2) payer approves exactly 10000 and pays, (3) payer sends pay() again WITHOUT simulation using a fixed gas limit of 120000 so it lands on-chain as a failed transaction, then decode the revert by eth_call at that block and print the error name, (4) issuer creates "SMOKE-<time>-C" and cancels it. Print 4 explorer links (https://explorer.arc.io/tx/<hash>) and final balances. Abort if chainId is not 5042.
- **Do (you):** `npx hardhat run scripts/smoke.ts --network arc`
- **Success:** Four links print. Step 3's transaction shows as **Failed** on the explorer, and the script prints `AlreadyPaid`. The payer's USDC dropped by 0.01 plus about a cent of gas, and the issuer's rose by exactly 0.01 (AC1.10).
- **If it fails:**
  - The duplicate never reaches the chain (the script throws before sending) → it's still simulating. Tell Claude: *"Use walletClient.sendTransaction with encoded calldata and gas: 120000n, not writeContract."*
  - Revert reason can't be decoded → **fallback:** print `getInvoice(id).status == Paid` and the payer address instead. The failed transaction on the explorer is what matters.
  - Approve works but pay fails with an allowance error → you're approving the wrong token or address. Print both and compare with `deployments/arc.json`.

**Step 10. Bytecode verification script**
- **Do:** Arc's explorer can't verify source code yet, so give judges a way to check it themselves.
- **Prompt:**
  > Write scripts/verify-bytecode.ts: read the address from deployments/arc.json, fetch eth_getCode from Arc mainnet, compare it with the deployedBytecode from the Hardhat artifact (account for immutable values — compare with immutables masked, or compare the metadata-stripped bytecode and print the immutable values separately). Print MATCH or MISMATCH with the reason.
- **Do (you):** `npx hardhat run scripts/verify-bytecode.ts --network arc`
- **Success:** It prints **MATCH** (AC8.1).
- **If it fails:** If you get MISMATCH only in the metadata tail, check `git config core.autocrlf` is `input` and `.gitattributes` has `* text=auto eol=lf`, then recompile. **Fallback:** if it still mismatches after 30 minutes, ship a script that compares the bytecode *without* the metadata hash, and say so honestly in the README.

**Step 11. Freeze the contract and commit Phase 2**
- **Do:** Add the contract address to the README. From now on, **the contract does not change.**
- **Prompt:**
  > Create README.md with a placeholder structure: title + one line, the problem (3 sentences), "What it uses Arc for" (4 bullets from CLAUDE.md §1), Contract on Arc mainnet (address and explorer link from deployments/arc.json), How to verify (verify-bytecode command), Live app (TODO), Demo video (TODO), How it works (5 lines), Run locally. Keep it under 80 lines.
- **Do (you):**
  ```powershell
  git add .
  git commit -m "Phase 2: Deploy Consigna to Arc mainnet, smoke test and bytecode check"
  git log -1 --format=%B
  git push
  ```
- **Success:** The README on GitHub shows a clickable contract link that opens on explorer.arc.io.
- **If it fails:** If you later find a contract bug, you must redeploy, re-run Steps 8–10 and update every address. Only do this for real bugs, never for nice-to-haves.

---

### Phase 3: Create and pay screens (16:00–23:00)

**Step 12. Set up the web app** 🔴
- **Do:** Create the frontend skeleton.
- **Prompt:**
  > Phase 3, step 1. Create the web/ app with Vite + React 19 + TypeScript, react-router 7, wagmi 2, viem 2, @tanstack/react-query 5, Tailwind 4 via @tailwindcss/vite. Install with exact versions. Create web/src/lib/chain.ts defining Arc mainnet with viem defineChain (id 5042, native currency USDC with 18 decimals, rpc https://rpc.mainnet.arc.io, explorer https://explorer.arc.io) and a viem fallback transport: Arc public → https://rpc.quicknode.mainnet.arc.io → https://rpc.drpc.mainnet.arc.io. Export the Consigna ABI from the Hardhat artifact into web/src/lib/abi.ts and read the address from VITE_CONSIGNA_ADDRESS. Routes: /, /new, /i/:id, /ledger/:issuer with placeholder pages. Add an injected-wallet connect button that switches or adds Arc (chain 5042). No testnet chains anywhere. Run `npm run dev` and tell me the URL.
- **Do (you):** Create `web/.env` with `VITE_CONSIGNA_ADDRESS=<address from deployments/arc.json>`. Run `npm --prefix web run dev`, open the URL and click Connect.
- **Success:** MetaMask connects, and the header shows your address, "Arc" and your **USDC balance from the ERC-20** (for example "1.42 USDC", not a giant number).
- **If it fails:**
  - The balance looks huge (like 9420000000000000000) → it's reading the 18-decimal native balance. Tell Claude: *"Show balanceOf on 0x3600…0000 with 6 decimals instead."*
  - MetaMask won't switch → tell Claude: *"On error 4902, call wallet_addEthereumChain with the chain params, then switch."*
  - Untitled UI setup fights Tailwind 4 → **fallback:** plain Tailwind components for now and restyle in the buffer.

**Step 13. Shared helpers with tests**
- **Do:** Build the small modules every page uses.
- **Prompt:**
  > Phase 3, step 2. Create web/src/lib/format.ts (parse/format 6-decimal amounts, max 6 decimal places, address truncation, UTC/local time), details.ts (canonical JSON per PRD §7.4: fixed key order, no whitespace, amounts as decimal strings; base64url encode/decode; keccak256 hash; reject > 1500 bytes), csv.ts (RFC 4180, columns exactly as PRD §7.4, prefix cells starting with = + - @ tab or CR with '), and consigna.ts (readInvoice, listInvoices via Multicall3, create, approveExact, pay, payUnsimulated with gas 120000n, cancel, decodeRevert that eth_calls at the receipt block). Add tests using Node's built-in test runner (node --test with tsx) for format, details and csv, including parse("5.00") === 5000000n and a CSV injection case. No new test framework.
- **Success:** The tests pass. `hashDetails` gives the same hash every time for the same input.
- **If it fails:** If Claude wants to add Vitest or Jest → say *"Use node --test, no new dependencies"* (CLAUDE.md asks first for new dependencies). If Multicall gives trouble → **fallback:** read invoices one by one with `Promise.all`. It's fine for under 50 invoices.

**Step 14. Create invoice page (`/new`)**
- **Do:** Build Flow A.
- **Prompt:**
  > Phase 3, step 3. Build /new following PRD §5.2 Flow A exactly: form (reference, client, line items, optional due date and note), inline validation (ref rules R11, ref not already used via idFor + getInvoice, 6-decimal limit), review step showing total, payee = connected address, fee about $0.01 and "can't be edited after creation", then createInvoice with the details hash. States: waiting for wallet, submitted (explorer link), confirmed, failed (decoded reason), rejected (back to review silently). Success screen: the link /i/<id>#d=<encoded details> with a Copy button and "View invoice". Use one primary button per screen.
- **Do (you):** Create a real invoice on mainnet: `TEST-001`, 0.05 USDC.
- **Success:** You get a link. The transaction shows on the explorer. Reusing `TEST-001` shows an error *before* MetaMask opens (AC2.1, AC2.2).
- **If it fails:**
  - The wallet opens and the transaction reverts with `RefAlreadyUsed` → the pre-check isn't wired. Tell Claude to call `getInvoice(idFor(account, ref))` on blur.
  - The link is very long → that's fine up to about 2,000 characters. If it's longer, the details are over 1,500 bytes, and validation should catch it.

**Step 15. Pay page (`/i/:id`)** 🔴
- **Do:** Build Flow B, the heart of the product.
- **Prompt:**
  > Phase 3, step 4. Build /i/:id following PRD §5.3 Flow B: works without a wallet; reads getInvoice; status badge Open/Paid/Cancelled; decodes #d= details and compares the hash with detailsHash (green "✓ Details match the on-chain invoice", amber warning per PRD E9 if not, note per E10 if missing); amount and payee ALWAYS from chain. Pay: balance check (amount + 0.05), stepper Allow (exact amount, skipped if allowance is enough) → Pay; re-read status right before sending. Paid state: "Paid · settled in X s · fee Y USDC" using real timings and the receipt's gas cost, plus the explorer link; fetch the InvoicePaid log only at paidBlock. Handle E3, E4, E5, E6, E7, E8, E13 exactly as PRD §8 says.
- **Do (you):** In Chrome profile **Payer**, open the `TEST-001` link and pay it.
- **Success:** The page loads in about 2 seconds without a wallet. After paying, it flips to **Paid** by itself with a real "settled in" time and a working transaction link (AC3.1–AC3.4).
- **If it fails:**
  - It's stuck on "pending" → the receipt polling is broken. Tell Claude to use `waitForTransactionReceipt` with `pollingInterval: 400` and a 30 s timeout, then re-read `getInvoice`.
  - "Settled in" shows nonsense → **fallback:** show "Paid · fee Y USDC" without the time. Still good.
  - Details always show as "don't match" → canonical JSON differs between `/new` and `/i`. Both must use `details.ts` only.

**Step 16. End-of-day commit and check**
- **Do:**
  ```powershell
  git add .
  git commit -m "Phase 3: Create and pay invoice flows"
  git log -1 --format=%B
  git push
  ```
- **Success:** By about 23:00 you can create and pay an invoice on mainnet from the browser.
- **If you're behind:** Whatever isn't done in Phase 3 moves to Wednesday 08:00. Drop F11 (QR) now, without guilt.

---

## Day 2 — Wednesday: duplicate demo, ledger, live link, video, submit

### Phase 4: Duplicate, ledger, cancel (09:00–13:00)

**Step 17. The duplicate moment** 🔴
- **Do:** Build Flow C. This is the frame judges remember.
- **Prompt:**
  > Phase 4, step 1. On a Paid invoice in /i/:id, add a secondary "Try paying again" button following PRD §5.4 Flow C: inline explanation ("sends a real transaction… costs about $0.01… no USDC is transferred"), then payUnsimulated (sendTransaction with encoded pay(id) calldata, gas 120000n, maxFeePerGas ≥ 20 gwei). When the receipt says reverted, decode the reason with decodeRevert and show a red card: "Blocked by contract: AlreadyPaid — paid by 0xab…12 at HH:MM:SS" with a "View failed transaction" link. If the receipt doesn't come within 30 s, follow PRD E13.
- **Do (you):** Use `TEST-001` (already paid) and click "Try paying again".
- **Success:** MetaMask may warn "this transaction is likely to fail". Confirm anyway. The red card appears, and the explorer shows the transaction as **Failed** (AC4.1). Your USDC dropped only by gas (AC4.2).
- **If it fails:**
  - The wallet refuses to send a transaction it predicts will fail → try "Proceed anyway" or advanced settings in MetaMask. **Fallback:** send the duplicate from `scripts/smoke.ts` (it already does this). In the UI, show the red card with "Already paid" decoded from `getInvoice`, and link to the script's failed transaction. In the video, cut to the explorer showing it.
  - The revert can't be decoded → **fallback:** build the red card from `getInvoice` (payer + paidAt) and still link the failed transaction.

**Step 18. Ledger and CSV**
- **Do:** Build Flow D.
- **Prompt:**
  > Phase 4, step 2. Build /ledger/:issuer per PRD §5.5 Flow D: defaults to the connected address, works read-only without a wallet. Table columns Ref, Created, Status, Amount, Token, Payer, Paid at, Tx. Filter pills All/Open/Paid/Cancelled. Totals paid and outstanding. Read with invoicesOf + Multicall3; never scan more than one block of logs (fetch InvoicePaid only at paidBlock; creation tx from InvoiceCreated at the createdAt block or omit if unavailable). "Download CSV" using csv.ts for the current filter, file name consigna-<issuer-short>-<YYYYMMDD>.csv. Empty state per PRD.
- **Do (you):** Open your ledger, download the CSV and import it into Google Sheets.
- **Success:** All your invoices are listed. Sheets imports the CSV with no column fixes, and every `explorer_url` opens the right transaction (AC5.1, AC5.2).
- **If it fails:**
  - Error `-32012` → something scans a block range. Tell Claude: *"Only query single blocks (paidBlock). No ranges over 9,999."*
  - No creation transaction hash is available cheaply → **fallback:** leave `tx_hash` empty for open and cancelled rows and fill only paid rows. Note it in the PRD.

**Step 19. Cancel**
- **Do:**
- **Prompt:**
  > Phase 4, step 3. In the ledger, show "Cancel" only on Open rows and only when the connected account is the issuer. Confirm dialog: "Cancel <ref>? It can never be paid or reused." Then call cancel(id) and refresh the row. The /i/:id page must show "This invoice was cancelled by the issuer" with no pay button.
- **Success:** You create `TEST-002`, cancel it, and the pay page shows the cancelled state (AC6.1).
- **If it fails:** If the button shows for other accounts → the account check must compare the lowercased address with `issuer`.

**Step 20. Commit Phase 4**
- **Do:** `git add .` → `git commit -m "Phase 4: Duplicate demo, ledger, CSV export, cancel"` → check `git log -1 --format=%B` → `git push`

---

### Phase 5: Live link and hardening (13:00–16:00)

**Step 21. Deploy to Railway** 🔴
- **Do:** Get the public link judges will open.
- **Prompt:**
  > Phase 5, step 1. Prepare web/ for Railway: package.json "start": "serve -s dist -l $PORT" (add serve as a dependency, exact version), build command "npm ci && npm run build". List the env vars I must set in Railway: VITE_CONSIGNA_ADDRESS, VITE_ARC_RPC_FALLBACK, VITE_EXPLORER_URL. Tell me the exact Railway dashboard clicks, with root directory set to web.
- **Do (you):** In Railway: New → Deploy from GitHub repo → `consigna`. Settings → Root Directory `web`. Add the three variables, then Deploy. Settings → Networking → Generate Domain.
- **Success:** The `https://…up.railway.app` URL loads. **Refreshing on `/i/<id>` works** (no 404), and connecting plus paying works on the live site.
- **If it fails:**
  - 404 on refresh → the start command isn't using `serve -s`. Fix it.
  - The page loads but shows "contract not found" → Vite variables are baked in at build time. Set them in Railway **before** building, then redeploy.
  - Railway is down or out of credit → **fallback:** Cloudflare Pages (free). Build command `npm run build`, output `web/dist`, and add `web/public/_redirects` containing `/* /index.html 200`.

**Step 22. Edge-case pass**
- **Do:** Run through the failure cases.
- **Prompt:**
  > Phase 5, step 2. Go through PRD §8 E1 to E20 one by one. For each: say whether the code handles it, point to the file and line, and fix any that are missing. Then give me a manual test list (one line each) for the ones I must check by hand in the browser.
- **Do (you):** Test at least: no wallet (use an incognito window), wrong network, reject in wallet, low balance (Payer with a big invoice), cancelled link, a fake ID, and a tampered `#d=`.
- **Success:** Every one of those shows the exact PRD copy and never dead-ends.
- **If it fails:** Fix only what a judge could hit. Anything rare goes into the README "Known limitations".

**Step 23. Mobile wallet check**
- **Do:** Open the live payment link in the OKX Wallet or MetaMask mobile in-app browser.
- **Prompt (if broken):**
  > The pay page breaks on mobile in <wallet> in-app browser: <what you see>. Fix layout at 375px width and wallet connection for injected mobile providers. Don't add WalletConnect.
- **Success:** You can read the invoice and the layout isn't broken at phone width.
- **If it fails:** **Fallback:** add a README note: "Best on desktop Chrome + MetaMask." Don't sink more than 30 minutes into this.

**Step 24. Commit Phase 5**
- **Do:** `git commit -m "Phase 5: Railway deploy, RPC fallback, edge-case handling"` → check message → push. Put the live URL in the README.

---

### Phase 6: Demo data, README, video (16:00–19:00)

**Step 25. Seed real mainnet data through the live site** 🔴
- **Do:** On the **live Railway URL** (not localhost), create everything in `docs/DEMO_DATA.md`: INV-0040 to INV-0045. Pay four of them from the Payer profile. Cancel INV-0044. Leave INV-0045 open. Do one duplicate attempt on INV-0042 *while recording* (Step 27). Practice on INV-0040 first.
- **Success:** The ledger shows 4 Paid, 1 Cancelled and 1 Open, plus at least one failed duplicate transaction on the explorer (metrics M1, M2).
- **If it fails:** If Payer runs low on USDC → send 1 USDC from Issuer to Payer. The money just loops between your two wallets.

**Step 26. Finish the README**
- **Prompt:**
  > Phase 6. Finish README.md for judges. First screen must have: one-line pitch, the problem in 3 sentences, "What it uses Arc for" bullets, live app link, contract address with explorer link, demo video link (placeholder), and a link to an example paid invoice and the failed duplicate tx. Then: how it works (diagram from PRD §7.1), how to verify the bytecode, run locally, tests and coverage command, known limitations, license MIT. Plain language, no hype, under 150 lines.
- **Success:** A stranger can understand the product and click through to live proof in under 60 seconds (AC7.2).
- **If it fails:** If it's too long, cut "run locally" to 5 lines.

**Step 27. Record the 90-second video** 🔴
- **Do:** Follow `docs/VIDEO.md` and `CLAUDE.md` §7. Two Chrome profiles side by side, or switch windows. Record with Win + Shift + R (or OBS). Add the 4 captions plus an end card in Clipchamp. Export 1080p. Upload to YouTube as **Unlisted** (or Loom), and test the link in an incognito window.
- **Success:** The video is **≤ 90 seconds**, has no voice, and the red "Blocked by contract" card plus the explorer's failed transaction are both clearly visible.
- **If it fails:**
  - A take goes wrong → you have plenty of USDC for retakes; each run costs cents. Use a new ref each time (INV-0042b…).
  - Captions are too fiddly → **fallback:** record with the app's own on-screen text, no extra captions, and put the 4-line story in the video description.

**Step 28. Commit Phase 6**
- **Do:** Add the video link to the README → `git commit -m "Phase 6: Demo data, README and video"` → check → push.

---

### Phase 7: Submit (19:00–22:00)

**Step 29. Submit on DoraHacks** 🔴
- **Do:** Open https://dorahacks.io/hackathon/arc-microgrants → Submit. Paste from `docs/SUBMISSION.md` and fill in: live link, repo link, contract address, video link and builder profile.
- **Success:** The submission page shows as submitted, and you can open it while logged out (or in an incognito window). Take a screenshot.
- **If it fails:** If the form errors → save your text, refresh and retry. If DoraHacks is down → retry every 30 minutes and ask in the Arc Discord/community. The real deadline is **Thu 04:59 Lagos**, so you have hours. Never wait until 04:00.

**Step 30. Commit Phase 7 and tag**
- **Do:**
  ```powershell
  git add .
  git commit -m "Phase 7: Submitted to Arc Microgrants"
  git tag v1.0-submission
  git push --follow-tags
  ```
- **Success:** The tag `v1.0-submission` is visible on GitHub. This is the exact version judges saw.

**Step 31. (Optional) One post for visibility**
- **Do:** Post on X with the video and the live link, tagging Arc and Circle. One post, no thread needed.

---

## Day 3 — Thursday 00:00–04:59 (buffer, only if Phase 7 is done)

Do these in order, and stop whenever you're tired. **The contract does not change.** These are frontend-only updates, redeployed to Railway.

**Step 32. F9: EURC option**
- **Prompt:**
  > Stretch F9. In /new add a token selector (USDC default, EURC). Everything else stays the same; the contract already allows EURC. Show amounts with the right symbol everywhere, including the CSV token column. Test by creating one EURC invoice (I need a little EURC on Arc; if I have none, just verify the UI and stop).
- **Success:** An EURC invoice is created on mainnet. **Fallback:** if you have no EURC, ship the selector and mention it in the README.

**Step 33. F10: pay through Arc Memo** (only if Phase 0 showed Memo is LIVE)
- **Prompt:**
  > Stretch F10. Memo is live on Arc mainnet at 0x5294E9927c3306DcBaDb03fe70b92e01cCede505. Add an option in /i/:id to pay via Memo.memo(consignaAddress, payCalldata, invoiceId, utf8("ref=<ref>")) for EOA accounts only (check getCode(account) === "0x", else use direct pay). Show the Memo event in the paid view. Follow the Arc memo tutorial ABI exactly.
- **Success:** One payment shows both `InvoicePaid` and Arc's `Memo` event on the explorer. **Fallback:** if it reverts, remove the option. Direct pay already works.

**Step 34. F11: QR code**
- **Prompt:**
  > Stretch F11. On the /new success screen, add a QR code for the payment link using a tiny, well-known library (ask me before adding it) or an inline SVG generator.
- **Success:** Scanning it with a phone opens the invoice.

After any stretch: commit with a plain message, push, and confirm Railway redeployed. **Don't edit the DoraHacks submission after 04:00.**

---

## Demo checklist (before recording and before judges look)

- [ ] Live Railway link opens in an incognito window, with no wallet needed to view
- [ ] Refresh on `/i/<id>` and `/ledger/<issuer>` works (no 404)
- [ ] Ledger shows ≥ 4 Paid, 1 Cancelled, 1 Open (INV-0045 is payable by judges)
- [ ] At least one **Failed** duplicate transaction is visible on explorer.arc.io
- [ ] INV-0042's page shows Paid with a working transaction link
- [ ] CSV downloads and opens cleanly in Google Sheets
- [ ] Amounts show as "0.50 USDC" everywhere, with no 18-decimal giant numbers
- [ ] Both Chrome profiles are logged in, on Arc, with ≥ 0.6 USDC each (top Payer up from Issuer if needed)
- [ ] Browser zoom at 110–125% so text is readable in the video
- [ ] Notifications off (Windows Focus on), other tabs closed, no personal info on screen
- [ ] `verify-bytecode.ts` prints MATCH
- [ ] Video ≤ 90 seconds, no narration, captions readable, ends with "One invoice. One payment. Enforced by Arc."

## Submission checklist (DoraHacks)

- [ ] **Live deployment link** (Railway URL) works in incognito
- [ ] **Public repo** link opens while logged out
- [ ] **Short description** includes a clear "What it uses Arc for" section (from `docs/SUBMISSION.md`)
- [ ] **Contract address** on Arc mainnet plus explorer link
- [ ] **Demo video** link works while logged out (YouTube unlisted or Loom)
- [ ] **Public builder profile** (GitHub, and X or Farcaster if you have it)
- [ ] Nothing testnet-only anywhere (the program rejects testnet-only builds)
- [ ] README first screen matches the submission description
- [ ] Repo tagged `v1.0-submission`
- [ ] Submitted **before Wed 22:00 Lagos** (hard deadline Thu 04:59 Lagos), screenshot saved
- [ ] A wallet address that can receive USDC on Arc is ready for payout (your Issuer address works)

## 60-second pitch script

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
