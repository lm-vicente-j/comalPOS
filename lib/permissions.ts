import type { UserRole } from "@/lib/auth-types";

/**
 * Single source of truth for role-based route access.
 *
 * Consumed by:
 *  - the middleware (app/auth.config.ts) to enforce access server-side
 *  - the navigation components (sidebar, mobile nav) to derive visibility
 *
 * Rules are matched in order; the first prefix that matches the pathname
 * wins. A pathname that matches no rule is allowed for any authenticated
 * user (the middleware still requires login for everything).
 *
 * NOTE: this module must stay Edge-safe (no Prisma, no Node APIs) because
 * it is bundled into the middleware.
 */
interface RoutePermission {
  prefix: string;
  roles: readonly UserRole[];
}

export const ROUTE_PERMISSIONS: readonly RoutePermission[] = [
  { prefix: "/admin", roles: ["ADMIN"] },
  { prefix: "/pos", roles: ["ADMIN", "STAFF"] },
  { prefix: "/expenses", roles: ["ADMIN", "STAFF"] },
  { prefix: "/debtors", roles: ["ADMIN", "STAFF"] },
];

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/** Whether an authenticated user with the given role can access a pathname. */
export function canAccessRoute(role: string, pathname: string): boolean {
  const rule = ROUTE_PERMISSIONS.find((r) => matchesPrefix(pathname, r.prefix));
  if (!rule) return true;
  return (rule.roles as readonly string[]).includes(role);
}
