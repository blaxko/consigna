import "@nomicfoundation/hardhat-toolbox-viem";
import * as dotenv from "dotenv";
import type { HardhatUserConfig } from "hardhat/config";

dotenv.config();

// Arc mainnet only. There is no testnet entry anywhere in this project.
// `hardhat` (in-memory) is the default network for `hardhat test` and `hardhat coverage`.
const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.26",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    arc: {
      url: process.env.ARC_RPC ?? "https://rpc.mainnet.arc.io",
      chainId: 5042,
      accounts: process.env.DEPLOYER_KEY ? [process.env.DEPLOYER_KEY] : [],
    },
  },
};

export default config;
