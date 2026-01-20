"use client";

import { useState, useEffect } from "react";
import { ethers } from "ethers";
import proofs from "../../proofs.json";

const AIRDROP_ADDRESS = "0x54BD13f0B52E748292a9FCF09eba09C7b5a24220";

const AIRDROP_ABI = [
  "function claim(uint256 amount, bytes32[] calldata proof)",
  "function claimed(address) view returns (bool)"
];

export default function ClaimPage() {
  const [inputAddress, setInputAddress] = useState("");
  const [eligible, setEligible] = useState(null);
  const [account, setAccount] = useState(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState(null);

  // Autofill address from analytics page
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const addr = params.get("address");
    if (addr) setInputAddress(addr);
  }, []);

  // ---- CHECK ELIGIBILITY (NO WALLET) ----
  function checkEligibility() {
    const addr = inputAddress.trim().toLowerCase();
    setTxHash(null);

    if (!addr || !addr.startsWith("0x")) {
      setStatus("Enter a valid wallet address");
      setEligible(null);
      return;
    }

    const entry = proofs[addr];

    if (!entry) {
      setStatus("❌ Address is not eligible");
      setEligible(null);
    } else {
      setStatus("✅ Address is eligible for 10,000 ARCKER");
      setEligible(entry);
    }
  }

  // ---- CONNECT WALLET ----
  async function connectWallet() {
    if (!window.ethereum) {
      setStatus("MetaMask not detected");
      return;
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await provider.send("eth_requestAccounts", []);
    setAccount(accounts[0].toLowerCase());
  }

  // ---- CLAIM ----
  async function claimTokens() {
    if (!eligible) return;

    try {
      setLoading(true);
      setStatus("Claiming…");
      setTxHash(null);

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const contract = new ethers.Contract(
        AIRDROP_ADDRESS,
        AIRDROP_ABI,
        signer
      );

      const alreadyClaimed = await contract.claimed(
        await signer.getAddress()
      );

      if (alreadyClaimed) {
        setStatus("⚠️ Already claimed");
        setLoading(false);
        return;
      }

      const tx = await contract.claim(
        eligible.amount,
        eligible.proof
      );

      setTxHash(tx.hash);
      await tx.wait();

      setStatus("🎉 Claim successful!");
      setEligible(null);
    } catch {
      setStatus("❌ Claim failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-black to-gray-900 text-white p-8">
      <div className="max-w-xl mx-auto">
        {/* HEADER */}
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-extrabold">
            Claim ARCKER
          </h1>
          <p className="text-gray-400 mt-2">
            ARCKER airdrop for ARC Testnet users
          </p>
        </header>

        {/* INPUT */}
        <input
          className="w-full p-4 mb-3 bg-gray-900 border border-gray-700 rounded-lg"
          placeholder="Paste wallet address"
          value={inputAddress}
          onChange={e => setInputAddress(e.target.value)}
        />

        <button
          onClick={checkEligibility}
          className="w-full bg-blue-600 hover:bg-blue-700 px-6 py-4 rounded-lg font-semibold mb-4"
        >
          Check Eligibility
        </button>

        {/* STATUS */}
        {status && (
          <p className="text-center mb-4">{status}</p>
        )}

        {/* TX LINK */}
        {txHash && (
          <a
            href={`https://testnet.arcscan.app/tx/${txHash}`}
            target="_blank"
            rel="noreferrer"
            className="block text-center text-blue-400 underline mb-4"
          >
            View transaction on ArcScan
          </a>
        )}

        {/* CONNECT / CLAIM */}
        {eligible && (
          <>
            {!account ? (
              <button
                onClick={connectWallet}
                className="w-full bg-purple-600 hover:bg-purple-700 px-6 py-4 rounded-lg font-semibold"
              >
                Connect Wallet to Claim
              </button>
            ) : (
              <button
                onClick={claimTokens}
                disabled={loading}
                className={`w-full px-6 py-4 rounded-lg font-semibold ${
                  loading
                    ? "bg-gray-600"
                    : "bg-green-600 hover:bg-green-700"
                }`}
              >
                {loading ? "Claiming…" : "Claim 10,000 ARCKER"}
              </button>
            )}
          </>
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
            @brodarev
          </a>
        </footer>
      </div>
    </main>
  );
}
