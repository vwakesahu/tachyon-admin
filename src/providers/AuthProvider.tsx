"use client";

import { SessionProvider } from "next-auth/react";
import { WalletProvider } from "./WalletProvider";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <WalletProvider>{children}</WalletProvider>
    </SessionProvider>
  );
}
