import { test } from "node:test";
import assert from "node:assert/strict";
import { toCsv, CSV_HEADER, escapeCell } from "./csv.ts";

const row = {
  date_utc: "2026-10-14T09:42:07Z",
  ref: "INV-0042",
  status: "paid",
  amount: "5.00",
  token: "USDC",
  payer: "0xaA9FE8c47cBFD12E1D6109b7c825c5b478A7B25c",
  issuer: "0xcc136490c7e6F89B298c1A5b4957a1f532B285da",
  invoice_id: "0x42db7198cff856d86ea994ce86a43116c83e91fe57a57a5ac1787b785ccd77f6",
  tx_hash: "0xe289ba1682a746935e12bd4a8fd137d527632b4d255b53adfd4b93f9e898b62c",
  explorer_url: "https://explorer.arc.io/tx/0xe289ba1682a746935e12bd4a8fd137d527632b4d255b53adfd4b93f9e898b62c",
};

test("header matches PRD §7.4 column order exactly", () => {
  assert.equal(CSV_HEADER, "date_utc,ref,status,amount,token,payer,issuer,invoice_id,tx_hash,explorer_url");
});

test("a plain row is written unchanged, records end with CRLF", () => {
  const csv = toCsv([row]);
  const lines = csv.split("\r\n");
  assert.equal(lines[0], CSV_HEADER);
  assert.equal(
    lines[1],
    `2026-10-14T09:42:07Z,INV-0042,paid,5.00,USDC,${row.payer},${row.issuer},${row.invoice_id},${row.tx_hash},${row.explorer_url}`,
  );
  assert.equal(csv.endsWith("\r\n"), true);
});

test("a ref starting with = is prefixed with an apostrophe (AC5.3)", () => {
  assert.equal(escapeCell("=HYPERLINK(1)"), "'=HYPERLINK(1)");
});

test("every formula trigger at the start of a cell is neutralised: = + - @ tab CR", () => {
  // A CR also forces RFC quoting, so the apostrophe sits after an opening quote.
  for (const trigger of ["=", "+", "-", "@", "\t", "\r"]) {
    assert.match(escapeCell(`${trigger}evil`), /^"?'/, `trigger ${JSON.stringify(trigger)}`);
  }
});

test("a formula injection in ref is escaped inside a full CSV row", () => {
  const evil = { ...row, ref: '=HYPERLINK("http://x.example","click")' };
  const csv = toCsv([evil]);
  // Contains commas and quotes, so the cell is quoted and inner quotes doubled, with the apostrophe first.
  assert.match(csv, /\r\n2026-10-14T09:42:07Z,"'=HYPERLINK\(""http:\/\/x\.example"",""click""\)",/);
});

test("fields with commas, quotes or line breaks are RFC 4180 quoted", () => {
  assert.equal(escapeCell("a,b"), '"a,b"');
  assert.equal(escapeCell('say "hi"'), '"say ""hi"""');
  assert.equal(escapeCell("line1\nline2"), '"line1\nline2"');
});

test("an ordinary value is not quoted or prefixed", () => {
  assert.equal(escapeCell("INV-0042"), "INV-0042");
  assert.equal(escapeCell(""), "");
});
