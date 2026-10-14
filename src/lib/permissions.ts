import type { Role } from "@prisma/client";

export const PERMISSIONS = [
  "dashboard.view",
  "catalog.manage",
  "codes.manage",
  "codes.reveal",
  "orders.view",
  "orders.manage",
  "payments.review",
  "wallet.view",
  "wallet.adjust",
  "risk.manage",
  "customers.view",
  "customers.manage",
  "settings.manage",
  "staff.manage",
  "audit.view",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/** Starter roles from blueprint section 14. Enforced server-side in every admin action and page. */
export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  SUPER_ADMIN: PERMISSIONS,
  STORE_MANAGER: ["dashboard.view", "catalog.manage", "codes.manage", "orders.view", "orders.manage", "customers.view"],
  FINANCE_MANAGER: ["dashboard.view", "payments.review", "wallet.view", "wallet.adjust", "risk.manage", "orders.view", "customers.view", "audit.view"],
  CONTENT_EDITOR: ["dashboard.view", "catalog.manage"],
  SUPPORT_AGENT: ["dashboard.view", "orders.view", "customers.view"],
  FULFILLMENT: ["dashboard.view", "orders.view", "orders.manage", "codes.reveal"],
  CUSTOMER: [],
};

export function can(role: Role | string | undefined, permission: Permission): boolean {
  if (!role) return false;
  return (ROLE_PERMISSIONS[role as Role] ?? []).includes(permission);
}

export function isStaff(role: Role | string | undefined): boolean {
  return !!role && role !== "CUSTOMER" && role in ROLE_PERMISSIONS;
}
