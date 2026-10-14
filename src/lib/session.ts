import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { auth } from "./auth";
import { can, isStaff, type Permission } from "./permissions";

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: string;
  locale: string;
  displayCurrency: "HTG" | "USD";
  twoFactorEnabled?: boolean | null;
  emailVerified: boolean;
};

export async function getUser(): Promise<SessionUser | null> {
  const s = await getSession();
  return (s?.user as unknown as SessionUser) ?? null;
}

/** Customer pages: redirect to login when signed out. */
export async function requireUser(locale: string, next?: string): Promise<SessionUser> {
  const user = await getUser();
  if (!user) redirect(`/${locale}/auth/login${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  if (user.status === "SUSPENDED" || user.status === "CLOSED") redirect(`/${locale}/auth/login?blocked=1`);
  return user;
}

export class AuthError extends Error {}

/** Server actions: throw when the caller is not signed in. */
export async function assertUser(): Promise<SessionUser> {
  const user = await getUser();
  if (!user) throw new AuthError("Not signed in");
  if (user.status === "SUSPENDED" || user.status === "CLOSED") throw new AuthError("Account is not active");
  return user;
}

/** Admin pages: staff with 2FA enabled and the given permission. */
export async function requireStaff(permission: Permission = "dashboard.view"): Promise<SessionUser> {
  const user = await getUser();
  if (!user || !isStaff(user.role)) redirect("/admin/login");
  if (!user.twoFactorEnabled) redirect("/admin/setup-2fa");
  if (!can(user.role, permission)) redirect("/admin?denied=1");
  return user;
}

/** Admin server actions: throw instead of redirecting. */
export async function assertStaff(permission: Permission): Promise<SessionUser> {
  const user = await getUser();
  if (!user || !isStaff(user.role) || !user.twoFactorEnabled) throw new AuthError("Staff sign-in with 2FA required");
  if (!can(user.role, permission)) throw new AuthError(`Missing permission: ${permission}`);
  return user;
}
