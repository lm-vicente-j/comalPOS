// auth.ts
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials";
import prisma from "./prisma";
import bcrypt from "bcryptjs";
import { authConfig } from "@/app/auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth({

  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials) {
        if (!credentials) return null;

        // Lógica para ADMIN
        if (credentials.role === "ADMIN") {
          const user = await prisma.users.findFirst({
            where: { email: credentials.email as string }
          });

          if (user && user.password) {
            const isPassCorrect = await bcrypt.compare(
              credentials.password as string,
              user.password
            );
            if (isPassCorrect) {

              return {
                id: user.id.toString(),
                name: user.name,
                email: user.email,
                role: user.role ?? "STAFF", 
              };
            }
          }
        }

        // Lógica para STAFF
        if (credentials.role === "STAFF") {
          const user = await prisma.users.findFirst({
            where: { username: credentials.username as string }
          });
          if (user && user.pin) {
            const isPinCorrect = await bcrypt.compare(
              credentials.pin as string,
              user.pin
            );
            if (isPinCorrect) {
              return {
                id: user.id.toString(),
                name: user.name,
                email: undefined,
                role: user.role ?? "STAFF", 
              };
            }
          }
        }
        return null;
      },
    }),
  ],
  callbacks: {

    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      // Pasamos el rol del token a la sesión
      if (token.role && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
})