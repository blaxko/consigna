import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateRef,
  lineTotal,
  checkBalance,
  matchDetails,
  paymentLink,
  settledLabel,
  feeLabel,
  formatShortTime,
  insufficientCopy,
  alreadyPaidCopy,
  isUserRejection,
  COPY,
} from "./invoice-logic.ts";
import { hashDetails, toFragment, type Details } from "./details.ts";

const details: Details = {
  v: 1,
  client: "Acme Inc.",
  items: [{ desc: "Logo design", qty: 1, unit: "5.00" }],
};

// ---- Flow A: reference rules (PRD 5.2, E11, NFR-S5) ----

test("validateRef accepts 1-32 chars from [A-Za-z0-9-_./]", () => {
  assert.equal(validateRef("INV-0042"), null);
  assert.equal(validateRef("a"), null);
  assert.equal(validateRef("ACME/2026_10.01"), null);
  assert.equal(validateRef("x".repeat(32)), null);
});

test("validateRef rejects empty, over 32 chars, and disallowed characters", () => {
  assert.equal(validateRef(""), "Enter a reference.");
  assert.equal(validateRef("x".repeat(33)), "References can be up to 32 characters.");
  assert.equal(validateRef("INV 42"), "Use letters, numbers, and - _ . / only.");
  assert.equal(validateRef("INV#42"), "Use letters, numbers, and - _ . / only.");
});

// ---- Flow A: total from line items ----

test("lineTotal sums qty x unit price in 6-decimal units", () => {
  assert.equal(
    lineTotal([
      { qty: 2, unit: "0.25" },
      { qty: 1, unit: "4.50" },
    ]),
    5_000_000n,
  );
});

test("lineTotal throws when the total is zero or an unit price is invalid", () => {
  assert.throws(() => lineTotal([{ qty: 1, unit: "0" }]), /greater than 0/);
  assert.throws(() => lineTotal([{ qty: 1, unit: "1.0000001" }]), /6 decimal/);
});

// ---- Flow B step 3: balance check (PRD 5.3, E4, R6: amount + 0.05) ----

test("checkBalance requires amount + 0.05 USDC", () => {
  assert.deepEqual(checkBalance(5_050_000n, 5_000_000n), { ok: true, required: 5_050_000n });
  assert.deepEqual(checkBalance(5_049_999n, 5_000_000n), { ok: false, required: 5_050_000n });
});

test("insufficientCopy gives the exact PRD E4 text", () => {
  assert.equal(
    insufficientCopy(5_000_000n, 2_100_000n),
    "You need 5.05 USDC on Arc (5.00 + fees). You have 2.10.",
  );
});

// ---- Flow B step 1: details match (PRD 5.3, E9, E10, NFR-S7) ----

test("matchDetails: match when the fragment hashes to the on-chain detailsHash", () => {
  const onchain = hashDetails(details);
  const r = matchDetails(toFragment(details), onchain);
  assert.equal(r.status, "match");
  if (r.status === "match") assert.deepEqual(r.details, details);
});

test("matchDetails: mismatch when the fragment differs from the on-chain hash (E9)", () => {
  const tampered: Details = { ...details, items: [{ desc: "Logo design", qty: 1, unit: "0.01" }] };
  const onchain = hashDetails(details);
  assert.equal(matchDetails(toFragment(tampered), onchain).status, "mismatch");
});

test("matchDetails: absent when there is no fragment (E10)", () => {
  assert.equal(matchDetails(null, hashDetails(details)).status, "absent");
  assert.equal(matchDetails("", hashDetails(details)).status, "absent");
});

test("matchDetails: a malformed fragment is treated as a mismatch (E9), never trusted", () => {
  assert.equal(matchDetails("not base64!", hashDetails(details)).status, "mismatch");
});

// ---- Links and labels ----

test("paymentLink is origin + /i/<id> + #d=<fragment>, the fragment never sent to a server", () => {
  const id = "0x42db7198cff856d86ea994ce86a43116c83e91fe57a57a5ac1787b785ccd77f6";
  assert.equal(paymentLink("https://consigna.example", id, details), `https://consigna.example/i/${id}#d=${toFragment(details)}`);
});

test("settledLabel and feeLabel match the PRD success line", () => {
  assert.equal(settledLabel(600), "Paid · settled in 0.6 s");
  assert.equal(feeLabel(10_000_000_000_000_000n), "fee 0.01 USDC"); // 0.01 native USDC (18 decimals)
});

test("formatShortTime gives the PRD 'Oct 14, 10:42' form in UTC", () => {
  assert.equal(formatShortTime(1791886904), "Oct 13, 10:21");
});

test("alreadyPaidCopy gives the E6 text", () => {
  assert.equal(
    alreadyPaidCopy("0xaA9FE8c47cBFD12E1D6109b7c825c5b478A7B25c", 1791886904),
    "Already paid by 0xaA9F…B25c at Oct 13, 10:21",
  );
});

test("isUserRejection recognises EIP-1193 code 4001 only", () => {
  assert.equal(isUserRejection({ code: 4001 }), true);
  assert.equal(isUserRejection({ cause: { code: 4001 } }), true);
  assert.equal(isUserRejection({ code: 4902 }), false);
});

test("exact PRD copy strings are present", () => {
  assert.equal(COPY.notFound, "No Consigna invoice with this ID on Arc mainnet.");
  assert.equal(COPY.cancelled, "This invoice was cancelled by the issuer.");
  assert.equal(
    COPY.detailsMismatch,
    "These line items don't match what the issuer recorded on-chain. Only the amount and recipient below are verified.",
  );
  assert.equal(COPY.noFragment, "Line items weren't included in this link.");
  assert.equal(COPY.notConfirmed, "Not confirmed yet. View on explorer.");
  assert.equal(COPY.refUsed("INV-0042"), "You've already used INV-0042. Pick a new reference.");
  assert.equal(COPY.decimals, "USDC supports up to 6 decimal places.");
  assert.equal(COPY.noWallet, "Install a wallet to pay");
  assert.equal(COPY.refWarning, "Don't put personal data in the reference.");
  assert.equal(COPY.reviewWarning, "This can't be edited after creation. You can cancel it while unpaid.");
});
