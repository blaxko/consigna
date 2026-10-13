import { test } from "node:test";
import assert from "node:assert/strict";
import {
  formatClock,
  blockedCopy,
  cancelConfirmCopy,
  filterInvoices,
  totals,
  csvRows,
  csvFilename,
  chunkRanges,
  MAX_BLOCK_SPAN,
} from "./ledger-logic.ts";
import { toCsv, CSV_HEADER } from "./csv.ts";
import type { Invoice } from "./consigna.ts";

const PAYER = "0xaA9FE8c47cBFD12E1D6109b7c825c5b478A7B25c";
const ISSUER = "0xcc136490c7e6F89B298c1A5b4957a1f532B285da";
const ID_A = "0x42db7198cff856d86ea994ce86a43116c83e91fe57a57a5ac1787b785ccd77f6";
const ID_B = "0x1111111111111111111111111111111111111111111111111111111111111111";
const TX_A = "0xe289ba1682a746935e12bd4a8fd137d527632b4d255b53adfd4b93f9e898b62c";
const TX_B = "0xf0a6a8ff83020b1540ae55aecbc06b1593c89c3f549370e84ac47b90a286067c";

function inv(p: Partial<Invoice> & { id: `0x${string}` }): Invoice {
  return {
    issuer: ISSUER,
    token: "0x3600000000000000000000000000000000000000",
    amount: 10_000n,
    status: "open",
    payer: "0x0000000000000000000000000000000000000000",
    createdAt: 1791886904,
    paidAt: 0,
    paidBlock: 0n,
    detailsHash: "0x00",
    ref: "INV-0042",
    ...p,
  } as Invoice;
}

test("formatClock gives HH:MM:SS in UTC, as in the PRD red card", () => {
  assert.equal(formatClock(1791886904), "10:21:44");
});

test("blockedCopy gives the exact PRD red-card line", () => {
  assert.equal(
    blockedCopy(PAYER, 1791886904),
    "Blocked by contract: AlreadyPaid — paid by 0xaA9F…B25c at 10:21:44",
  );
});

test("cancelConfirmCopy gives the PRD confirm text with the ref", () => {
  assert.equal(cancelConfirmCopy("INV-0042"), "Cancel INV-0042? It can never be paid or reused.");
});

test("filterInvoices: All, Open, Paid, Cancelled", () => {
  const list = [inv({ id: ID_A, status: "open" }), inv({ id: ID_B, status: "paid" })];
  assert.equal(filterInvoices(list, "all").length, 2);
  assert.deepEqual(filterInvoices(list, "open").map((i) => i.id), [ID_A]);
  assert.deepEqual(filterInvoices(list, "paid").map((i) => i.id), [ID_B]);
  assert.equal(filterInvoices(list, "cancelled").length, 0);
});

test("totals: paid is the sum of paid amounts, outstanding is the sum of open amounts", () => {
  const list = [
    inv({ id: ID_A, status: "paid", amount: 5_000_000n }),
    inv({ id: ID_B, status: "open", amount: 1_500_000n }),
    inv({ id: "0x2222222222222222222222222222222222222222222222222222222222222222", status: "cancelled", amount: 9n }),
  ];
  assert.deepEqual(totals(list), { paid: 5_000_000n, outstanding: 1_500_000n });
});

test("csvRows: paid rows use the paid time and paid tx; open rows use created time and creation tx", () => {
  const paid = inv({ id: ID_A, status: "paid", payer: PAYER, paidAt: 1791886904, amount: 10_000n, ref: "INV-0042" });
  const open = inv({ id: ID_B, status: "open", createdAt: 1791886000, ref: "INV-0043" });
  const rows = csvRows([paid, open], { [ID_A]: TX_A }, { [ID_B]: TX_B });
  assert.equal(rows[0].date_utc, "2026-10-13T10:21:44Z");
  assert.equal(rows[0].status, "paid");
  assert.equal(rows[0].amount, "0.01");
  assert.equal(rows[0].token, "USDC");
  assert.equal(rows[0].payer, PAYER);
  assert.equal(rows[0].tx_hash, TX_A);
  assert.equal(rows[0].explorer_url, `https://explorer.arc.io/tx/${TX_A}`);
  assert.equal(rows[1].status, "open");
  assert.equal(rows[1].payer, "");
  assert.equal(rows[1].tx_hash, TX_B);
});

test("csvRows escapes a formula-looking ref in the full CSV text (AC5.3)", () => {
  const evil = inv({ id: ID_A, status: "open", ref: "=HYPERLINK(1)" });
  const csv = toCsv(csvRows([evil], {}, { [ID_A]: TX_A }));
  assert.match(csv, /\r\n\S+,'=HYPERLINK\(1\),open,/);
  assert.equal(csv.split("\r\n")[0], CSV_HEADER);
});

test("csvFilename follows consigna-<issuer-short>-<YYYYMMDD>.csv", () => {
  assert.equal(csvFilename(ISSUER, new Date("2026-10-13T12:00:00Z")), "consigna-0xcc136490-20261013.csv");
});

test("chunkRanges covers the block span in inclusive chunks of at most 9,999 blocks", () => {
  assert.equal(MAX_BLOCK_SPAN, 9_999n);
  assert.deepEqual(chunkRanges(0n, 20_000n), [
    [0n, 9_998n],
    [9_999n, 19_997n],
    [19_998n, 20_000n],
  ]);
  for (const [a, b] of chunkRanges(100n, 50_000n)) {
    assert.ok(b - a + 1n <= MAX_BLOCK_SPAN);
  }
  assert.deepEqual(chunkRanges(5n, 4n), []);
});
