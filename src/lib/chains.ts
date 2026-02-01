import { defineChain } from "viem";
import { base } from "viem/chains";

export const horizenMainnet = defineChain({
  id: 26514,
  name: "Horizen",
  nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://horizen.calderachain.xyz/http"] },
  },
  blockExplorers: {
    default: {
      name: "Horizen Explorer",
      url: "https://horizen.calderaexplorer.xyz",
    },
  },
});

export const supportedChains = [base, horizenMainnet] as const;
