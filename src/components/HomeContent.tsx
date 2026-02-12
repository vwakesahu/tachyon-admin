"use client";

import { signOut } from "next-auth/react";
import { WalletGuard } from "./WalletGuard";
import {
  useAccount,
  useBalance,
  useSendTransaction,
  useWriteContract,
} from "wagmi";
import { useContext, useState } from "react";
import { base } from "viem/chains";
import { horizenMainnet } from "@/lib/chains";
import { parseUnits, type Address } from "viem";
import { WalletReadyContext } from "@/providers/WalletProvider";
/* eslint-disable @next/next/no-img-element */

const CHAINS = [
  { id: base.id, name: "Base", icon: "/chains/base.jpeg" },
  { id: horizenMainnet.id, name: "Horizen", icon: "/chains/horizon.svg" },
] as const;

interface TokenConfig {
  symbol: string;
  name: string;
  icon: string;
  decimals: number;
  address?: Address;
  withdrawLimit: number;
}

const TOKENS: Record<number, TokenConfig[]> = {
  [base.id]: [
    { symbol: "ETH", name: "Ethereum", icon: "/tokens/eth.svg", decimals: 18, withdrawLimit: 1 },
    {
      symbol: "USDC",
      name: "USD Coin",
      icon: "/tokens/usdc.png",
      decimals: 6,
      address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      withdrawLimit: 5000,
    },
    {
      symbol: "ZEN",
      name: "Horizen",
      icon: "/tokens/zen.svg",
      decimals: 18,
      // TODO: Set ZEN token address on Base
      address: "0x0000000000000000000000000000000000000000",
      withdrawLimit: 10000,
    },
  ],
  [horizenMainnet.id]: [
    { symbol: "ETH", name: "Ethereum", icon: "/tokens/eth.svg", decimals: 18, withdrawLimit: 1 },
    {
      symbol: "USDC",
      name: "USD Coin",
      icon: "/tokens/usdc.png",
      decimals: 6,
      // TODO: Set USDC token address on Horizen
      address: "0x0000000000000000000000000000000000000000",
      withdrawLimit: 5000,
    },
    {
      symbol: "ZEN",
      name: "Horizen",
      icon: "/tokens/zen.svg",
      decimals: 18,
      // TODO: Set ZEN token address on Horizen
      address: "0x0000000000000000000000000000000000000000",
      withdrawLimit: 10000,
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
}: {
  token: TokenConfig;
  chainId: number;
}) {
  const { data: balance, isLoading } = useBalance({
    address: TREASURY_ADDRESS || undefined,
    chainId,
    token: token.address,
  });

  const formatted = balance
    ? parseFloat(balance.formatted).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: token.symbol === "USDC" ? 2 : 6,
      })
    : "0.00";

  return (
    <div className="group flex items-center justify-between py-5 border-b border-border/40 last:border-b-0 hover:bg-secondary/30 -mx-4 px-4 transition-colors">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 overflow-hidden bg-secondary shrink-0">
          <img
            src={token.icon}
            alt={token.symbol}
            width={40}
            height={40}
            className="w-full h-full object-cover"
          />
        </div>
        <div>
          <span className="block text-sm font-medium text-foreground">
            {token.name}
          </span>
          <span className="block text-[11px] text-muted-foreground uppercase tracking-wider">
            {token.symbol}
          </span>
        </div>
      </div>
      <div className="text-right">
        {isLoading ? (
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

const TREASURY_ADDRESS = (process.env.NEXT_PUBLIC_TREASURY_ADDRESS ??
  "") as Address;

function DepositDialog({
  walletAddress,
  chainId,
  tokens,
  onClose,
}: {
  walletAddress: Address;
  chainId: number;
  tokens: TokenConfig[];
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
    if (!amount || isPending || !TREASURY_ADDRESS) return;

    if (selectedToken.address) {
      writeContract(
        {
          address: selectedToken.address,
          abi: erc20TransferAbi,
          functionName: "transfer",
          args: [
            TREASURY_ADDRESS,
            parseUnits(amount, selectedToken.decimals),
          ],
          chainId,
        },
        { onSuccess: (hash) => setTxHash(hash) }
      );
    } else {
      sendTransaction(
        {
          to: TREASURY_ADDRESS,
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
          {!TREASURY_ADDRESS ? (
            <p className="text-sm text-destructive">
              Solver address not configured. Set NEXT_PUBLIC_TREASURY_ADDRESS
              in your environment.
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
                <div className="bg-secondary p-3 border border-border">
                  <p className="font-mono text-xs text-muted-foreground break-all">
                    {txHash}
                  </p>
                </div>
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
                  {TREASURY_ADDRESS}
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
                  {error.message?.split("\n")[0] || "Transaction failed"}
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
  onClose,
}: {
  chainId: number;
  tokens: TokenConfig[];
  onClose: () => void;
}) {
  const { address: connectedAddress } = useAccount();
  const [selectedToken, setSelectedToken] = useState<TokenConfig>(tokens[0]);
  const [amount, setAmount] = useState("");
  const [txHash, setTxHash] = useState<string | null>(null);

  const { data: balance } = useBalance({
    address: TREASURY_ADDRESS || undefined,
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
    if (balance) {
      setAmount(balance.formatted);
    }
  };

  const exceedsLimit =
    !!amount && parseFloat(amount) > selectedToken.withdrawLimit;

  const handleWithdraw = () => {
    if (!connectedAddress || !amount || isPending || exceedsLimit) return;

    if (selectedToken.address) {
      writeContract(
        {
          address: selectedToken.address,
          abi: erc20TransferAbi,
          functionName: "transfer",
          args: [
            connectedAddress,
            parseUnits(amount, selectedToken.decimals),
          ],
          chainId,
        },
        {
          onSuccess: (hash) => setTxHash(hash),
        }
      );
    } else {
      sendTransaction(
        {
          to: connectedAddress,
          value: parseUnits(amount, 18),
          chainId,
        },
        {
          onSuccess: (hash) => setTxHash(hash),
        }
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
          {txHash ? (
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
                  Transaction Submitted
                </p>
                <div className="bg-secondary p-3 border border-border">
                  <p className="font-mono text-xs text-muted-foreground break-all">
                    {txHash}
                  </p>
                </div>
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
                        className={`w-4 h-4 object-cover  ${token.symbol === 'ZEN' ? "bg-secondary" : ""}`}
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

              {/* Limit note */}
              <p className="text-xs text-muted-foreground">
                Max withdrawal: {selectedToken.withdrawLimit.toLocaleString()} {selectedToken.symbol}
              </p>

              {/* Error */}
              {exceedsLimit && (
                <p className="text-sm text-destructive">
                  Amount exceeds the {selectedToken.withdrawLimit.toLocaleString()} {selectedToken.symbol} limit.
                </p>
              )}
              {error && (
                <p className="text-sm text-destructive">
                  {error.message?.split("\n")[0] || "Transaction failed"}
                </p>
              )}

              {/* Submit */}
              <button
                onClick={handleWithdraw}
                disabled={!amount || !connectedAddress || isPending || exceedsLimit}
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-foreground text-background font-medium text-sm hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-background/40 border-t-background animate-spin" />
                    Confirming...
                  </>
                ) : (
                  <>
                    Withdraw {selectedToken.symbol}
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

function HomeContentInner({ email, walletAddress }: HomeContentProps) {
  const [selectedChain, setSelectedChain] = useState<number>(CHAINS[0].id);
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const tokens = TOKENS[selectedChain] || [];

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
                  onClick={() => setSelectedChain(chain.id)}
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

            {/* Token list */}
            <div className="mb-10">
              {tokens.map((token) => (
                <TokenRow
                  key={`${selectedChain}-${token.symbol}`}
                  token={token}
                  chainId={selectedChain}
                />
              ))}
            </div>

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

        {/* Dialogs */}
        {showDeposit && (
          <DepositDialog
            walletAddress={walletAddress as Address}
            chainId={selectedChain}
            tokens={tokens}
            onClose={() => setShowDeposit(false)}
          />
        )}
        {showWithdraw && (
          <WithdrawDialog
            chainId={selectedChain}
            tokens={tokens}
            onClose={() => setShowWithdraw(false)}
          />
        )}
      </div>
    </WalletGuard>
  );
}
