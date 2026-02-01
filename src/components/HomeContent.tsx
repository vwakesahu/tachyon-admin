"use client";

import { signOut } from "next-auth/react";
import { WalletGuard } from "./WalletGuard";
/* eslint-disable @next/next/no-img-element */

interface HomeContentProps {
  email: string;
  walletAddress: string;
}

function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function HomeContent({ email, walletAddress }: HomeContentProps) {
  return (
    <WalletGuard sessionWallet={walletAddress}>
      <div className="min-h-screen flex flex-col bg-black">
        {/* Header */}
        <header className="border-b border-zinc-900">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/logo.svg" alt="Tachyon" width={28} height={28} />
              <span className="text-white font-heading font-semibold">
                tachyon
              </span>
              <span className="text-zinc-600 font-mono text-sm">admin</span>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-3 px-4 py-2 bg-zinc-900 border border-zinc-800">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-zinc-400 text-sm font-mono">
                  {formatAddress(walletAddress)}
                </span>
              </div>
              <button
                onClick={() => signOut({ redirectTo: "/login" })}
                className="px-4 py-2 text-zinc-400 hover:text-white text-sm transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-12">
          {/* Welcome section */}
          <div className="mb-12">
            <h1 className="text-3xl font-heading font-bold text-white mb-2">
              Dashboard
            </h1>
            <p className="text-zinc-500">
              Welcome back, <span className="text-zinc-300">{email}</span>
            </p>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="bg-zinc-950 border border-zinc-800 p-6">
              <p className="text-zinc-500 text-sm mb-1">Status</p>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-white font-medium">Connected</span>
              </div>
            </div>
            <div className="bg-zinc-950 border border-zinc-800 p-6">
              <p className="text-zinc-500 text-sm mb-1">Wallet</p>
              <p className="text-white font-mono text-sm">
                {formatAddress(walletAddress)}
              </p>
            </div>
            <div className="bg-zinc-950 border border-zinc-800 p-6">
              <p className="text-zinc-500 text-sm mb-1">Role</p>
              <p className="text-white font-medium">Administrator</p>
            </div>
          </div>

          {/* Quick actions */}
          <div className="mb-8">
            <h2 className="text-lg font-heading font-semibold text-white mb-4">
              Quick Actions
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  title: "Manage Users",
                  desc: "View and manage user accounts",
                  icon: (
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
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                  ),
                },
                {
                  title: "Transactions",
                  desc: "Monitor protocol transactions",
                  icon: (
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
                        d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                      />
                    </svg>
                  ),
                },
                {
                  title: "Analytics",
                  desc: "View protocol statistics",
                  icon: (
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
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                  ),
                },
                {
                  title: "Settings",
                  desc: "Configure protocol settings",
                  icon: (
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
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  ),
                },
              ].map((action) => (
                <button
                  key={action.title}
                  className="group bg-zinc-950 border border-zinc-800 p-6 text-left hover:border-zinc-700 transition-colors"
                >
                  <div className="text-zinc-500 group-hover:text-white mb-3 transition-colors">
                    {action.icon}
                  </div>
                  <h3 className="text-white font-medium mb-1">{action.title}</h3>
                  <p className="text-zinc-500 text-sm">{action.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Session info */}
          <div className="bg-zinc-950 border border-zinc-800 p-6">
            <h3 className="text-white font-medium mb-4">Session Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-zinc-500 mb-1">Email</p>
                <p className="text-white font-mono">{email}</p>
              </div>
              <div>
                <p className="text-zinc-500 mb-1">Wallet Address</p>
                <p className="text-white font-mono break-all">{walletAddress}</p>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-zinc-900 py-6">
          <div className="max-w-7xl mx-auto px-6 flex items-center justify-between text-sm">
            <p className="text-zinc-600">Tachyon Protocol Admin</p>
            <p className="text-zinc-700">Secured with 3-factor authentication</p>
          </div>
        </footer>
      </div>
    </WalletGuard>
  );
}
