// auth.config.ts
import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const role = auth?.user?.role;
      const { pathname } = nextUrl;

      if (pathname === "/login") {
        if (isLoggedIn) {
          const dest = role === "ADMIN" ? "/admin" : "/pos"; 
          return Response.redirect(new URL(dest, nextUrl));
        }
        return true; 
      }

      if (pathname.startsWith("/admin") || pathname.startsWith("/pos")) {
        if (!isLoggedIn) return false; 
        
        if (pathname.startsWith("/admin") && role !== "ADMIN") {
          return Response.redirect(new URL("/pos", nextUrl));
        }
        return true;
      }

      return isLoggedIn;
    },
  },
  providers: [], 
} satisfies NextAuthConfig;