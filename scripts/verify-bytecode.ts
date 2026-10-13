import hre from "hardhat";
import fs from "node:fs";
import path from "node:path";
import { pad, type Address, type Hex } from "viem";
import { ARC_CHAIN_ID, EURC, USDC, assertArcMainnet, publicClient } from "./lib/arc";

// Compares the deployed runtime bytecode on Arc mainnet with the local compile.
// Immutable slots (USDC, EURC) differ per deployment, so they are masked for the byte
// comparison, and then checked separately against the expected addresses.

type ImmutableRef = { start: number; length: number };

async function main() {
  const deployFile = path.resolve("deployments", "arc.json");
  const deployed = JSON.parse(fs.readFileSync(deployFile, "utf8")) as {
    address: Address;
    chainId: number;
  };
  if (deployed.chainId !== ARC_CHAIN_ID) throw new Error(`deployments/arc.json chainId ${deployed.chainId} is not ${ARC_CHAIN_ID}.`);

  const client = publicClient();
  await assertArcMainnet(client);

  const artifact = await hre.artifacts.readArtifact("Consigna");
  const buildInfo = await hre.artifacts.getBuildInfo("contracts/Consigna.sol:Consigna");
  if (!buildInfo) throw new Error("Build info not found. Run `npx hardhat compile` first.");
  const compiled = buildInfo.output.contracts["contracts/Consigna.sol"]["Consigna"];
  const refs: Record<string, ImmutableRef[]> = compiled.evm.deployedBytecode.immutableReferences ?? {};

  const local = artifact.deployedBytecode.toLowerCase().slice(2);
  const chainCode = await client.getCode({ address: deployed.address });
  if (!chainCode || chainCode === "0x") throw new Error(`MISMATCH: no code at ${deployed.address} on chain ${ARC_CHAIN_ID}.`);
  const chain = chainCode.toLowerCase().slice(2);

  console.log(`Address:        ${deployed.address}`);
  console.log(`Chain ID:       ${ARC_CHAIN_ID}`);
  console.log(`Local bytes:    ${local.length / 2}`);
  console.log(`Chain bytes:    ${chain.length / 2}`);

  if (local.length !== chain.length) {
    console.log(`MISMATCH: length differs (local ${local.length / 2} bytes, chain ${chain.length / 2} bytes).`);
    process.exitCode = 1;
    return;
  }

  // Collect the immutable byte ranges (hex char offsets) and read the chain's values there.
  const ranges: { start: number; end: number }[] = [];
  for (const list of Object.values(refs)) {
    for (const r of list) ranges.push({ start: r.start * 2, end: (r.start + r.length) * 2 });
  }
  ranges.sort((a, b) => a.start - b.start);

  const mask = (hex: string) => {
    let out = "";
    let cursor = 0;
    for (const r of ranges) {
      out += hex.slice(cursor, r.start) + "0".repeat(r.end - r.start);
      cursor = r.end;
    }
    return out + hex.slice(cursor);
  };

  const localMasked = mask(local);
  const chainMasked = mask(chain);

  // First differing byte, if any, for the report
  let firstDiff = -1;
  for (let i = 0; i < localMasked.length; i += 2) {
    if (localMasked.slice(i, i + 2) !== chainMasked.slice(i, i + 2)) {
      firstDiff = i / 2;
      break;
    }
  }

  // Check each immutable slot holds one of the expected token addresses (left-padded to 32 bytes)
  const expectedWords = new Map<string, string>([
    [pad(USDC.toLowerCase() as Hex, { size: 32 }).slice(2), "USDC"],
    [pad(EURC.toLowerCase() as Hex, { size: 32 }).slice(2), "EURC"],
  ]);
  const slotReport: string[] = [];
  let immutableOk = true;
  for (const r of ranges) {
    const word = chain.slice(r.start, r.end);
    const name = expectedWords.get(word);
    slotReport.push(`    offset ${r.start / 2}: ${name ?? "UNEXPECTED " + word}`);
    if (!name) immutableOk = false;
  }
  const names = new Set(slotReport.map((s) => s.split(": ")[1]));
  if (ranges.length > 0 && (!names.has("USDC") || !names.has("EURC"))) immutableOk = false;

  console.log(`Immutable slots (${ranges.length}):`);
  slotReport.forEach((s) => console.log(s));

  if (firstDiff === -1 && immutableOk) {
    console.log("MATCH: runtime bytecode is identical to the local compile, with immutables masked. Immutable values are USDC and EURC as deployed.");
    console.log(`       Explorer: https://explorer.arc.io/address/${deployed.address}`);
  } else if (firstDiff !== -1) {
    console.log(`MISMATCH: bytecode differs at byte ${firstDiff} (local 0x${localMasked.slice(firstDiff * 2, firstDiff * 2 + 8)}..., chain 0x${chainMasked.slice(firstDiff * 2, firstDiff * 2 + 8)}...).`);
    process.exitCode = 1;
  } else {
    console.log("MISMATCH: immutable slots do not hold the expected USDC and EURC addresses.");
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error("ERROR:", e?.shortMessage ?? e?.message ?? e);
  process.exitCode = 1;
});
