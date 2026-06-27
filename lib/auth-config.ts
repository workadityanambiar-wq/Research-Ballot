import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/db';
import type { Role } from '@/lib/types';

// Extend the built-in session/token types to carry our custom fields
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      displayName: string;
      legacyId: string;
      title: string;
      role: Role;
      tier: string;       // display format: 'A+' | 'A' | 'B'
      mfaEnabled: boolean;
    };
  }
  interface User {
    legacyId?: string;
    displayName?: string;
    title?: string;
    role?: Role;
    tier?: string;
    mfaEnabled?: boolean;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'database' },

  providers: [
    Credentials({
      // This provider is the final "seal" step — called only after our
      // custom pre-login and verify-mfa API routes have validated credentials.
      // It receives { userId } after all checks are passed.
      credentials: {
        userId: { type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.userId || typeof credentials.userId !== 'string') return null;
        const user = await prisma.user.findUnique({ where: { id: credentials.userId } });
        if (!user) return null;
        const tierDisplay = user.tier === 'A_PLUS' ? 'A+' : user.tier;
        return {
          id: user.id,
          email: user.email ?? '',
          name: user.displayName,
          legacyId: user.legacyId,
          displayName: user.displayName,
          title: user.title,
          role: user.role,
          tier: tierDisplay,
          mfaEnabled: user.mfaEnabled,
        };
      },
    }),
  ],

  callbacks: {
    async signIn({ user }) {
      if (!user.id) return false;
      // Enforce single active session: delete all existing sessions for this user
      const existingSessions = await prisma.session.findMany({
        where: { userId: user.id },
        select: { id: true, sessionToken: true },
      });
      if (existingSessions.length > 0) {
        await prisma.session.deleteMany({ where: { userId: user.id } });
      }
      return true;
    },

    async session({ session, user }) {
      // user comes from DB via database session strategy
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { legacyId: true, displayName: true, title: true, role: true, tier: true, mfaEnabled: true },
      });
      if (dbUser) {
        const tierDisplay = dbUser.tier === 'A_PLUS' ? 'A+' : dbUser.tier;
        session.user = {
          ...session.user,
          id: user.id,
          legacyId: dbUser.legacyId,
          displayName: dbUser.displayName,
          title: dbUser.title,
          role: dbUser.role,
          tier: tierDisplay,
          mfaEnabled: dbUser.mfaEnabled,
        };
      }
      return session;
    },
  },

  pages: {
    signIn: '/login',
    error: '/login',
  },
});
