import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { mintUserSyncToken, mintUserToken } from "./apiToken";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/sign-in",
  },
  callbacks: {
    async jwt({ token, account, profile }) {
      // Only runs on sign-in (account/profile are only present then), not on
      // every subsequent request — the DB id then lives in the JWT itself.
      if (account && profile?.email) {
        const res = await fetch(`${API_URL}/api/users`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${mintUserSyncToken()}`,
          },
          body: JSON.stringify({ email: profile.email, name: profile.name }),
        });
        // Fail the sign-in outright rather than issue a session with no user id.
        if (!res.ok) throw new Error(`User sync failed: ${res.status}`);
        const user = await res.json();
        token.userId = user.id;
      }
      return token;
    },
    // Runs on every session read (getServerSession, getSession, useSession),
    // so each read hands out a freshly minted short-lived API token.
    async session({ session, token }) {
      if (session.user && token.userId) {
        session.user.id = token.userId;
        session.apiToken = mintUserToken(token.userId);
      }
      return session;
    },
  },
};
