// auth.config.ts
import type { NextAuthConfig } from "next-auth";
import { NextResponse } from "next/server";

import { normalizeUserRole } from "@/lib/auth-types";
import { canAccessRoute } from "@/lib/permissions";

export const AUTH_SESSION_MAX_AGE = 8 * 60 * 60;

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: AUTH_SESSION_MAX_AGE,
  },
  jwt: {
    maxAge: AUTH_SESSION_MAX_AGE,
  },
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isLoggedIn = Boolean(auth?.user);

      if (pathname === "/login") {
        return isLoggedIn
          ? NextResponse.redirect(new URL("/pos", request.nextUrl))
          : true;
      }

      if (!isLoggedIn) return false;

      // Role-based access is defined centrally in lib/permissions.ts.
      // /pos is accessible to every role, so redirecting there never loops.
      const role = normalizeUserRole(auth?.user.role);
      if (!canAccessRoute(role, pathname)) {
        return NextResponse.redirect(new URL("/pos", request.nextUrl));
      }

      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.role = normalizeUserRole(user.role);
      }

      return token;
    },
    session({ session, token }) {
      const legacyUserId =
        typeof token.id === "string" ? token.id : undefined;
      const userId = token.sub ?? legacyUserId;

      if (userId) session.user.id = userId;
      session.user.role = normalizeUserRole(token.role);

      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
