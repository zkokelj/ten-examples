import { privateKeyToAccount } from "viem/accounts";

const privateKey = process.env.TEN_PRIVATE_KEY;

if (!privateKey) {
  console.error("❌ TEN_PRIVATE_KEY not found in .env");
  process.exit(1);
}

const account = privateKeyToAccount(`0x${privateKey}` as `0x${string}`);
console.log("Address from private key:", account.address);
console.log("Expected address:        0x12a489c0B2bB011A63E7976FA5704EE35e7C4d8C");
console.log("Match:", account.address.toLowerCase() === "0x12a489c0B2bB011A63E7976FA5704EE35e7C4d8C".toLowerCase() ? "✅" : "❌");