"use client";

import { signOut } from "next-auth/react";
import { WalletGuard } from "./WalletGuard";

interface HomeContentProps {
  email: string;
  walletAddress: string;
}

export function HomeContent({ email, walletAddress }: HomeContentProps) {
  return (
    <WalletGuard>
      <div className="min-h-screen flex flex-col items-center justify-center bg-black gap-8">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-heading font-bold text-white">
            Welcome to Tachyon Protocol
          </h1>
          <p className="text-zinc-400">Email: {email}</p>
          <p className="text-zinc-400 font-mono text-sm">
            Wallet: {walletAddress}
          </p>
        </div>
        <button
          onClick={() => signOut({ redirectTo: "/login" })}
          className="px-6 py-3 border border-zinc-700 text-white font-medium rounded-none hover:bg-zinc-900 transition-colors"
        >
          Sign Out
        </button>
      </div>
    </WalletGuard>
  );
}
