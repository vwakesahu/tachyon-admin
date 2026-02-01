"use client";

import "@rainbow-me/rainbowkit/styles.css";
import {
  darkTheme,
  getDefaultConfig,
  RainbowKitProvider,
} from "@rainbow-me/rainbowkit";
import { WagmiProvider, type Config } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { base } from "viem/chains";
import { horizenMainnet } from "@/lib/chains";
import { useState, useEffect } from "react";

let wagmiConfig: Config | null = null;

function getWagmiConfig(): Config {
  if (!wagmiConfig) {
    wagmiConfig = getDefaultConfig({
      appName: "Tachyon Protocol",
      projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID!,
      chains: [base, horizenMainnet],
      ssr: true,
    });
  }
  return wagmiConfig;
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // During SSR or before mounting, render children without wallet providers
  if (!mounted) {
    return <>{children}</>;
  }

  // Check for project ID only on client
  if (!process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID) {
    return <>{children}</>;
  }

  const config = getWagmiConfig();

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme({ borderRadius: "none" })}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
