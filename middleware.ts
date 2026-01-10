// middleware.ts
import NextAuth from "next-auth";
import { authConfig } from "./app/auth.config";

export default NextAuth(authConfig).auth((req) => {
  console.log("Middleware ejecutándose en ruta:", req.nextUrl.pathname);
});

export const config = {
matcher: ["/((?!api|_next/static|_next/image|favicon.ico|public).*)"],
};