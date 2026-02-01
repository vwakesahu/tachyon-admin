"use client";

import { useAccount, useDisconnect } from "wagmi";
import { useSession, signOut } from "next-auth/react";
import { useSyncExternalStore, useCallback } from "react";

// Hook to check if component is mounted (client-side)
function useIsMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

function WalletChecker({
  children,
  sessionWallet,
}: {
  children: React.ReactNode;
  sessionWallet: string;
}) {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  // Derive mismatch state directly from props/hooks
  const mismatch =
    isConnected &&
    address &&
    address.toLowerCase() !== sessionWallet.toLowerCase();

  const handleSignOut = useCallback(async () => {
    disconnect();
    await signOut({ redirectTo: "/login" });
  }, [disconnect]);

  if (mismatch) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black gap-6 p-4">
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
            Please switch back to your linked wallet in your wallet app, or sign
            out and re-authenticate.
          </p>
        </div>
        <button
          onClick={handleSignOut}
          className="px-6 py-3 bg-red-600 text-white font-medium hover:bg-red-700 transition-colors"
        >
          Sign Out
        </button>
      </div>
    );
  }

  return <>{children}</>;
}

export function WalletGuard({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const mounted = useIsMounted();

  // Don't check until mounted (WagmiProvider needs to be ready)
  if (!mounted) {
    return <>{children}</>;
  }

  // No session wallet to check against
  if (!session?.user?.walletAddress) {
    return <>{children}</>;
  }

  return (
    <WalletChecker sessionWallet={session.user.walletAddress}>
      {children}
    </WalletChecker>
  );
}
