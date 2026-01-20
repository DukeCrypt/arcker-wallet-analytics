const { ethers } = require("ethers");

// ✅ Correct RPC endpoint from Arc docs
const ARC_TESTNET_RPC = "https://rpc.testnet.arc.network";

// Connect provider to Arc Testnet
const provider = new ethers.JsonRpcProvider(ARC_TESTNET_RPC);

async function testConnection() {
  console.log("Connecting to Arc Testnet...");

  const blockNumber = await provider.getBlockNumber();

  console.log("Connected! Current Arc Testnet block:", blockNumber);
}

testConnection().catch((err) => {
  console.error("Connection failed:", err.message);
});
