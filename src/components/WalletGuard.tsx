"use client";

import { useAccount, useDisconnect } from "wagmi";
import { signOut } from "next-auth/react";
import { useCallback, useContext } from "react";
import { WalletReadyContext } from "@/providers/WalletProvider";

// Inner component that uses wagmi hooks - only rendered when providers are ready
function WalletMismatchChecker({
  children,
  sessionWallet,
}: {
  children: React.ReactNode;
  sessionWallet: string;
}) {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  const showMismatch =
    isConnected &&
    !!address &&
    address.toLowerCase() !== sessionWallet.toLowerCase();

  const handleSignOut = useCallback(async () => {
    disconnect();
    await signOut({ redirectTo: "/login" });
  }, [disconnect]);

  return (
    <>
      {children}
      {showMismatch && (
        <div className="fixed inset-0 z-50 min-h-screen flex flex-col items-center justify-center bg-black gap-6 p-4">
          <div className="max-w-md text-center space-y-4">
            <h1 className="text-2xl font-heading font-bold text-red-500">
              Wallet Mismatch Detected
            </h1>
            <p className="text-zinc-400">
              Your connected wallet doesn&apos;t match your session.
            </p>
            <div className="p-4 bg-zinc-900 border border-zinc-700 text-left space-y-2">
              <p className="text-xs text-zinc-500">Session wallet:</p>
              <p className="font-mono text-sm text-green-400 break-all">
                {sessionWallet}
              </p>
              <p className="text-xs text-zinc-500 mt-3">Connected wallet:</p>
              <p className="font-mono text-sm text-red-400 break-all">
                {address}
              </p>
            </div>
            <p className="text-sm text-zinc-500">
              Please switch back to your linked wallet, or sign out.
            </p>
          </div>
          <button
            onClick={handleSignOut}
            className="px-6 py-3 bg-red-600 text-white font-medium hover:bg-red-700 transition-colors"
          >
            Sign Out
          </button>
        </div>
      )}
    </>
  );
}

interface WalletGuardProps {
  children: React.ReactNode;
  sessionWallet: string;
}

export function WalletGuard({ children, sessionWallet }: WalletGuardProps) {
  const walletReady = useContext(WalletReadyContext);

  if (!walletReady) {
    return <>{children}</>;
  }

  return (
    <WalletMismatchChecker sessionWallet={sessionWallet}>
      {children}
    </WalletMismatchChecker>
  );
}
