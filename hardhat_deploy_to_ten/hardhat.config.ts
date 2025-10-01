import "dotenv/config";  // Load .env first!
import type { HardhatUserConfig } from "hardhat/config";
import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import { configVariable } from "hardhat/config";

const config: HardhatUserConfig = {
  plugins: [hardhatToolboxViemPlugin],
  solidity: {
    profiles: {
      default: {
        version: "0.8.28",
      },
      production: {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    },
  },
  networks: {
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
    },
    hardhatOp: {
      type: "edr-simulated",
      chainType: "op",
    },
    sepolia: {
      type: "http",
      chainType: "l1",
      url: configVariable("SEPOLIA_RPC_URL"),
      accounts: [configVariable("SEPOLIA_PRIVATE_KEY")],
    },
    // TEN Testnet
    tenTestnet: {
      type: "http",
      chainType: "generic",
      url: `${process.env.TEN_RPC_URL}/v1/?token=${process.env.TEN_AUTH_TOKEN}`,
      accounts: process.env.TEN_PRIVATE_KEY ? [`0x${process.env.TEN_PRIVATE_KEY}`] : [],
      chainId: 8443,  // Hardcoded to 8443
    },
  },
};

export default config;