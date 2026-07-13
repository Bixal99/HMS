import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

/**
 * Auth.js is configured with database sessions + PrismaAdapter.
 * Live email/password login does NOT use the Credentials provider (unsupported
 * with database sessions). Login/register Server Actions create Session rows
 * and set the authjs.session-token cookie instead.
 */
export const { handlers, auth, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  pages: { signIn: "/login" },
  providers: [],
  trustHost: true,
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
        session.user.role = dbUser?.role ?? "PATIENT";
      }
      return session;
    },
  },
});
