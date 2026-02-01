"use client";

import { useAccount, useSignMessage, useDisconnect } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback, useRef } from "react";
import { SiweMessage } from "siwe";
import { useRouter } from "next/navigation";
import { APP_NAME_ADMIN } from "@/lib/constants";

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
  const [walletMismatch, setWalletMismatch] =
    useState<WalletMismatchError | null>(null);
  const [linkInfo, setLinkInfo] = useState<WalletLinkInfo | null>(null);
  const hasAttemptedVerification = useRef(false);

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
      // Ignore errors
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
      const nonceRes = await fetch("/api/siwe/nonce");
      const { nonce } = await nonceRes.json();

      const message = new SiweMessage({
        domain: window.location.host,
        address,
        statement: `Sign in to ${APP_NAME_ADMIN}`,
        uri: window.location.origin,
        version: "1",
        chainId: chain.id,
        nonce,
      });

      const signature = await signMessageAsync({
        message: message.prepareMessage(),
      });

      const verifyRes = await fetch("/api/siwe/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, signature }),
      });

      const verifyData = await verifyRes.json();

      if (!verifyRes.ok) {
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

      await update({ walletAddress: address });
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

  useEffect(() => {
    if (
      isConnected &&
      address &&
      !isVerifying &&
      !hasAttemptedVerification.current
    ) {
      hasAttemptedVerification.current = true;
      handleSiweVerification();
    }
  }, [isConnected, address, isVerifying, handleSiweVerification]);

  useEffect(() => {
    if (!isConnected) {
      hasAttemptedVerification.current = false;
    }
  }, [isConnected]);

  function formatAddress(addr: string): string {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  }

  if (isCheckingLink) {
    return (
      <div className="flex flex-col items-center gap-4 py-4">
        <div className="w-8 h-8 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
        <p className="text-zinc-500 text-sm">Checking wallet status...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-5 w-full">
      {/* Linked wallet info */}
      {linkInfo?.hasLinkedWallet && linkInfo.linkedWallet && !walletMismatch && (
        <div className="w-full p-4 bg-zinc-900 border border-zinc-800 text-center">
          <p className="text-xs text-zinc-500 mb-2">Your linked wallet</p>
          <p className="font-mono text-sm text-white">
            {formatAddress(linkInfo.linkedWallet)}
          </p>
        </div>
      )}

      {/* First-time user */}
      {!linkInfo?.hasLinkedWallet && !walletMismatch && (
        <div className="w-full p-4 bg-zinc-900 border border-zinc-800 text-center">
          <p className="text-zinc-400 text-sm">
            Connect a wallet to link to your account
          </p>
          <p className="text-zinc-600 text-xs mt-1">
            This will be permanently linked to your email
          </p>
        </div>
      )}

      {/* Mismatch error */}
      {walletMismatch && (
        <div className="w-full p-4 bg-red-950/50 border border-red-900 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <svg
              className="w-4 h-4 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <p className="text-red-400 text-sm font-medium">Wallet Mismatch</p>
          </div>
          <p className="text-zinc-400 text-xs mb-2">Required wallet:</p>
          <p className="font-mono text-sm text-green-400 mb-3">
            {formatAddress(walletMismatch.linkedWallet)}
          </p>
          <p className="text-zinc-500 text-xs">
            Connected: {formatAddress(walletMismatch.connectedWallet)}
          </p>
        </div>
      )}

      {/* Connect button */}
      <div className="w-full flex justify-center">
        <ConnectButton.Custom>
          {({ openConnectModal, connectModalOpen }) => (
            <button
              onClick={openConnectModal}
              disabled={connectModalOpen || isVerifying}
              className="w-full px-6 py-3 bg-white text-black font-medium hover:bg-zinc-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isVerifying ? (
                <>
                  <div className="w-4 h-4 border-2 border-zinc-400 border-t-black rounded-full animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
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
                      d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3"
                    />
                  </svg>
                  Connect Wallet
                </>
              )}
            </button>
          )}
        </ConnectButton.Custom>
      </div>

      {error && !walletMismatch && (
        <p className="text-sm text-red-500 text-center">{error}</p>
      )}
    </div>
  );
}
