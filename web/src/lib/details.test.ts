import { test } from "node:test";
import assert from "node:assert/strict";
import { keccak256, toBytes } from "viem";
import { encodeDetails, decodeDetails, hashDetails, toFragment, fromFragment, MAX_DETAILS_BYTES } from "./details.ts";

const sample = {
  v: 1 as const,
  client: "Acme Inc.",
  due: "2026-10-31",
  items: [{ desc: "Logo design", qty: 1, unit: "5.00" }],
  note: "Thanks!",
};

const SAMPLE_CANONICAL =
  '{"v":1,"client":"Acme Inc.","due":"2026-10-31","items":[{"desc":"Logo design","qty":1,"unit":"5.00"}],"note":"Thanks!"}';

// keccak256 of the empty byte string, a published constant. Checks the hash primitive itself.
const KECCAK_EMPTY = "0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470";

test("keccak256 primitive matches the published empty-string constant", () => {
  assert.equal(keccak256(new Uint8Array()), KECCAK_EMPTY);
});

test("canonical JSON has PRD key order, no whitespace, and amounts as decimal strings", () => {
  assert.equal(encodeDetails(sample), SAMPLE_CANONICAL);
});

test("canonical form does not depend on the input key order", () => {
  const shuffled = {
    note: "Thanks!",
    items: [{ unit: "5.00", desc: "Logo design", qty: 1 }],
    due: "2026-10-31",
    client: "Acme Inc.",
    v: 1 as const,
  };
  assert.equal(encodeDetails(shuffled), SAMPLE_CANONICAL);
});

test("optional keys are omitted when absent, not written as null", () => {
  const bare = { v: 1 as const, client: "Acme Inc.", items: [{ desc: "Retainer", qty: 2, unit: "0.10" }] };
  assert.equal(
    encodeDetails(bare),
    '{"v":1,"client":"Acme Inc.","items":[{"desc":"Retainer","qty":2,"unit":"0.10"}]}',
  );
});

test("hashDetails is keccak256 of the UTF-8 canonical JSON, and stable across runs", () => {
  // Independent computation: viem's keccak256 over the literal canonical string pinned above.
  assert.equal(hashDetails(sample), keccak256(toBytes(SAMPLE_CANONICAL)));
});

test("encodeDetails rejects canonical JSON over 1500 bytes", () => {
  const big = { v: 1 as const, client: "x", items: [{ desc: "a".repeat(MAX_DETAILS_BYTES), qty: 1, unit: "1.00" }] };
  assert.throws(() => encodeDetails(big), /1500/);
});

test("encodeDetails accepts exactly 1500 bytes", () => {
  // Overhead of the JSON wrapper with an empty-desc item, then pad desc to hit exactly 1500 bytes.
  const overhead = encodeDetails({ v: 1 as const, client: "x", items: [{ desc: "", qty: 1, unit: "1.00" }] }).length;
  const padded = { v: 1 as const, client: "x", items: [{ desc: "a".repeat(MAX_DETAILS_BYTES - overhead), qty: 1, unit: "1.00" }] };
  assert.equal(new TextEncoder().encode(encodeDetails(padded)).length, MAX_DETAILS_BYTES);
});

test("encodeDetails rejects a unit price with more than 6 decimals, and a non-positive qty", () => {
  assert.throws(() => encodeDetails({ ...sample, items: [{ desc: "a", qty: 1, unit: "5.0000001" }] }), /unit/);
  assert.throws(() => encodeDetails({ ...sample, items: [{ desc: "a", qty: 0, unit: "1.00" }] }), /qty/);
  assert.throws(() => encodeDetails({ ...sample, items: [{ desc: "a", qty: 1.5, unit: "1.00" }] }), /qty/);
});

test("fragment round-trips and keeps the same hash", () => {
  const frag = toFragment(sample);
  assert.match(frag, /^[A-Za-z0-9_-]+$/); // base64url, no padding, no +, /, =
  const back = fromFragment(frag);
  assert.deepEqual(back, sample);
  assert.equal(hashDetails(back), hashDetails(sample));
});

test("fromFragment rejects non-base64url, non-JSON, and anything that decodes to over 1500 bytes", () => {
  assert.throws(() => fromFragment("not base64!"), /fragment/);
  assert.throws(() => fromFragment(Buffer.from("{not json").toString("base64url")), /fragment/);
  const oversize = Buffer.from("x".repeat(MAX_DETAILS_BYTES + 1)).toString("base64url");
  assert.throws(() => fromFragment(oversize), /1500/);
});

test("decodeDetails validates the shape and returns a plain object", () => {
  assert.deepEqual(decodeDetails(JSON.parse(SAMPLE_CANONICAL)), sample);
  assert.throws(() => decodeDetails({ v: 2, client: "x", items: [] }), /version/);
});
