import "dotenv/config";
import hre from "hardhat";
import { formatEther, defineChain, createWalletClient, http, createPublicClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";

// Define TEN testnet chain
const tenTestnet = defineChain({
  id: 8443,
  name: "TEN Testnet",
  network: "ten-testnet",
  nativeCurrency: {
    decimals: 18,
    name: "Ethereum",
    symbol: "ETH",
  },
  rpcUrls: {
    default: {
      http: [`${process.env.TEN_RPC_URL}/v1/?token=${process.env.TEN_AUTH_TOKEN}`],
    },
    public: {
      http: [`${process.env.TEN_RPC_URL}/v1/?token=${process.env.TEN_AUTH_TOKEN}`],
    },
  },
  blockExplorers: {
    default: {
      name: "TEN Explorer",
      url: "https://tenscan.io",
    },
  },
});

async function main() {
  console.log("🚀 Starting deployment to TEN Testnet");
  console.log("═".repeat(50));
  
  // Create account from private key
  const account = privateKeyToAccount(`0x${process.env.TEN_PRIVATE_KEY}` as `0x${string}`);
  console.log("📝 Deploying with account:", account.address);
  
  // Verify it's the authenticated account
  const expectedAddress = "0x12a489c0B2bB011A63E7976FA5704EE35e7C4d8C";
  if (account.address.toLowerCase() !== expectedAddress.toLowerCase()) {
    console.error("❌ ERROR: Not using the authenticated TEN account!");
    console.error("   Expected:", expectedAddress);
    console.error("   Got:     ", account.address);
    process.exit(1);
  }
  console.log("✅ Using authenticated TEN account");
  
  // Create public client for reading blockchain data
  const publicClient = createPublicClient({
    chain: tenTestnet,
    transport: http(),
  });
  
  // Create wallet client for sending transactions
  const walletClient = createWalletClient({
    account,
    chain: tenTestnet,
    transport: http(),
  });
  
  // Get balance
  const balance = await publicClient.getBalance({ 
    address: account.address 
  });
  console.log("💰 Account balance:", formatEther(balance), "ETH");
  console.log("═".repeat(50));
  
  // Deploy Counter contract using Hardhat artifacts
  console.log("\n📦 Deploying Counter contract...");
  
  // Get contract artifact
  const artifact = await hre.artifacts.readArtifact("Counter");
  
  // Deploy the contract
  const hash = await walletClient.deployContract({
    abi: artifact.abi,
    bytecode: artifact.bytecode as `0x${string}`,
    account,
  });
  
  console.log("📤 Deployment transaction sent:", hash);
  console.log("⏳ Waiting for confirmation...");
  
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  const counterAddress = receipt.contractAddress;
  
  if (!counterAddress) {
    throw new Error("Contract deployment failed - no address returned");
  }
  
  console.log("✅ Counter deployed to:", counterAddress);
  console.log("═".repeat(50));
  
  // Get contract instance for interaction
  const counter = {
    address: counterAddress,
    abi: artifact.abi,
  };
  
  // Test the contract
  console.log("\n🧪 Testing Counter contract...");
  
  // Read initial value
  const initialValue = await publicClient.readContract({
    address: counter.address,
    abi: counter.abi,
    functionName: "x",
  });
  console.log("Initial value of x:", initialValue.toString());
  
  // Increment by 1
  console.log("\n📈 Calling inc()...");
  const hash1 = await walletClient.writeContract({
    address: counter.address,
    abi: counter.abi,
    functionName: "inc",
    account,
  });
  await publicClient.waitForTransactionReceipt({ hash: hash1 });
  console.log("✅ Transaction confirmed:", hash1);
  
  const valueAfterInc = await publicClient.readContract({
    address: counter.address,
    abi: counter.abi,
    functionName: "x",
  });
  console.log("Value after inc():", valueAfterInc.toString());
  
  // Increment by 5
  console.log("\n📈 Calling incBy(5)...");
  const hash2 = await walletClient.writeContract({
    address: counter.address,
    abi: counter.abi,
    functionName: "incBy",
    args: [5n],
    account,
  });
  await publicClient.waitForTransactionReceipt({ hash: hash2 });
  console.log("✅ Transaction confirmed:", hash2);
  
  const finalValue = await publicClient.readContract({
    address: counter.address,
    abi: counter.abi,
    functionName: "x",
  });
  console.log("Final value:", finalValue.toString());
  
  console.log("\n" + "═".repeat(50));
  console.log("🎉 Deployment and testing successful!");
  console.log("═".repeat(50));
  console.log("📋 Contract Address:", counterAddress);
  console.log("🌐 Network: TEN Testnet (Chain ID: 8443)");
  console.log("═".repeat(50));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });