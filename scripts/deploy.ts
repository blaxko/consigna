import hre from "hardhat";
import fs from "node:fs";
import path from "node:path";
import { createWalletClient, encodeDeployData, http, formatUnits, isAddressEqual, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  ARC_CHAIN_ID,
  ARC_RPC,
  EURC,
  EXPLORER,
  USDC,
  arc,
  assertArcMainnet,
  erc20Abi,
  fmtUsdc,
  getFees,
  nativeToUnits6Ceil,
  publicClient,
  requireKey,
} from "./lib/arc";

// Hard cap from the Phase 2 brief: abort if the worst-case deploy cost is above 0.30 USDC.
// Expressed in 18-decimal native units, because gas is paid in native USDC.
const MAX_DEPLOY_COST_NATIVE = 300_000_000_000_000_000n; // 0.30 USDC

async function main() {
  if (hre.network.name !== "arc") {
    throw new Error(`Run with --network arc. Got network "${hre.network.name}".`);
  }

  const deployFile = path.resolve("deployments", "arc.json");
  if (fs.existsSync(deployFile)) {
    throw new Error(`${deployFile} already exists. Refusing to deploy twice. Delete it only for an intentional redeploy.`);
  }

  const client = publicClient();
  await assertArcMainnet(client); // abort before anything else if the chain is wrong

  const account = privateKeyToAccount(requireKey("DEPLOYER_KEY"));
  const usdcBalance = await client.readContract({
    address: USDC,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [account.address],
  });

  console.log(`Chain ID:            ${ARC_CHAIN_ID} (Arc mainnet, verified)`);
  console.log(`RPC:                 ${ARC_RPC}`);
  console.log(`Deployer:            ${account.address}`);
  console.log(`Deployer USDC:       ${fmtUsdc(usdcBalance)} USDC (ERC-20 balanceOf, 6 decimals)`);

  const artifact = await hre.artifacts.readArtifact("Consigna");
  const bytecode = artifact.bytecode as Hex;
  const data = encodeDeployData({
    abi: artifact.abi,
    bytecode,
    args: [USDC, EURC],
  });

  const gas = await client.estimateGas({ account: account.address, data });
  const { maxFeePerGas, maxPriorityFeePerGas } = await getFees(client);
  const worstCaseNative = gas * maxFeePerGas;

  console.log(`Estimated gas:       ${gas}`);
  console.log(`maxFeePerGas:        ${formatUnits(maxFeePerGas, 9)} gwei (floor 20 gwei)`);
  console.log(`Worst-case cost:     ${formatUnits(worstCaseNative, 18)} USDC (native, 18 decimals)`);
  console.log(`Cap:                 0.30 USDC`);

  if (worstCaseNative > MAX_DEPLOY_COST_NATIVE) {
    throw new Error("Estimated deploy cost is above the 0.30 USDC cap. Nothing was sent.");
  }
  if (usdcBalance < nativeToUnits6Ceil(worstCaseNative)) {
    throw new Error("Deployer USDC balance is below the worst-case deploy cost. Nothing was sent.");
  }

  // Sends the deployment. No retry: if this fails, read the error and stop.
  const walletClient = createWalletClient({ account, chain: arc, transport: http(ARC_RPC) });
  const hash = await walletClient.deployContract({
    abi: artifact.abi,
    bytecode,
    args: [USDC, EURC],
    maxFeePerGas,
    maxPriorityFeePerGas,
    gas: (gas * 6n) / 5n,
  });
  console.log(`Deploy tx sent:      ${hash}`);
  console.log(`                     ${EXPLORER}/tx/${hash}`);

  const receipt = await client.waitForTransactionReceipt({ hash, timeout: 120_000 });
  if (receipt.status !== "success" || !receipt.contractAddress) {
    throw new Error(`Deploy transaction did not succeed (status ${receipt.status}). Check ${EXPLORER}/tx/${hash}. Do not retry automatically.`);
  }
  const address: Address = receipt.contractAddress;

  // Post-deploy checks: code exists, and the immutable token addresses are what we passed in.
  const code = await client.getCode({ address });
  if (!code || code === "0x") throw new Error(`No code at ${address} after deploy.`);
  const onUsdc = await client.readContract({ address, abi: artifact.abi, functionName: "USDC" });
  const onEurc = await client.readContract({ address, abi: artifact.abi, functionName: "EURC" });
  if (!isAddressEqual(onUsdc as Address, USDC) || !isAddressEqual(onEurc as Address, EURC)) {
    throw new Error(`Immutable token mismatch: USDC=${onUsdc} EURC=${onEurc}. Investigate before any use.`);
  }

  const actualNative = receipt.gasUsed * receipt.effectiveGasPrice;
  const out = {
    address,
    deployBlock: Number(receipt.blockNumber),
    txHash: hash,
    chainId: ARC_CHAIN_ID,
  };
  fs.mkdirSync(path.dirname(deployFile), { recursive: true });
  fs.writeFileSync(deployFile, JSON.stringify(out, null, 2) + "\n", { encoding: "utf8" });

  console.log("");
  console.log(`Consigna deployed:   ${address}`);
  console.log(`Deploy block:        ${receipt.blockNumber}`);
  console.log(`Actual cost:         ${formatUnits(actualNative, 18)} USDC (native)`);
  console.log(`Explorer:            https://explorer.arc.io/address/${address}`);
  console.log(`Wrote:               ${deployFile}`);
}

main().catch((e) => {
  console.error("ABORTED:", e?.shortMessage ?? e?.message ?? e);
  process.exitCode = 1;
});
