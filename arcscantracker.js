// ===============================
// ARCScan Wallet Tracker
// ===============================

// Node 18+ has fetch built-in
const WALLET = "0xc59E942dC65f7eabCa195A71BCFEE5Bf0CcA2afE";
const ARCSCAN_API = "https://testnet.arcscan.app/api";

// Ethereum comparison assumptions
const ETH_GAS_PRICE_GWEI = 30;
const ETH_PRICE_USD = 2500;

// ===============================
// FETCH TX HISTORY
// ===============================
async function fetchTransactions(address) {
  console.log("Calling ArcScan API...");

  const url =
    `${ARCSCAN_API}` +
    `?module=account` +
    `&action=txlist` +
    `&address=${address}` +
    `&startblock=0` +
    `&endblock=99999999` +
    `&sort=asc`;

  const res = await fetch(url);

  if (!res.ok) {
    throw new Error("HTTP error: " + res.status);
  }

  const data = await res.json();

  console.log("ArcScan raw status:", data.status);

  if (data.status !== "1") {
    throw new Error("ArcScan returned no transactions");
  }

  return data.result;
}

// ===============================
// ANALYZE WALLET
// ===============================
async function analyzeWallet() {
  console.log("Starting ArcScan wallet analysis...");
  console.log("Wallet:", WALLET);

  const txs = await fetchTransactions(WALLET);

  console.log(`Fetched ${txs.length} transactions`);

  let activeDays = new Set();
  let contracts = new Set();
  let totalUSDCGas = 0;
  let totalSavingsUSD = 0;

  for (const tx of txs) {
    const day = new Date(tx.timeStamp * 1000)
      .toISOString()
      .slice(0, 10);
    activeDays.add(day);

    if (tx.to) {
      contracts.add(tx.to);
    }

    const gasUsed = Number(tx.gasUsed);
    const gasPrice = Number(tx.gasPrice);

    // USDC gas (6 decimals)
    const gasCostUSDC = (gasUsed * gasPrice) / 1_000_000;
    totalUSDCGas += gasCostUSDC;

    // ETH comparison
    const ethGasCost =
      (gasUsed * (ETH_GAS_PRICE_GWEI * 1e9)) / 1e18;

    const ethCostUSD = ethGasCost * ETH_PRICE_USD;
    totalSavingsUSD += ethCostUSD - gasCostUSDC;
  }

  return {
    wallet: WALLET,
    totalTransactions: txs.length,
    activeDays: activeDays.size,
    contractsInteracted: contracts.size,
    usdcGasSpent: totalUSDCGas.toFixed(6),
    gasSavingsUSD: totalSavingsUSD.toFixed(2),
    firstTxDate: txs.length
      ? new Date(txs[0].timeStamp * 1000).toISOString()
      : null,
  };
}

// ===============================
// RUN
// ===============================
analyzeWallet()
  .then((stats) => {
    console.log("\n===== WALLET SUMMARY =====");
    console.log(stats);
    console.log("==========================");
  })
  .catch((err) => {
    console.error("ERROR:", err.message);
  });
