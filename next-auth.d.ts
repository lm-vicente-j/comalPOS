import { type DefaultSession } from "next-auth"

declare module "next-auth" {
  interface User {
    role?: string; // Add role to User
  }

  interface Session {
    user: {
      role?: string;
    } & DefaultSession["user"]; // Merge with default fields
  }
}

// Also extend JWT if you are using JSON Web Tokens
import { JWT } from "next-auth/jwt"

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
  }
}