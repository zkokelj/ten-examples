import hre from "hardhat";
import { formatEther } from "viem";

async function main() {
  // Get network name before connecting
  const networkName = process.env.HARDHAT_NETWORK || "hardhatMainnet";
  
  // Connect to the network first (required in Hardhat 3)
  const { viem } = await hre.network.connect();
  
  console.log("🚀 Starting deployment to", networkName);
  console.log("═".repeat(50));
  
  // Get deployer wallet
  const [deployer] = await viem.getWalletClients();
  console.log("📝 Deploying with account:", deployer.account.address);
  
  // Get balance
  const publicClient = await viem.getPublicClient();
  const balance = await publicClient.getBalance({ 
    address: deployer.account.address 
  });
  console.log("💰 Account balance:", formatEther(balance), "ETH");
  console.log("═".repeat(50));
  
  // Deploy Counter contract
  console.log("\n📦 Deploying Counter contract...");
  const counter = await viem.deployContract("Counter");
  
  console.log("✅ Counter deployed to:", counter.address);
  console.log("═".repeat(50));
  
  // Test the contract
  console.log("\n🧪 Testing Counter contract...");
  
  // Read initial value
  const initialValue = await counter.read.x();
  console.log("Initial value of x:", initialValue.toString());
  
  // Increment by 1
  console.log("\n📈 Calling inc()...");
  const hash1 = await counter.write.inc();
  await publicClient.waitForTransactionReceipt({ hash: hash1 });
  console.log("✅ Transaction confirmed:", hash1);
  
  const valueAfterInc = await counter.read.x();
  console.log("Value after inc():", valueAfterInc.toString());
  
  // Increment by 5
  console.log("\n📈 Calling incBy(5)...");
  const hash2 = await counter.write.incBy([5n]);
  await publicClient.waitForTransactionReceipt({ hash: hash2 });
  console.log("✅ Transaction confirmed:", hash2);
  
  const finalValue = await counter.read.x();
  console.log("Final value:", finalValue.toString());
  
  console.log("\n" + "═".repeat(50));
  console.log("🎉 Deployment and testing successful!");
  console.log("═".repeat(50));
  console.log("📋 Contract Address:", counter.address);
  console.log("🌐 Network:", networkName);
  console.log("═".repeat(50));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });