"use client";

import { useState } from "react";

const ARCSCAN_API = "https://testnet.arcscan.app/api";

/**
 * KNOWN ARC TESTNET BRIDGE CONTRACTS
 * (add more as needed)
 */
const BRIDGE_CONTRACTS = [
  "0x0000000000000000000000000000000000000000",
];

export default function Home() {
  const [wallet, setWallet] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 🔢 simple live usage counter (session-based)
  const [walletCount, setWalletCount] = useState(0);

  async function fetchArcScan(params) {
    const res = await fetch(`${ARCSCAN_API}?${params}`);
    const json = await res.json();
    if (json.status !== "1") return [];
    return json.result;
  }

  async function analyze() {
    if (!wallet) return;

    setWalletCount(prev => prev + 1); // 👈 count real usage
    setLoading(true);
    setError("");
    setData(null);

    try {
      const address = wallet.trim().toLowerCase();

      const nativeTxs = await fetchArcScan(
        `module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=asc`
      );

      const tokenTxs = await fetchArcScan(
        `module=account&action=tokentx&address=${address}&startblock=0&endblock=99999999&sort=asc`
      );

      if (!nativeTxs.length && !tokenTxs.length) {
        setError("No activity found for this wallet");
        setLoading(false);
        return;
      }

      // ---------------- ACTIVITY ----------------
      const days = new Set();
      const weeks = new Set();
      const months = new Set();
      let firstTimestamp = Date.now();

      [...nativeTxs, ...tokenTxs].forEach(tx => {
        const ts = Number(tx.timeStamp) * 1000;
        firstTimestamp = Math.min(firstTimestamp, ts);

        const d = new Date(ts);
        days.add(d.toISOString().slice(0, 10));
        weeks.add(`${d.getUTCFullYear()}-W${Math.ceil(d.getUTCDate() / 7)}`);
        months.add(`${d.getUTCFullYear()}-${d.getUTCMonth() + 1}`);
      });

      const walletAgeDays = Math.floor(
        (Date.now() - firstTimestamp) / (1000 * 60 * 60 * 24)
      );

      // ---------------- VOLUME + CONTRACTS ----------------
      let nativeVolume = 0;
      let totalContractInteractions = 0;
      const uniqueContracts = new Set();

      // ---------------- BRIDGE ----------------
      let bridgeDeposited = 0;
      let usedBridge = false;

      nativeTxs.forEach(tx => {
        const value = Number(tx.value) / 1e18;
        nativeVolume += value;

        if (tx.input !== "0x" && tx.to) {
          totalContractInteractions++;
          uniqueContracts.add(tx.to.toLowerCase());
        }

        if (tx.to && BRIDGE_CONTRACTS.includes(tx.to.toLowerCase())) {
          bridgeDeposited += value;
          usedBridge = true;
        }
      });

      // ---------------- TOKEN BALANCES ----------------
      const tokenBalances = {};

      tokenTxs.forEach(tx => {
        const value =
          Number(tx.value) / Math.pow(10, Number(tx.tokenDecimal));
        const c = tx.contractAddress;
        const symbol = tx.tokenSymbol;

        if (!tokenBalances[c]) {
          tokenBalances[c] = { symbol, balance: 0 };
        }

        if (tx.to.toLowerCase() === address) {
          tokenBalances[c].balance += value;
        }

        if (tx.from.toLowerCase() === address) {
          tokenBalances[c].balance -= value;
        }
      });

      const tokenList = Object.values(tokenBalances)
        .filter(t => t.balance !== 0)
        .map(t => ({
          symbol: t.symbol,
          balance: Number(t.balance.toFixed(6)),
        }));

      const usdcBalance =
        tokenList.find(t => t.symbol === "USDC")?.balance || 0;

      setData({
        wallet: address,
        balanceNative:
          nativeTxs.length > 0
            ? Number(nativeTxs[nativeTxs.length - 1].value) / 1e18
            : 0,
        volumeNative: nativeVolume,
        nativeTxs: nativeTxs.length,
        tokenTxs: tokenTxs.length,
        walletAgeDays,
        uniqueDays: days.size,
        uniqueWeeks: weeks.size,
        uniqueMonths: months.size,
        totalContractInteractions,
        uniqueContractInteractions: uniqueContracts.size,
        bridgeDeposited,
        usedBridge,
        usdcBalance,
        tokenBalances: tokenList,
      });
    } catch {
      setError("ArcScan unavailable");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* HEADER */}
        <header className="mb-8">
          <h1 className="text-4xl font-extrabold">
            Arcker Wallet Analytics on ARC
          </h1>
          <p className="text-gray-400 mt-2">
            👥 {walletCount.toLocaleString()} wallets analyzed
          </p>
        </header>

        {/* INPUT */}
        <div className="flex gap-3 mb-6 max-w-3xl">
          <input
            className="flex-1 bg-gray-900 border border-gray-700 p-3 rounded"
            placeholder="Paste wallet address"
            value={wallet}
            onChange={e => setWallet(e.target.value)}
          />
          <button
            onClick={analyze}
            className="bg-blue-600 px-6 rounded font-semibold"
          >
            Analyze
          </button>
        </div>

        {loading && <p>Loading…</p>}
        {error && <p className="text-red-500">{error}</p>}

        {data && (
          <div className="grid grid-cols-2 gap-4">
            <Stat label="Wallet Age (days)" value={data.walletAgeDays} />
            <Stat label="Native Balance" value={data.balanceNative} />
            <Stat label="Native Volume" value={data.volumeNative} />
            <Stat label="USDC Balance" value={data.usdcBalance} />
            <Stat label="Native TXs" value={data.nativeTxs} />
            <Stat label="Token TXs" value={data.tokenTxs} />
            <Stat label="Unique Days" value={data.uniqueDays} />
            <Stat label="Unique Weeks" value={data.uniqueWeeks} />
            <Stat label="Unique Months" value={data.uniqueMonths} />
            <Stat
              label="Total Contract Interactions"
              value={data.totalContractInteractions}
            />
            <Stat
              label="Unique Contract Interactions"
              value={data.uniqueContractInteractions}
            />
            <Stat
              label="Bridge Deposited (native)"
              value={data.bridgeDeposited}
            />
            <Stat
              label="Native Bridge Used"
              value={data.usedBridge ? "YES" : "NO"}
            />
          </div>
        )}

        {/* FOOTER */}
        <footer className="mt-16 text-center text-gray-500 text-sm">
          Built by{" "}
          <a
            href="https://x.com/BrodaRev"
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-gray-300"
          >
            @BrodaRev
          </a>
        </footer>
      </div>
    </main>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-gray-900 border border-gray-800 p-4 rounded">
      <p className="text-gray-400 text-sm">{label}</p>
      <p className="text-lg font-bold">
        {typeof value === "number"
          ? value.toLocaleString(undefined, {
              maximumFractionDigits: 6,
            })
          : value}
      </p>
    </div>
  );
}
