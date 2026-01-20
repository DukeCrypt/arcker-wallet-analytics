const { ethers } = require("ethers");

// ===============================
// ARC NETWORK CONFIG
// ===============================
const ARC_TESTNET_RPC = "https://rpc.testnet.arc.network";
const provider = new ethers.JsonRpcProvider(ARC_TESTNET_RPC);

// Wallet you provided
const WALLET_ADDRESS = "0xc59E942dC65f7eabCa195A71BCFEE5Bf0CcA2afE";

// Ethereum comparison assumptions
const ETH_GAS_PRICE_GWEI = 30;
const ETH_PRICE_USD = 2500;

// ===============================
// WALLET ANALYZER
// ===============================
async function analyzeWallet(walletAddress) {
  console.log("Starting wallet analysis...");
  console.log("Wallet:", walletAddress);

  const latestBlock = await provider.getBlockNumber();
  console.log("Latest Arc block:", latestBlock);

  let txCount = 0;
  let activeDays = new Set();
  let contracts = new Set();

  let totalUSDCGas = 0;
  let totalGasSavingsUSD = 0;

  // Scan last 200 blocks (safe + fast)
  for (let i = latestBlock; i > latestBlock - 200; i--) {
    if (i % 50 === 0) {
      console.log("Scanning block", i);
    }

    const block = await provider.getBlock(i, true);
    if (!block) continue;

    const day = new Date(block.timestamp * 1000)
      .toISOString()
      .slice(0, 10);

    for (const tx of block.transactions) {
      if (
        tx.from?.toLowerCase() === walletAddress.toLowerCase() ||
        tx.to?.toLowerCase() === walletAddress.toLowerCase()
      ) {
        txCount++;
        activeDays.add(day);
        if (tx.to) contracts.add(tx.to);

        // ===============================
        // GAS TRACKING (USDC)
        // ===============================
        const receipt = await provider.getTransactionReceipt(tx.hash);
        if (!receipt) continue;

        const gasUsed = Number(receipt.gasUsed);
        const gasPrice = Number(receipt.effectiveGasPrice);

        // Arc gas token = USDC (6 decimals)
        const gasCostUSDC = (gasUsed * gasPrice) / 1_000_000;
        totalUSDCGas += gasCostUSDC;

        // ===============================
        // GAS SAVINGS (ETH COMPARISON)
        // ===============================
        const ethGasCost =
          (gasUsed * (ETH_GAS_PRICE_GWEI * 1e9)) / 1e18;

        const ethCostUSD = ethGasCost * ETH_PRICE_USD;
        const savingsUSD = ethCostUSD - gasCostUSDC;

        totalGasSavingsUSD += savingsUSD;
      }
    }
  }

  return {
    wallet: walletAddress,
    totalTransactions: txCount,
    activeDays: activeDays.size,
    contractsInteracted: contracts.size,
    usdcGasSpent: totalUSDCGas.toFixed(6),
    gasSavingsUSD: totalGasSavingsUSD.toFixed(2),
  };
}

// ===============================
// RUN SCRIPT
// ===============================
async function main() {
  try {
    const stats = await analyzeWallet(WALLET_ADDRESS);

    console.log("\n===== WALLET SUMMARY =====");
    console.log(stats);
    console.log("==========================");
  } catch (err) {
    console.error("Error running wallet tracker:", err.message);
  }
}

main();
