import "./globals.css";

export const metadata = {
  title: "Arcker Wallet Analytics on ARC",
  description:
    "Analyze ARC Testnet wallets, track activity, and claim ARCKER airdrops.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>{children}</body>
    </html>
  );
}
