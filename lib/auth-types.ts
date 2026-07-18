export const USER_ROLES = ["ADMIN", "STAFF"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export function normalizeUserRole(role: unknown): UserRole {
  return role === "ADMIN" ? "ADMIN" : "STAFF";
}
