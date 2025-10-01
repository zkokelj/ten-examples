# Deploying Smart Contracts to TEN Testnet with Hardhat 3

This guide covers deploying smart contracts to TEN testnet using Hardhat 3 and Hardhat Ignition.

## Prerequisites

- Node.js v22 or later
- TEN testnet account with funds
- TEN testnet RPC URL and authentication token

## Setup

### 1. Install Dependencies

```bash
npm install --save-dev hardhat@3 @nomicfoundation/hardhat-toolbox-viem @nomicfoundation/hardhat-ignition @nomicfoundation/hardhat-ignition-viem dotenv
```

### 2. Configure Environment Variables

Create a `.env` file in the project root:

```env
TEN_RPC_URL=https://your-ten-rpc-url.com
TEN_AUTH_TOKEN=your_authentication_token
TEN_PRIVATE_KEY=your_private_key_without_0x_prefix
```

**Important:** Never commit `.env` to git. Make sure it's in `.gitignore`.

### 3. Configure Hardhat

Create or update `hardhat.config.ts` with TEN testnet configuration:

```typescript
import "dotenv/config";
import type { HardhatUserConfig } from "hardhat/config";
import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";

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
    tenTestnet: {
      type: "http",
      chainType: "generic",
      url: `${process.env.TEN_RPC_URL}/v1/?token=${process.env.TEN_AUTH_TOKEN}`,
      accounts: process.env.TEN_PRIVATE_KEY
        ? [`0x${process.env.TEN_PRIVATE_KEY}`]
        : [],
      chainId: 8443,
    },
  },
};

export default config;
```

## Deployment

### Deploy to Local Hardhat Network

```bash
npx hardhat ignition deploy ignition/modules/Counter.ts --network hardhatMainnet
```

### Deploy to TEN Testnet

```bash
npx hardhat ignition deploy ignition/modules/Counter.ts --network tenTestnet
```

## Creating Deployment Modules

Hardhat Ignition uses declarative modules instead of deployment scripts. Create your deployment module in `ignition/modules/`:

### Simple Contract Deployment

```typescript
// ignition/modules/Counter.ts
import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const CounterModule = buildModule("CounterModule", (m) => {
  const counter = m.contract("Counter");
  return { counter };
});

export default CounterModule;
```

### Contract with Constructor Arguments

```typescript
// ignition/modules/ERC20Token.ts
import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const ERC20Module = buildModule("ERC20Module", (m) => {
  const name = m.getParameter("name", "MyToken");
  const symbol = m.getParameter("symbol", "MTK");
  const initialSupply = m.getParameter("initialSupply", 1000000n);

  const token = m.contract("MyERC20Token", [name, symbol, initialSupply]);

  return { token };
});

export default ERC20Module;
```

### Contract with Initial Setup Calls

```typescript
// ignition/modules/TokenWithDistribution.ts
import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const TokenModule = buildModule("TokenModule", (m) => {
  const token = m.contract("MyToken", ["MyToken", "MTK", 1000000n]);

  // Initial distribution
  m.call(token, "transfer", [
    "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    10000n,
  ]);
  m.call(token, "transfer", ["0x123...", 20000n]);

  return { token };
});

export default TokenModule;
```

## Deployment Information

Deployment details are stored in `ignition/deployments/chain-{chainId}/`:

- Contract addresses: `deployed_addresses.json`
- Deployment parameters: `parameters.json`
- Journal of all operations: `journal.jsonl`

Example for TEN testnet: `ignition/deployments/chain-8443/deployed_addresses.json`

## Testing

Run all tests:

```bash
npx hardhat test
```

Run Solidity tests only:

```bash
npx hardhat test solidity
```

Run TypeScript tests only:

```bash
npx hardhat test nodejs
```

## Troubleshooting

### "Insufficient funds"

- Ensure your TEN testnet account has native tokens for gas fees
- Check balance using a TEN block explorer

### "Network timeout" or "Connection refused"

- Verify `TEN_RPC_URL` is correct in `.env`
- Ensure `TEN_AUTH_TOKEN` is valid and not expired
- Check that the RPC endpoint is accessible

### "Invalid private key"

- Ensure the private key in `.env` does NOT include the `0x` prefix
- Verify you copied the entire private key correctly

### Wrong account deploying

- Double-check that `TEN_PRIVATE_KEY` corresponds to your authenticated TEN testnet account
- You can verify the address with: `npx hardhat console --network tenTestnet`

## Key Differences from Hardhat 2

- **ESM modules required**: Set `"type": "module"` in `package.json`
- **TypeScript config**: Use `hardhat.config.ts` instead of `.js`
- **Ignition for deployment**: Declarative modules instead of imperative scripts
- **No deploy scripts needed**: Ignition handles deployment logic

## Additional Resources

- [Hardhat 3 Documentation](https://hardhat.org/docs/getting-started)
- [Hardhat Ignition Documentation](https://hardhat.org/ignition)
- [Viem Documentation](https://viem.sh/)
- [TEN Network Documentation](https://docs.ten.xyz/)
