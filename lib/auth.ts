// auth.ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

import { authConfig } from "@/app/auth.config";
import { normalizeUserRole } from "@/lib/auth-types";

import prisma from "./prisma";
import bcrypt from "bcryptjs";

const credentialsSchema = z.discriminatedUnion("role", [
  z.object({
    role: z.literal("ADMIN"),
    email: z.string().trim().email(),
    password: z.string().min(1),
  }),
  z.object({
    role: z.literal("STAFF"),
    username: z.string().trim().min(1),
    pin: z.string().regex(/^\d{4}$/),
  }),
]);

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsedCredentials = credentialsSchema.safeParse(credentials);

        if (!parsedCredentials.success) return null;

        if (parsedCredentials.data.role === "ADMIN") {
          const user = await prisma.users.findFirst({
            where: { email: parsedCredentials.data.email },
          });

          if (!user?.password || user.active === false) return null;

          const isPasswordCorrect = await bcrypt.compare(
            parsedCredentials.data.password,
            user.password,
          );

          if (!isPasswordCorrect) return null;

          return {
            id: user.id.toString(),
            name: user.name,
            email: user.email,
            role: normalizeUserRole(user.role),
          };
        }

        const user = await prisma.users.findFirst({
          where: { username: parsedCredentials.data.username },
        });

        if (!user?.pin || user.active === false) return null;

        const isPinCorrect = await bcrypt.compare(
          parsedCredentials.data.pin,
          user.pin,
        );

        if (!isPinCorrect) return null;

        return {
          id: user.id.toString(),
          name: user.name,
          email: undefined,
          role: normalizeUserRole(user.role),
        };
      },
    }),
  ],
});
