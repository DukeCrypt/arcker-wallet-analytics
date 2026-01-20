import "./globals.css";
import { Analytics } from "@vercel/analytics/react";

export const metadata = {
  title: "Arcker Wallet Analytics on ARC",
  description:
    "Analyze ARC Testnet wallets, track activity, and check ARCKER airdrop eligibility.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
