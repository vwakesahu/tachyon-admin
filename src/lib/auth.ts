import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import type { NextAuthConfig } from "next-auth";
import type { JWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
      // TOTP fields
      totpSecret?: string;
      totpEnabled: boolean;
      totpVerified: boolean;
      // Wallet fields
      walletAddress?: string;
      walletConnected: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    // TOTP fields
    totpSecret?: string;
    totpEnabled?: boolean;
    totpVerified?: boolean;
    // Wallet fields
    walletAddress?: string;
    walletConnected?: boolean;
  }
}

const config: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, trigger, session }) {
      // Initialize TOTP status
      if (token.totpEnabled === undefined) {
        token.totpEnabled = false;
      }
      if (token.totpVerified === undefined) {
        token.totpVerified = false;
      }

      // Initialize wallet status
      if (token.walletConnected === undefined) {
        token.walletConnected = false;
      }

      // Handle session updates
      if (trigger === "update") {
        // TOTP setup - store the secret
        if (session?.totpSecret) {
          token.totpSecret = session.totpSecret as string;
        }

        // TOTP enabled after first successful verification
        if (session?.totpEnabled !== undefined) {
          token.totpEnabled = session.totpEnabled as boolean;
        }

        // TOTP verified for this session
        if (session?.totpVerified !== undefined) {
          token.totpVerified = session.totpVerified as boolean;
        }

        // Wallet address
        if (session?.walletAddress) {
          token.walletAddress = session.walletAddress as string;
          token.walletConnected = true;
        }
      }

      return token;
    },
    async session({ session, token }) {
      const typedToken = token as JWT;

      // TOTP fields - don't expose secret to client
      session.user.totpEnabled = typedToken.totpEnabled ?? false;
      session.user.totpVerified = typedToken.totpVerified ?? false;

      // Wallet fields
      session.user.walletAddress = typedToken.walletAddress;
      session.user.walletConnected = typedToken.walletConnected ?? false;

      return session;
    },
  },
};

export const { handlers, signIn, signOut, auth } = NextAuth(config);
