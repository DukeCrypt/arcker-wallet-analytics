const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();
app.use(cors());

const PORT = 3001;
const ARCSCAN_API = "https://testnet.arcscan.app/api";

// -------------------- ArcScan helpers --------------------
async function arcscanArray(params) {
  try {
    const res = await fetch(`${ARCSCAN_API}?${params}`, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "application/json",
      },
    });
    const data = await res.json();
    if (data.status !== "1" || !Array.isArray(data.result)) return [];
    return data.result;
  } catch (e) {
    return [];
  }
}

async function arcscanValue(params) {
  try {
    const res = await fetch(`${ARCSCAN_API}?${params}`, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "application/json",
      },
    });
    const data = await res.json();
    if (data.status !== "1") return "0";
    return data.result;
  } catch (e) {
    return "0";
  }
}

// -------------------- Analysis --------------------
async function analyzeWallet(address) {
  const nativeTxs = await arcscanArray(
    `module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=asc`
  );

  const tokenTxs = await arcscanArray(
    `module=account&action=tokentx&address=${address}&startblock=0&endblock=99999999&sort=asc`
  );

  const nativeBalanceRaw = await arcscanValue(
    `module=account&action=balance&address=${address}`
  );

  const nativeBalance = Number(nativeBalanceRaw) / 1e18;

  let nativeVolume = 0;
  let tokenVolume = 0;

  const activeDays = new Set();
  const activeWeeks = new Set();
  const activeMonths = new Set();

  let earliestTimestamp = Date.now();
  let totalContractInteractions = 0;
  const uniqueContracts = new Set();

  const tokenBalances = {};

  for (const tx of nativeTxs) {
    const ts = Number(tx.timeStamp) * 1000;
    earliestTimestamp = Math.min(earliestTimestamp, ts);

    const d = new Date(ts);
    activeDays.add(d.toISOString().slice(0, 10));
    activeWeeks.add(`${d.getUTCFullYear()}-W${Math.ceil(d.getUTCDate() / 7)}`);
    activeMonths.add(`${d.getUTCFullYear()}-${d.getUTCMonth() + 1}`);

    nativeVolume += Number(tx.value) / 1e18;

    if (tx.to && tx.input !== "0x") {
      totalContractInteractions++;
      uniqueContracts.add(tx.to);
    }
  }

  for (const tx of tokenTxs) {
    const ts = Number(tx.timeStamp) * 1000;
    earliestTimestamp = Math.min(earliestTimestamp, ts);

    const d = new Date(ts);
    activeDays.add(d.toISOString().slice(0, 10));
    activeWeeks.add(`${d.getUTCFullYear()}-W${Math.ceil(d.getUTCDate() / 7)}`);
    activeMonths.add(`${d.getUTCFullYear()}-${d.getUTCMonth() + 1}`);

    const value =
      Number(tx.value) / Math.pow(10, Number(tx.tokenDecimal));

    tokenVolume += value;

    const c = tx.contractAddress;
    if (!tokenBalances[c]) {
      tokenBalances[c] = { symbol: tx.tokenSymbol, balance: 0 };
    }

    if (tx.to?.toLowerCase() === address.toLowerCase())
      tokenBalances[c].balance += value;

    if (tx.from?.toLowerCase() === address.toLowerCase())
      tokenBalances[c].balance -= value;

    totalContractInteractions++;
    uniqueContracts.add(c);
  }

  const walletAgeDays = Math.floor(
    (Date.now() - earliestTimestamp) / (1000 * 60 * 60 * 24)
  );

  const tokenBalanceList = Object.values(tokenBalances)
    .filter(t => t.balance !== 0)
    .map(t => ({
      symbol: t.symbol,
      balance: Number(t.balance.toFixed(6)),
    }));

  const usdcBalance =
    tokenBalanceList.find(t => t.symbol === "USDC")?.balance || 0;

  return {
    wallet: address,

    balances: {
      native: nativeBalance.toFixed(6),
      usdc: usdcBalance.toFixed(6),
    },

    volume: {
      native: nativeVolume.toFixed(6),
      tokens: tokenVolume.toFixed(6),
      total: (nativeVolume + tokenVolume).toFixed(6),
    },

    walletAgeDays,

    activity: {
      nativeTxs: nativeTxs.length,
      tokenTxs: tokenTxs.length,
      uniqueDays: activeDays.size,
      uniqueWeeks: activeWeeks.size,
      uniqueMonths: activeMonths.size,
    },

    contracts: {
      totalInteractions,
      uniqueInteractions: uniqueContracts.size,
    },

    tokenBalances: tokenBalanceList,
  };
}

// -------------------- Route --------------------
app.get("/wallet/:address", async (req, res) => {
  const address = req.params.address.trim();

  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return res.json({ error: "Invalid wallet address" });
  }

  try {
    const data = await analyzeWallet(address);
    res.json(data);
  } catch (e) {
    res.json({ error: "Unable to fetch data" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ API running on http://localhost:${PORT}`);
});
