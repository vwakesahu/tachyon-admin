import Safe from "@safe-global/protocol-kit";
import SafeApiKit from "@safe-global/api-kit";
import { encodeFunctionData, parseUnits, type Address } from "viem";
import { base } from "viem/chains";
import { horizenMainnet } from "./chains";

const SAFE_TX_SERVICE_URLS: Record<number, string> = {
  [base.id]: "https://safe-transaction-base.safe.global/api",
  [horizenMainnet.id]:
    "https://safe-transaction-horizen.safe.onchainden.com/api",
};

const SAFE_DASHBOARD_URLS: Record<number, string> = {
  [base.id]: "https://app.safe.global",
  [horizenMainnet.id]: "https://safe.horizen.io",
};

const SAFE_CHAIN_PREFIXES: Record<number, string> = {
  [base.id]: "base",
  [horizenMainnet.id]: "hrzn",
};

// Horizen is not in the Safe default deployments, so we provide contract addresses manually.
const HORIZEN_CONTRACT_NETWORKS = {
  [horizenMainnet.id.toString()]: {
    safeSingletonAddress: "0xfb1bffC9d739B8D520DaF37dF666da4C687191EA",
    safeProxyFactoryAddress: "0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67",
    multiSendAddress: "0x998739BFdAAdde7C933B942a68053933098f9EDa",
    multiSendCallOnlyAddress: "0xA1dabEF33b3B82c7814B6D82A79e50F4AC44102B",
    fallbackHandlerAddress: "0x017062a1dE2FE6b99BE3d9d37841FeD19F573804",
    signMessageLibAddress: "0xd53cd0aB83D845Ac265BE939c57F53AD838012c9",
    createCallAddress: "0xB19D6FFc2182150F8Eb585b79D4ABcd7C5640A9d",
  },
};

const erc20TransferAbi = [
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

export function getSafeDashboardUrl(
  chainId: number,
  safeAddress: string
): string {
  const baseUrl = SAFE_DASHBOARD_URLS[chainId];
  const prefix = SAFE_CHAIN_PREFIXES[chainId];
  return `${baseUrl}/transactions/queue?safe=${prefix}:${safeAddress}`;
}

export async function proposeSafeWithdrawal({
  provider,
  safeAddress,
  senderAddress,
  recipientAddress,
  chainId,
  tokenAddress,
  amount,
  decimals,
}: {
  provider: unknown;
  safeAddress: Address;
  senderAddress: Address;
  recipientAddress: Address;
  chainId: number;
  tokenAddress?: Address;
  amount: string;
  decimals: number;
}): Promise<{ safeTxHash: string }> {
  const isHorizen = chainId === horizenMainnet.id;
  const protocolKit = await Safe.init({
    provider: provider as Parameters<typeof Safe.init>[0]["provider"],
    signer: senderAddress,
    safeAddress,
    ...(isHorizen ? { contractNetworks: HORIZEN_CONTRACT_NETWORKS } : {}),
  });

  const apiKit = new SafeApiKit({
    chainId: BigInt(chainId),
    txServiceUrl: SAFE_TX_SERVICE_URLS[chainId],
  });

  const transactions = tokenAddress
    ? [
        {
          to: tokenAddress,
          value: "0",
          data: encodeFunctionData({
            abi: erc20TransferAbi,
            functionName: "transfer",
            args: [recipientAddress, parseUnits(amount, decimals)],
          }),
        },
      ]
    : [
        {
          to: recipientAddress,
          value: parseUnits(amount, decimals).toString(),
          data: "0x",
        },
      ];

  const safeTransaction = await protocolKit.createTransaction({
    transactions,
  });
  const safeTxHash = await protocolKit.getTransactionHash(safeTransaction);
  const signature = await protocolKit.signHash(safeTxHash);

  await apiKit.proposeTransaction({
    safeAddress,
    safeTransactionData: safeTransaction.data,
    safeTxHash,
    senderAddress,
    senderSignature: signature.data,
  });

  return { safeTxHash };
}
