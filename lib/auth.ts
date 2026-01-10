// auth.ts
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials";
import prisma from "./prisma";
import bcrypt from "bcryptjs";
import { authConfig } from "@/app/auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth({
  
  ...authConfig, // Traemos la configuración base (pages, authorized, etc.)
  providers: [
    Credentials({
      async authorize(credentials) {
        if (!credentials) return null;

        // Lógica para ADMIN
        if (credentials.role === "ADMIN") {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email as string }
          });
          if (user && user.password) {
            const isPassCorrect = await bcrypt.compare(
              credentials.password as string,
              user.password
            );
            if (isPassCorrect) return user;
          }
        }

        // Lógica para STAFF
        if (credentials.role === "STAFF") {
          const user = await prisma.user.findFirst({
            where: { name: credentials.name as string }
          });
          if (user && user.pin) {
            const isPinCorrect = await bcrypt.compare(
              credentials.pin as string,
              user.pin
            );
            if (isPinCorrect) return user;
          }
        }
        return null;
      },
    }),
  ],
  callbacks: {

    async jwt({ token, user }) {
      // El objeto 'user' solo está disponible cuando se inicia sesión
      if (user) {
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      // Pasamos el rol del token a la sesión
      if (token.role && session.user) {
        session.user.role = token.role as string;
      }
      return session;
    },
  },
})