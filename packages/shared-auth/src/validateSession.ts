type SessionUser = {
  id: string;
  email: string;
  role: string;
  isActive: boolean;
  mustChangePassword?: boolean;
  passwordHash?: string;
  name?: string | null;
};

type PrismaLike = {
  session: {
    findUnique: (args: {
      where: { sessionToken: string };
      include: { user: true };
    }) => Promise<{
      expires: Date;
      user: SessionUser;
    } | null>;
  };
};

/**
 * Resolve an Auth.js database session token into the linked user.
 * Prisma client is injected so this package stays DB-client agnostic.
 */
export async function validateSessionToken(prisma: PrismaLike, sessionToken: string) {
  const session = await prisma.session.findUnique({
    where: { sessionToken },
    include: { user: true },
  });

  if (!session || session.expires < new Date()) {
    return null;
  }

  if (!session.user.isActive) {
    return null;
  }

  const { passwordHash: _passwordHash, ...safeUser } = session.user;
  return safeUser;
}
