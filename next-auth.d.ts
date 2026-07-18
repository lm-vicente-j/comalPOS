import type { DefaultSession } from "next-auth";

import type { UserRole } from "@/lib/auth-types";

declare module "next-auth" {
  interface Session {
    user: {
      id: string | undefined;
      role: UserRole;
    } & DefaultSession["user"];
  }

  interface User {
    role?: UserRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    // Kept optional while JWTs issued before this change expire.
    id?: string;
    role?: UserRole;
  }
}
