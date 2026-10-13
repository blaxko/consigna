import { test } from "node:test";
import assert from "node:assert/strict";
import { encodeErrorResult, keccak256, toBytes } from "viem";
import { consignaAbi } from "./abi.ts";
import { decodeRevertData } from "./consigna.ts";

const id = keccak256(toBytes("INV-0042"));
const payer = "0xaA9FE8c47cBFD12E1D6109b7c825c5b478A7B25c";

test("decodeRevertData recovers AlreadyPaid with its arguments", () => {
  const data = encodeErrorResult({
    abi: consignaAbi,
    errorName: "AlreadyPaid",
    args: [id, payer, 1791886904n],
  });
  const decoded = decodeRevertData(data, consignaAbi);
  assert.ok(decoded);
  assert.equal(decoded.errorName, "AlreadyPaid");
  assert.equal(decoded.args[0], id);
  assert.equal(String(decoded.args[1]).toLowerCase(), payer.toLowerCase());
  assert.equal(Number(decoded.args[2]), 1791886904);
});

test("decodeRevertData recovers an error with no arguments", () => {
  const data = encodeErrorResult({ abi: consignaAbi, errorName: "InvalidAmount" });
  assert.equal(decodeRevertData(data, consignaAbi)?.errorName, "InvalidAmount");
});

test("decodeRevertData returns undefined for data it cannot match", () => {
  assert.equal(decodeRevertData("0xdeadbeef", consignaAbi), undefined);
  assert.equal(decodeRevertData("0x", consignaAbi), undefined);
});
