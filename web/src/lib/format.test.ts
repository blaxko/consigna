import { test } from "node:test";
import assert from "node:assert/strict";
import { parseUsdc, formatUsdc, shortAddress, formatUtc } from "./format.ts";

test("parse('5.00') is exactly 5000000n (6-decimal USDC units)", () => {
  assert.equal(parseUsdc("5.00"), 5_000_000n);
});

test("parse handles whole numbers, short decimals and the 6-decimal maximum", () => {
  assert.equal(parseUsdc("5"), 5_000_000n);
  assert.equal(parseUsdc("0.5"), 500_000n);
  assert.equal(parseUsdc("0.01"), 10_000n);
  assert.equal(parseUsdc("0.000001"), 1n);
  assert.equal(parseUsdc("0.10"), 100_000n);
});

test("parse rejects more than 6 decimals, negatives, empty, zero and non-numeric input", () => {
  assert.throws(() => parseUsdc("5.0000001"), /6 decimal/);
  assert.throws(() => parseUsdc("-1.00"), /invalid/i);
  assert.throws(() => parseUsdc(""), /invalid/i);
  assert.throws(() => parseUsdc("1e3"), /invalid/i);
  assert.throws(() => parseUsdc("abc"), /invalid/i);
  assert.throws(() => parseUsdc("0"), /greater than 0/);
  assert.throws(() => parseUsdc("0.00"), /greater than 0/);
});

test("format shows at least 2 decimals and keeps extra precision when needed", () => {
  assert.equal(formatUsdc(5_000_000n), "5.00");
  assert.equal(formatUsdc(10_000n), "0.01");
  assert.equal(formatUsdc(1n), "0.000001");
  assert.equal(formatUsdc(1_234_500n), "1.2345");
});

test("parse and format round-trip for values already shown with 2+ decimals", () => {
  for (const s of ["0.01", "5.00", "12.345678", "0.000001"]) {
    assert.equal(formatUsdc(parseUsdc(s)), s);
  }
});

test("shortAddress keeps the 0x prefix and the first and last 4 hex characters", () => {
  assert.equal(
    shortAddress("0x7416bfbed0d79e8604c09e0225e6baab56f0c728"),
    "0x7416…c728",
  );
});

test("formatUtc gives the CSV date form, YYYY-MM-DDTHH:MM:SSZ", () => {
  assert.equal(formatUtc(1791886904), "2026-10-13T10:21:44Z");
});
