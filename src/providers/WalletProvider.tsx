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
import { createContext, useState, useEffect } from "react";
import { APP_NAME } from "@/lib/constants";

export const WalletReadyContext = createContext(false);

let wagmiConfig: Config | null = null;

function getWagmiConfig(): Config {
  if (!wagmiConfig) {
    wagmiConfig = getDefaultConfig({
      appName: APP_NAME,
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
  if (!mounted || !process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID) {
    return (
      <WalletReadyContext.Provider value={false}>
        {children}
      </WalletReadyContext.Provider>
    );
  }

  const config = getWagmiConfig();

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme({ borderRadius: "none" })}>
          <WalletReadyContext.Provider value={true}>
            {children}
          </WalletReadyContext.Provider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
