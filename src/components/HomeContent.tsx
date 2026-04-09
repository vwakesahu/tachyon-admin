"use client";

import { signOut } from "next-auth/react";
import { WalletGuard } from "./WalletGuard";
import {
  useAccount,
  useBalance,
  useSendTransaction,
  useWriteContract,
  useSwitchChain,
} from "wagmi";
import { useContext, useState } from "react";
import { base } from "viem/chains";
import { horizenMainnet } from "@/lib/chains";
import { parseUnits, type Address } from "viem";
import { WalletReadyContext } from "@/providers/WalletProvider";
import {
  proposeSafeWithdrawal,
  getSafeDashboardUrl,
} from "@/lib/safe";
/* eslint-disable @next/next/no-img-element */

const CHAINS = [
  { id: base.id, name: "Base", icon: "/chains/base.jpeg" },
  { id: horizenMainnet.id, name: "Horizen", icon: "/chains/horizon.svg" },
] as const;

const BLOCK_EXPLORERS: Record<number, string> = {
  [base.id]: "https://basescan.org",
  [horizenMainnet.id]: "https://horizen.calderaexplorer.xyz",
};

function getExplorerTxUrl(chainId: number, txHash: string): string {
  return `${BLOCK_EXPLORERS[chainId]}/tx/${txHash}`;
}

interface TokenConfig {
  symbol: string;
  name: string;
  icon: string;
  decimals: number;
  address?: Address;
  withdrawLimit: number;
  disabled?: boolean;
}

const TOKENS: Record<number, TokenConfig[]> = {
  [base.id]: [
    {
      symbol: "USDC",
      name: "USD Coin",
      icon: "/tokens/usdc.png",
      decimals: 6,
      address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      withdrawLimit: 5000,
    },
    { symbol: "ETH", name: "Ethereum", icon: "/tokens/eth.svg", decimals: 18, withdrawLimit: 1, disabled: true },
    {
      symbol: "ZEN",
      name: "Horizen",
      icon: "/tokens/zen.svg",
      decimals: 18,
      address: "0x0000000000000000000000000000000000000000",
      withdrawLimit: 10000,
      disabled: true,
    },
  ],
  [horizenMainnet.id]: [
    {
      symbol: "USDC",
      name: "USD Coin",
      icon: "/tokens/usdc.png",
      decimals: 6,
      address: "0xDF7108f8B10F9b9eC1aba01CCa057268cbf86B6c",
      withdrawLimit: 5000,
    },
    { symbol: "ETH", name: "Ethereum", icon: "/tokens/eth.svg", decimals: 18, withdrawLimit: 1, disabled: true },
    {
      symbol: "ZEN",
      name: "Horizen",
      icon: "/tokens/zen.svg",
      decimals: 18,
      address: "0x0000000000000000000000000000000000000000",
      withdrawLimit: 10000,
      disabled: true,
    },
  ],
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

// --- Sub-components ---

function TokenRow({
  token,
  chainId,
  treasuryAddress,
  disabled,
}: {
  token: TokenConfig;
  chainId: number;
  treasuryAddress?: Address;
  disabled?: boolean;
}) {
  const { data: balance, isLoading } = useBalance({
    address: treasuryAddress || undefined,
    chainId,
    token: token.address,
    query: { enabled: !disabled && !!treasuryAddress },
  });

  const formatted = balance
    ? parseFloat(balance.formatted).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: token.symbol === "USDC" ? 2 : 6,
      })
    : "0.00";

  return (
    <div className={`group flex items-center justify-between py-5 border-b border-border/40 last:border-b-0 -mx-4 px-4 transition-colors ${disabled ? "opacity-40" : "hover:bg-secondary/30"}`}>
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 overflow-hidden bg-secondary shrink-0">
          <img
            src={token.icon}
            alt={token.symbol}
            width={40}
            height={40}
            className={`w-full h-full object-cover ${disabled ? "grayscale" : ""}`}
          />
        </div>
        <div>
          <span className={`block text-sm font-medium ${disabled ? "text-muted-foreground" : "text-foreground"}`}>
            {token.name}
          </span>
          <span className="block text-[11px] text-muted-foreground uppercase tracking-wider">
            {token.symbol}
          </span>
        </div>
      </div>
      <div className="text-right">
        {disabled ? (
          <span className="text-xs font-mono text-muted-foreground/60">Coming soon</span>
        ) : isLoading ? (
          <div className="w-24 h-6 bg-secondary animate-pulse" />
        ) : (
          <span className="text-base font-mono font-medium text-foreground tabular-nums">
            {formatted}
          </span>
        )}
      </div>
    </div>
  );
}

const TREASURY_ADDRESSES: Record<number, Address> = {
  [base.id]: "0xBa09cE9986f3BE2E553f155F02987122C84Fae63",
  [horizenMainnet.id]: "0x5f38111Aa32a66F78ce447c6824D9976b8F4e654",
};

function DepositDialog({
  walletAddress,
  chainId,
  tokens,
  treasuryAddress,
  onClose,
}: {
  walletAddress: Address;
  chainId: number;
  tokens: TokenConfig[];
  treasuryAddress: Address;
  onClose: () => void;
}) {
  const [selectedToken, setSelectedToken] = useState<TokenConfig>(tokens[0]);
  const [amount, setAmount] = useState("");
  const [txHash, setTxHash] = useState<string | null>(null);

  const { data: balance } = useBalance({
    address: walletAddress,
    chainId,
    token: selectedToken.address,
  });

  const {
    sendTransaction,
    isPending: isSendingNative,
    error: nativeError,
  } = useSendTransaction();

  const {
    writeContract,
    isPending: isSendingErc20,
    error: erc20Error,
  } = useWriteContract();

  const isPending = isSendingNative || isSendingErc20;
  const error = nativeError || erc20Error;

  const handleTokenChange = (token: TokenConfig) => {
    setSelectedToken(token);
    setTxHash(null);
    setAmount("");
  };

  const handleMax = () => {
    if (balance) setAmount(balance.formatted);
  };

  const handleDeposit = () => {
    if (!amount || isPending || !treasuryAddress) return;

    if (selectedToken.address) {
      writeContract(
        {
          address: selectedToken.address,
          abi: erc20TransferAbi,
          functionName: "transfer",
          args: [
            treasuryAddress,
            parseUnits(amount, selectedToken.decimals),
          ],
          chainId,
        },
        { onSuccess: (hash) => setTxHash(hash) }
      );
    } else {
      sendTransaction(
        {
          to: treasuryAddress,
          value: parseUnits(amount, 18),
          chainId,
        },
        { onSuccess: (hash) => setTxHash(hash) }
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-card border border-border w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <h2 className="text-lg font-heading font-semibold text-foreground">
            Deposit to Solver
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {!treasuryAddress ? (
            <p className="text-sm text-destructive">
              Solver address not configured for this chain.
            </p>
          ) : txHash ? (
            <div className="space-y-4 py-4">
              <div className="flex justify-center">
                <div className="w-12 h-12 bg-chart-2/10 flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-chart-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              </div>
              <div className="text-center space-y-2">
                <p className="text-foreground font-medium">
                  Deposit Submitted
                </p>
                <a
                  href={getExplorerTxUrl(chainId, txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-secondary p-3 border border-border hover:border-foreground/30 transition-colors group"
                >
                  <p className="font-mono text-xs text-muted-foreground break-all group-hover:text-foreground transition-colors">
                    {txHash}
                  </p>
                  <p className="text-[11px] text-muted-foreground/60 mt-1.5 group-hover:text-muted-foreground transition-colors">
                    View on explorer &rarr;
                  </p>
                </a>
              </div>
              <button
                onClick={onClose}
                className="w-full px-6 py-3.5 bg-foreground text-background font-medium text-sm hover:opacity-90 transition-opacity cursor-pointer"
              >
                Done
              </button>
            </div>
          ) : (
            <>
              {/* Solver address */}
              <div className="bg-secondary p-3 border border-border">
                <p className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider mb-1">
                  Solver
                </p>
                <p className="font-mono text-xs text-foreground break-all">
                  {treasuryAddress}
                </p>
              </div>

              {/* Token selector */}
              <div>
                <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">
                  Token
                </label>
                <div className="flex gap-2">
                  {tokens.map((token) => (
                    <button
                      key={token.symbol}
                      onClick={() => handleTokenChange(token)}
                      className={`flex items-center gap-2 px-3 py-2 text-sm font-medium transition-all cursor-pointer border ${
                        selectedToken.symbol === token.symbol
                          ? "bg-foreground text-background border-foreground"
                          : "bg-secondary text-muted-foreground border-border hover:text-foreground"
                      }`}
                    >
                      <img
                        src={token.icon}
                        alt={token.symbol}
                        width={16}
                        height={16}
                        className={`w-4 h-4 object-cover ${token.symbol === "ZEN" ? "bg-secondary" : ""}`}
                      />
                      {token.symbol}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                    Amount
                  </label>
                  <span className="text-xs text-muted-foreground font-mono">
                    Balance:{" "}
                    {balance
                      ? parseFloat(balance.formatted).toLocaleString(
                          undefined,
                          {
                            maximumFractionDigits:
                              selectedToken.symbol === "USDC" ? 2 : 6,
                          }
                        )
                      : "0.00"}
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={amount}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (/^\d*\.?\d*$/.test(v)) setAmount(v);
                    }}
                    placeholder="0.00"
                    className="w-full bg-secondary border border-border px-4 py-3 text-foreground font-mono text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-foreground/30 transition-colors"
                  />
                  <button
                    onClick={handleMax}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-mono text-muted-foreground hover:text-foreground uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Max
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <p className="text-sm text-destructive">
                  {error.message?.includes("User rejected") ? "Transaction rejected by user" : error.message?.split("\n")[0] || "Transaction failed"}
                </p>
              )}

              {/* Submit */}
              <button
                onClick={handleDeposit}
                disabled={!amount || isPending}
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-foreground text-background font-medium text-sm hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-background/40 border-t-background animate-spin" />
                    Confirming...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 14l-7 7m0 0l-7-7m7 7V3"
                      />
                    </svg>
                    Deposit {selectedToken.symbol}
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function WithdrawDialog({
  chainId,
  tokens,
  treasuryAddress,
  onClose,
}: {
  chainId: number;
  tokens: TokenConfig[];
  treasuryAddress: Address;
  onClose: () => void;
}) {
  const { address: connectedAddress, connector } = useAccount();
  const [selectedToken, setSelectedToken] = useState<TokenConfig>(tokens[0]);
  const [amount, setAmount] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [safeTxHash, setSafeTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: balance } = useBalance({
    address: treasuryAddress || undefined,
    chainId,
    token: selectedToken.address,
  });

  const handleTokenChange = (token: TokenConfig) => {
    setSelectedToken(token);
    setSafeTxHash(null);
    setError(null);
    setAmount("");
  };

  const handleMax = () => {
    if (balance) {
      setAmount(balance.formatted);
    }
  };

  const exceedsLimit =
    !!amount && parseFloat(amount) > selectedToken.withdrawLimit;

  const handleWithdraw = async () => {
    if (!connectedAddress || !amount || isPending || exceedsLimit || !connector)
      return;

    setIsPending(true);
    setError(null);

    try {
      const provider = await connector.getProvider();

      const result = await proposeSafeWithdrawal({
        provider,
        safeAddress: treasuryAddress,
        senderAddress: connectedAddress,
        recipientAddress: connectedAddress,
        chainId,
        tokenAddress: selectedToken.address,
        amount,
        decimals: selectedToken.decimals,
      });

      setSafeTxHash(result.safeTxHash);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to propose transaction";
      if (msg.includes("User rejected") || msg.includes("user rejected")) {
        setError("Signature rejected by user");
      } else if (msg.includes("is not an owner")) {
        setError("Your wallet is not an owner of this Safe");
      } else {
        setError(msg.split("\n")[0]);
      }
    } finally {
      setIsPending(false);
    }
  };

  const safeDashboardUrl = getSafeDashboardUrl(chainId, treasuryAddress);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-card border border-border w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <h2 className="text-lg font-heading font-semibold text-foreground">
            Withdraw
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {safeTxHash ? (
            <div className="space-y-4 py-4">
              <div className="flex justify-center">
                <div className="w-12 h-12 bg-chart-2/10 flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-chart-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              </div>
              <div className="text-center space-y-2">
                <p className="text-foreground font-medium">
                  Withdrawal Proposed
                </p>
                <p className="text-sm text-muted-foreground">
                  Transaction has been proposed to the Safe. Other signers can now approve it.
                </p>
                <div className="bg-secondary p-3 border border-border">
                  <p className="text-[11px] font-mono text-muted-foreground/60 uppercase tracking-wider mb-1">
                    Safe Tx Hash
                  </p>
                  <p className="font-mono text-xs text-muted-foreground break-all">
                    {safeTxHash}
                  </p>
                </div>
              </div>
              <a
                href={safeDashboardUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full px-6 py-3.5 bg-foreground text-background font-medium text-sm text-center hover:opacity-90 transition-opacity cursor-pointer"
              >
                Open Safe Dashboard &rarr;
              </a>
              <button
                onClick={onClose}
                className="w-full px-6 py-3.5 border border-border text-foreground font-medium text-sm hover:bg-secondary transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          ) : (
            <>
              {/* Token selector */}
              <div>
                <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">
                  Token
                </label>
                <div className="flex gap-2">
                  {tokens.map((token) => (
                    <button
                      key={token.symbol}
                      onClick={() => handleTokenChange(token)}
                      className={`flex items-center gap-2 px-3 py-2 text-sm font-medium transition-all cursor-pointer border ${
                        selectedToken.symbol === token.symbol
                          ? "bg-foreground text-background border-foreground"
                          : "bg-secondary text-muted-foreground border-border hover:text-foreground"
                      }`}
                    >
                      <img
                        src={token.icon}
                        alt={token.symbol}
                        width={16}
                        height={16}
                        className={`w-4 h-4 object-cover ${token.symbol === "ZEN" ? "bg-secondary" : ""}`}
                      />
                      {token.symbol}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                    Amount
                  </label>
                  <span className="text-xs text-muted-foreground font-mono">
                    Safe Balance:{" "}
                    {balance
                      ? parseFloat(balance.formatted).toLocaleString(
                          undefined,
                          {
                            maximumFractionDigits:
                              selectedToken.symbol === "USDC" ? 2 : 6,
                          }
                        )
                      : "0.00"}
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={amount}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (/^\d*\.?\d*$/.test(v)) setAmount(v);
                    }}
                    placeholder="0.00"
                    className="w-full bg-secondary border border-border px-4 py-3 text-foreground font-mono text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-foreground/30 transition-colors"
                  />
                  <button
                    onClick={handleMax}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-mono text-muted-foreground hover:text-foreground uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Max
                  </button>
                </div>
              </div>

              {/* Limit note */}
              <p className="text-xs text-muted-foreground">
                Max withdrawal: {selectedToken.withdrawLimit.toLocaleString()}{" "}
                {selectedToken.symbol}
              </p>

              {/* Info */}
              <div className="flex items-start gap-2 bg-secondary/50 p-3 border border-border">
                <svg
                  className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                  />
                </svg>
                <p className="text-xs text-muted-foreground">
                  This will propose a transaction to the Safe multisig. Other
                  signers must approve before execution.
                </p>
              </div>

              {/* Error */}
              {exceedsLimit && (
                <p className="text-sm text-destructive">
                  Amount exceeds the{" "}
                  {selectedToken.withdrawLimit.toLocaleString()}{" "}
                  {selectedToken.symbol} limit.
                </p>
              )}
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              {/* Submit */}
              <button
                onClick={handleWithdraw}
                disabled={
                  !amount || !connectedAddress || isPending || exceedsLimit
                }
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-foreground text-background font-medium text-sm hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-background/40 border-t-background animate-spin" />
                    Proposing to Safe...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 10l7-7m0 0l7 7m-7-7v18"
                      />
                    </svg>
                    Propose Withdrawal
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Main ---

function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

interface HomeContentProps {
  email: string;
  walletAddress: string;
}

export function HomeContent({ email, walletAddress }: HomeContentProps) {
  const walletReady = useContext(WalletReadyContext);

  if (!walletReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse">
          <img src="/logo.svg" alt="Tachyon" width={48} height={48} />
        </div>
      </div>
    );
  }

  return (
    <HomeContentInner email={email} walletAddress={walletAddress} />
  );
}

const SUPPORTED_CHAIN_IDS = CHAINS.map((c) => c.id) as readonly number[];

function UnsupportedChainBanner() {
  const { switchChain } = useSwitchChain();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/90 backdrop-blur-sm" />
      <div className="relative bg-card border border-border w-full max-w-md p-8 text-center space-y-6">
        <div className="w-14 h-14 mx-auto bg-destructive/10 flex items-center justify-center">
          <svg className="w-7 h-7 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-heading font-semibold text-foreground">Unsupported Network</h2>
          <p className="text-sm text-muted-foreground">
            Please switch to a supported chain to continue.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          {CHAINS.map((chain) => (
            <button
              key={chain.id}
              onClick={() => switchChain({ chainId: chain.id })}
              className="flex items-center justify-center gap-3 w-full px-5 py-3.5 bg-foreground text-background font-medium text-sm hover:opacity-90 transition-opacity cursor-pointer"
            >
              <img src={chain.icon} alt={chain.name} width={20} height={20} className="w-5 h-5 object-cover bg-secondary" />
              Switch to {chain.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function HomeContentInner({ email, walletAddress }: HomeContentProps) {
  const { chainId: walletChainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);

  const selectedChain = (walletChainId && SUPPORTED_CHAIN_IDS.includes(walletChainId))
    ? walletChainId
    : CHAINS[0].id;
  const isUnsupportedChain = walletChainId != null && !SUPPORTED_CHAIN_IDS.includes(walletChainId);

  const treasuryAddress = TREASURY_ADDRESSES[selectedChain];
  const allTokens = TOKENS[selectedChain] || [];
  const tokens = allTokens.filter((t) => !t.disabled);
  const disabledTokens = allTokens.filter((t) => t.disabled);

  const handleChainSelect = (chainId: number) => {
    switchChain({ chainId });
  };

  return (
    <WalletGuard sessionWallet={walletAddress}>
      <div className="min-h-screen flex flex-col bg-background text-foreground relative">
        {/* Grid decoration */}
        <div
          className="absolute inset-0 overflow-hidden pointer-events-none"
          aria-hidden
        >
          <div className="absolute top-1/3 left-0 right-0 h-px bg-border/20" />
          <div className="absolute top-2/3 left-0 right-0 h-px bg-border/15" />
          <div className="absolute top-0 bottom-0 left-1/4 w-px bg-border/10" />
          <div className="absolute top-0 bottom-0 left-3/4 w-px bg-border/10" />
          <div className="absolute top-1/3 left-3/4 w-1.5 h-1.5 -translate-x-1/2 -translate-y-1/2 bg-primary/20 animate-pulse" />
        </div>

        {/* Header */}
        <header className="relative z-10 flex items-center justify-between p-6 sm:px-8 sm:py-6 border-b border-border/30">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="Tachyon" width={28} height={28} />
            <span className="font-heading font-semibold text-lg text-foreground">
              tachyon
            </span>
            <span className="text-muted-foreground font-mono text-[11px] tracking-wider uppercase">
              admin
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-secondary">
              <span className="text-xs font-mono text-secondary-foreground">
                {formatAddress(walletAddress)}
              </span>
            </div>
            <button
              onClick={() => signOut({ redirectTo: "/login" })}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              Sign out
            </button>
          </div>
        </header>

        {/* Main */}
        <main className="relative z-10 flex-1 flex justify-center px-6 sm:px-8 py-12 sm:py-16">
          <div className="w-full max-w-xl">
            {/* Title */}
            <div className="mb-12">
              <span className="text-xs font-mono tracking-[0.2em] uppercase text-muted-foreground">
                Solver
              </span>
              <h1 className="text-4xl sm:text-5xl font-heading font-bold text-foreground leading-none tracking-tight mt-3">
                Assets
              </h1>
            </div>

            {/* Chain selector */}
            <div className="flex items-center gap-2 mb-8">
              {CHAINS.map((chain) => (
                <button
                  key={chain.id}
                  onClick={() => handleChainSelect(chain.id)}
                  className={`flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium transition-all cursor-pointer ${
                    selectedChain === chain.id
                      ? "bg-foreground text-background"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <img
                    src={chain.icon}
                    alt={chain.name}
                    width={20}
                    height={20}
                    className="w-5 h-5 object-cover bg-secondary"
                  />
                  {chain.name}
                </button>
              ))}
            </div>

            {/* Divider */}
            <div className="h-px bg-border mb-1" />

            {/* Active tokens */}
            <div className="mb-2">
              {tokens.map((token) => (
                <TokenRow
                  key={`${selectedChain}-${token.symbol}`}
                  token={token}
                  chainId={selectedChain}
                  treasuryAddress={treasuryAddress}
                />
              ))}
            </div>

            {/* Disabled tokens */}
            {disabledTokens.length > 0 && (
              <div className="mb-10">
                <div className="flex items-center gap-3 mt-6 mb-1">
                  <span className="text-[11px] font-mono text-muted-foreground/50 uppercase tracking-wider">
                    Coming Soon
                  </span>
                  <div className="flex-1 h-px bg-border/30" />
                </div>
                {disabledTokens.map((token) => (
                  <TokenRow
                    key={`${selectedChain}-${token.symbol}`}
                    token={token}
                    chainId={selectedChain}
                    treasuryAddress={treasuryAddress}
                    disabled
                  />
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeposit(true)}
                className="flex-1 group flex items-center justify-center gap-2 px-6 py-3.5 bg-foreground text-background font-medium text-sm hover:opacity-90 transition-opacity cursor-pointer"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 14l-7 7m0 0l-7-7m7 7V3"
                  />
                </svg>
                Deposit
              </button>
              <button
                onClick={() => setShowWithdraw(true)}
                className="flex-1 group flex items-center justify-center gap-2 px-6 py-3.5 border border-border text-foreground font-medium text-sm hover:bg-secondary transition-colors cursor-pointer"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 10l7-7m0 0l7 7m-7-7v18"
                  />
                </svg>
                Withdraw
              </button>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="relative z-10 flex items-center justify-between p-6 sm:px-8 sm:py-6">
          <span className="text-[11px] font-mono text-muted-foreground/40 tracking-wide">
            {email}
          </span>
          <span className="text-[11px] font-mono text-muted-foreground/40 tracking-wide">
            3-factor secured
          </span>
        </footer>

        {/* Unsupported chain overlay */}
        {isUnsupportedChain && <UnsupportedChainBanner />}

        {/* Dialogs */}
        {showDeposit && (
          <DepositDialog
            walletAddress={walletAddress as Address}
            chainId={selectedChain}
            tokens={tokens}
            treasuryAddress={treasuryAddress}
            onClose={() => setShowDeposit(false)}
          />
        )}
        {showWithdraw && (
          <WithdrawDialog
            chainId={selectedChain}
            tokens={tokens}
            treasuryAddress={treasuryAddress}
            onClose={() => setShowWithdraw(false)}
          />
        )}
      </div>
    </WalletGuard>
  );
}
