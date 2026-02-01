"use client";

import { useAccount, useSignMessage, useDisconnect } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback, useRef } from "react";
import { SiweMessage } from "siwe";
import { useRouter } from "next/navigation";

interface WalletLinkInfo {
  hasLinkedWallet: boolean;
  linkedWallet: string | null;
}

interface WalletMismatchError {
  linkedWallet: string;
  connectedWallet: string;
}

export function WalletAuth() {
  const { address, isConnected, chain } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { disconnect } = useDisconnect();
  const { update } = useSession();
  const router = useRouter();

  const [isVerifying, setIsVerifying] = useState(false);
  const [isCheckingLink, setIsCheckingLink] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [walletMismatch, setWalletMismatch] = useState<WalletMismatchError | null>(null);
  const [linkInfo, setLinkInfo] = useState<WalletLinkInfo | null>(null);
  const hasAttemptedVerification = useRef(false);

  // Check if user has a linked wallet on mount
  useEffect(() => {
    checkWalletLink();
  }, []);

  async function checkWalletLink() {
    try {
      const res = await fetch("/api/wallet/link");
      if (res.ok) {
        const data = await res.json();
        setLinkInfo(data);
      }
    } catch {
      // Ignore errors, will try to link on verification
    } finally {
      setIsCheckingLink(false);
    }
  }

  const handleSiweVerification = useCallback(async () => {
    if (!address || !chain) return;

    setIsVerifying(true);
    setError(null);
    setWalletMismatch(null);

    try {
      // 1. Get nonce from server
      const nonceRes = await fetch("/api/siwe/nonce");
      const { nonce } = await nonceRes.json();

      // 2. Create SIWE message
      const message = new SiweMessage({
        domain: window.location.host,
        address,
        statement: "Sign in to Tachyon Protocol",
        uri: window.location.origin,
        version: "1",
        chainId: chain.id,
        nonce,
      });

      // 3. Sign message
      const signature = await signMessageAsync({
        message: message.prepareMessage(),
      });

      // 4. Verify on server
      const verifyRes = await fetch("/api/siwe/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, signature }),
      });

      const verifyData = await verifyRes.json();

      if (!verifyRes.ok) {
        // Handle wallet mismatch specifically
        if (verifyRes.status === 403 && verifyData.linkedWallet) {
          setWalletMismatch({
            linkedWallet: verifyData.linkedWallet,
            connectedWallet: verifyData.connectedWallet,
          });
          disconnect();
          hasAttemptedVerification.current = false;
          return;
        }
        throw new Error(verifyData.error || "Verification failed");
      }

      // 5. Update NextAuth session with wallet address
      await update({ walletAddress: address });

      // 6. Redirect to app
      router.push("/");
      router.refresh();
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Verification failed";
      console.error("SIWE error:", err);
      setError(errorMessage);
      disconnect();
      hasAttemptedVerification.current = false;
    } finally {
      setIsVerifying(false);
    }
  }, [address, chain, signMessageAsync, update, router, disconnect]);

  // Trigger SIWE when wallet connects
  useEffect(() => {
    if (isConnected && address && !isVerifying && !hasAttemptedVerification.current) {
      hasAttemptedVerification.current = true;
      handleSiweVerification();
    }
  }, [isConnected, address, isVerifying, handleSiweVerification]);

  // Reset verification flag when disconnected
  useEffect(() => {
    if (!isConnected) {
      hasAttemptedVerification.current = false;
    }
  }, [isConnected]);

  // Format wallet address for display
  function formatAddress(addr: string): string {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  }

  if (isCheckingLink) {
    return (
      <div className="text-zinc-400">Checking wallet link status...</div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 max-w-md">
      {/* Show linked wallet info if exists */}
      {linkInfo?.hasLinkedWallet && linkInfo.linkedWallet && !walletMismatch && (
        <div className="w-full p-4 bg-zinc-900 border border-zinc-700 text-center">
          <p className="text-sm text-zinc-400 mb-1">Your linked wallet:</p>
          <p className="font-mono text-green-400">
            {formatAddress(linkInfo.linkedWallet)}
          </p>
          <p className="text-xs text-zinc-500 mt-2">
            Please connect this wallet to continue
          </p>
        </div>
      )}

      {/* Show first-time user message */}
      {!linkInfo?.hasLinkedWallet && !walletMismatch && (
        <div className="w-full p-4 bg-zinc-900 border border-zinc-700 text-center">
          <p className="text-sm text-zinc-400">
            Connect a wallet to link it to your account.
          </p>
          <p className="text-xs text-zinc-500 mt-2">
            This wallet will be permanently linked to your email.
          </p>
        </div>
      )}

      {/* Wallet mismatch error */}
      {walletMismatch && (
        <div className="w-full p-4 bg-red-950 border border-red-800 text-center">
          <p className="text-sm text-red-400 font-medium mb-2">
            Wallet Mismatch
          </p>
          <p className="text-xs text-zinc-400 mb-3">
            Your email is linked to a different wallet:
          </p>
          <p className="font-mono text-green-400 mb-2">
            {formatAddress(walletMismatch.linkedWallet)}
          </p>
          <p className="text-xs text-zinc-500">
            You connected: {formatAddress(walletMismatch.connectedWallet)}
          </p>
          <p className="text-xs text-zinc-400 mt-3">
            Please disconnect and connect the correct wallet.
          </p>
        </div>
      )}

      <ConnectButton />

      {isVerifying && (
        <p className="text-sm text-zinc-400">Verifying wallet ownership...</p>
      )}

      {error && !walletMismatch && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}
