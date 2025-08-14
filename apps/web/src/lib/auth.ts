import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const email = String(credentials?.email || "").toLowerCase().trim();
        const password = String(credentials?.password || "");
        const res = await fetch(`${process.env.API_INTERNAL_URL}/auth/login`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email, password })
        });
        if (!res.ok) return null;
        const data = await res.json();
        // Store API JWT on the user object for jwt() callback.
        return { id: email, email, apiToken: data.token } as any;
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user && (user as any).apiToken) {
        token.apiToken = (user as any).apiToken;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      (session as any).apiToken = token.apiToken;
      return session;
    }
  },
  pages: { signIn: "/signin" }
};
