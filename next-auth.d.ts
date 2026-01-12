import { type DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string | undefined;  
      role: string;
    } & DefaultSession["user"]
  }

  interface User {
    role?: string;
  }
}

import { JWT } from "next-auth/jwt"

declare module "next-auth/jwt" {
  interface JWT {
    id: string | undefined;
    role?: string;
  }
}




declare module "next-auth/jwt" {
  interface JWT {
    id: string | undefined;
    role: string;
  }
}