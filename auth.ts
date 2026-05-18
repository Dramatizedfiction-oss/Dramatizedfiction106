import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import EmailProvider from "next-auth/providers/email";
import { comparePassword } from "@/lib/auth-utils";
import { normalizeRole } from "@/lib/roles";

const emailProviderConfigured =
  Boolean(process.env.EMAIL_SERVER) && Boolean(process.env.EMAIL_FROM);
const isProduction = process.env.NODE_ENV === "production";
const sessionCookieName = isProduction
  ? "__Secure-authjs.session-token"
  : "authjs.session-token";

const credentialsProvider = Credentials({
  name: "Credentials",
  credentials: {
    email: { label: "Email", type: "email" },
    password: { label: "Password", type: "password" },
  },
  async authorize(credentials) {
    const rawEmail =
      typeof credentials?.email === "string" ? credentials.email : "";
    const password =
      typeof credentials?.password === "string" ? credentials.password : "";
    const email = rawEmail.trim().toLowerCase();

    if (!email || !password) {
      return null;
    }

    try {
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user?.passwordHash) {
        return null;
      }

      const passwordMatches = comparePassword(password, user.passwordHash);

      if (!passwordMatches) {
        return null;
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        role: normalizeRole(user.role),
      };
    } catch (error) {
      console.error("Database error during auth:", error);
      return null;
    }
  },
});

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut
} = NextAuth({
  adapter: PrismaAdapter(prisma) as any,
  session: {
    strategy: "database",
    maxAge: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 12,
  },
  trustHost: true,
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  useSecureCookies: isProduction,
  pages: {
    signIn: "/sign-in",
  },
  cookies: {
    sessionToken: {
      name: sessionCookieName,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProduction,
      },
    },
  },
  providers: emailProviderConfigured
    ? [credentialsProvider, EmailProvider({
          server: process.env.EMAIL_SERVER,
          from: process.env.EMAIL_FROM
        })]
    : [credentialsProvider],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = String(user.id ?? "");
        session.user.role = normalizeRole(String(user.role ?? "READER"));
      }
      console.log("auth.session session", {
        userId: session.user?.id,
        role: session.user?.role,
        expires: session.expires,
      });
      return session;
    },
  },
});
