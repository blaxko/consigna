import hre from "hardhat";
import fs from "node:fs";
import path from "node:path";
import {
  createWalletClient,
  decodeErrorResult,
  encodeFunctionData,
  http,
  keccak256,
  stringToHex,
  type Address,
  type Hex,
  type PublicClient,
  type TransactionReceipt,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  ARC_CHAIN_ID,
  ARC_RPC,
  EXPLORER,
  USDC,
  arc,
  assertArcMainnet,
  erc20Abi,
  fmtUsdc,
  getFees,
  publicClient,
  requireKey,
} from "./lib/arc";

const AMOUNT = 10_000n; // 0.01 USDC, 6 decimals
const PAYER_MARGIN = 50_000n; // 0.05 USDC, CLAUDE.md R6
const DUPLICATE_GAS = 120_000n; // CLAUDE.md R8: fixed gas, no simulation
const STATUS = ["None", "Open", "Paid", "Cancelled"] as const;
type InvoiceView = { status: number };

type Tx = { label: string; hash: Hex; owner: "issuer" | "payer"; receipt: TransactionReceipt };
const txs: Tx[] = [];

async function waitOk(client: PublicClient, hash: Hex, label: string, owner: "issuer" | "payer") {
  const receipt = await client.waitForTransactionReceipt({ hash, timeout: 60_000 });
  if (receipt.status !== "success") throw new Error(`${label} reverted unexpectedly: ${EXPLORER}/tx/${hash}`);
  txs.push({ label, hash, owner, receipt });
  return receipt;
}

/** Finds the first hex revert payload in a viem/RPC error chain. */
function findRevertData(e: unknown): Hex | undefined {
  let cur: any = e;
  for (let depth = 0; cur && depth < 10; depth++) {
    if (typeof cur.data === "string" && /^0x[0-9a-fA-F]{8,}$/.test(cur.data)) return cur.data as Hex;
    if (typeof cur.data?.data === "string" && /^0x[0-9a-fA-F]{8,}$/.test(cur.data.data)) return cur.data.data as Hex;
    cur = cur.cause;
  }
  return undefined;
}

async function main() {
  if (hre.network.name !== "arc") throw new Error(`Run with --network arc. Got "${hre.network.name}".`);

  const deployed = JSON.parse(fs.readFileSync(path.resolve("deployments", "arc.json"), "utf8"));
  if (deployed.chainId !== ARC_CHAIN_ID) throw new Error(`deployments/arc.json has chainId ${deployed.chainId}.`);
  const CONSIGNA = deployed.address as Address;

  const client = publicClient();
  await assertArcMainnet(client);

  const artifact = await hre.artifacts.readArtifact("Consigna");
  const abi = artifact.abi;

  const issuer = privateKeyToAccount(requireKey("DEPLOYER_KEY"));
  const payer = privateKeyToAccount(requireKey("PAYER_KEY"));
  if (issuer.address.toLowerCase() === payer.address.toLowerCase()) {
    throw new Error("DEPLOYER_KEY and PAYER_KEY are the same address. Use two wallets for the smoke test.");
  }
  if ((await client.getCode({ address: CONSIGNA })) === undefined) throw new Error("No code at the deployed address.");

  const issuerWallet = createWalletClient({ account: issuer, chain: arc, transport: http(ARC_RPC) });
  const payerWallet = createWalletClient({ account: payer, chain: arc, transport: http(ARC_RPC) });

  const bal = (a: Address) =>
    client.readContract({ address: USDC, abi: erc20Abi, functionName: "balanceOf", args: [a] });

  const issuerBefore = await bal(issuer.address);
  const payerBefore = await bal(payer.address);
  console.log(`Chain ID: ${ARC_CHAIN_ID} (verified)   Consigna: ${CONSIGNA}`);
  console.log(`Issuer ${issuer.address} before: ${fmtUsdc(issuerBefore)} USDC`);
  console.log(`Payer  ${payer.address} before: ${fmtUsdc(payerBefore)} USDC`);
  if (payerBefore < AMOUNT + PAYER_MARGIN) {
    throw new Error(`Payer needs at least ${fmtUsdc(AMOUNT + PAYER_MARGIN)} USDC. Nothing was sent.`);
  }

  const fees = await getFees(client);
  const stamp = Date.now().toString(36);
  const refA = `SMOKE-${stamp}-A`; // all refs <= 32 bytes, ASCII
  const refB = `SMOKE-${stamp}-B`;
  const details = keccak256(stringToHex(`smoke:${stamp}`));

  // 1. Create invoice A (0.01 USDC)
  const idA = await client.readContract({ address: CONSIGNA, abi, functionName: "idFor", args: [issuer.address, refA] });
  const hCreateA = await issuerWallet.writeContract({
    address: CONSIGNA, abi, functionName: "createInvoice", args: [refA, USDC, AMOUNT, details], ...fees,
  });
  await waitOk(client, hCreateA, "1. create invoice A", "issuer");
  console.log(`1. created ${refA}  id ${idA}`);

  // 2. Approve exactly the invoice amount, then pay
  const hApprove = await payerWallet.writeContract({
    address: USDC, abi: erc20Abi, functionName: "approve", args: [CONSIGNA, AMOUNT], ...fees,
  });
  await waitOk(client, hApprove, "approve exact 0.01 USDC", "payer");

  const hPay = await payerWallet.writeContract({
    address: CONSIGNA, abi, functionName: "pay", args: [idA], ...fees,
  });
  const payReceipt = await waitOk(client, hPay, "2. pay invoice A", "payer");
  const afterPay = (await client.readContract({ address: CONSIGNA, abi, functionName: "getInvoice", args: [idA] })) as InvoiceView;
  if (afterPay.status !== 2) throw new Error(`Invoice A should be Paid (2), got ${afterPay.status}.`);
  console.log(`2. paid in block ${payReceipt.blockNumber}, status ${STATUS[afterPay.status]}`);

  // 3. Duplicate pay: raw sendTransaction, no simulation, fixed gas. It must land as a failed tx.
  const payData = encodeFunctionData({ abi, functionName: "pay", args: [idA] });
  const hDup = await payerWallet.sendTransaction({
    to: CONSIGNA, data: payData, gas: DUPLICATE_GAS, ...fees,
  });
  const dupReceipt = await client.waitForTransactionReceipt({ hash: hDup, timeout: 30_000 });
  if (dupReceipt.status === "success") {
    throw new Error(`STOP: duplicate payment SUCCEEDED in ${hDup}. The contract allowed a second payment.`);
  }
  txs.push({ label: "3. duplicate pay (failed on-chain)", hash: hDup, owner: "payer", receipt: dupReceipt });

  // Decode the revert: eth_call with the same calldata at the failed tx's block.
  let decodedName = "unknown";
  let decodedArgs: readonly unknown[] = [];
  try {
    await client.call({ account: payer.address, to: CONSIGNA, data: payData, blockNumber: dupReceipt.blockNumber });
    decodedName = "NO REVERT at block (unexpected)";
  } catch (e) {
    const raw = findRevertData(e);
    if (raw) {
      const d = decodeErrorResult({ abi, data: raw });
      decodedName = d.errorName;
      decodedArgs = d.args ?? [];
    } else {
      decodedName = `undecodable: ${(e as Error).message?.split("\n")[0]}`;
    }
  }
  console.log(`3. duplicate reverted in block ${dupReceipt.blockNumber}. Decoded error: ${decodedName}`);
  console.log(`   args: ${JSON.stringify(decodedArgs, (_k, v) => (typeof v === "bigint" ? v.toString() : v))}`);
  if (decodedName !== "AlreadyPaid") throw new Error(`Expected AlreadyPaid, got ${decodedName}.`);

  // 4. Create invoice B, then cancel it
  const idB = await client.readContract({ address: CONSIGNA, abi, functionName: "idFor", args: [issuer.address, refB] });
  const hCreateB = await issuerWallet.writeContract({
    address: CONSIGNA, abi, functionName: "createInvoice", args: [refB, USDC, AMOUNT, details], ...fees,
  });
  await waitOk(client, hCreateB, "create invoice B", "issuer");
  const hCancel = await issuerWallet.writeContract({
    address: CONSIGNA, abi, functionName: "cancel", args: [idB], ...fees,
  });
  const cancelReceipt = await waitOk(client, hCancel, "4. cancel invoice B", "issuer");
  const afterCancel = (await client.readContract({ address: CONSIGNA, abi, functionName: "getInvoice", args: [idB] })) as InvoiceView;
  if (afterCancel.status !== 3) throw new Error(`Invoice B should be Cancelled (3), got ${afterCancel.status}.`);
  console.log(`4. cancelled ${refB} in block ${cancelReceipt.blockNumber}, status ${STATUS[afterCancel.status]}`);

  // Balances after
  const issuerAfter = await bal(issuer.address);
  const payerAfter = await bal(payer.address);
  const gasOf = (owner: "issuer" | "payer") =>
    txs.filter((t) => t.owner === owner).reduce((s, t) => s + t.receipt.gasUsed * t.receipt.effectiveGasPrice, 0n);

  console.log("");
  console.log("Explorer links");
  console.log(`  1. create invoice A      ${EXPLORER}/tx/${hCreateA}`);
  console.log(`  2. pay invoice A         ${EXPLORER}/tx/${hPay}`);
  console.log(`  3. duplicate (FAILED)    ${EXPLORER}/tx/${hDup}`);
  console.log(`  4. cancel invoice B      ${EXPLORER}/tx/${hCancel}`);
  console.log("");
  console.log("Balances (USDC, 6 decimals)");
  console.log(`  Issuer ${issuer.address}`);
  console.log(`    before ${fmtUsdc(issuerBefore)}   after ${fmtUsdc(issuerAfter)}   delta ${fmtUsdc(issuerAfter - issuerBefore)}`);
  console.log(`  Payer  ${payer.address}`);
  console.log(`    before ${fmtUsdc(payerBefore)}   after ${fmtUsdc(payerAfter)}   delta ${fmtUsdc(payerAfter - payerBefore)}`);
  console.log(`  Gas paid (native, 18 decimals): issuer ${Number(gasOf("issuer")) / 1e18} USDC, payer ${Number(gasOf("payer")) / 1e18} USDC`);
  console.log("");
  console.log("SMOKE TEST PASSED");
}

main().catch((e) => {
  console.error("ABORTED:", e?.shortMessage ?? e?.message ?? e);
  process.exitCode = 1;
});
