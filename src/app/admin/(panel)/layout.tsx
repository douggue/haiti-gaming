import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { can, type Permission } from "@/lib/permissions";
import { AdminNav } from "@/components/admin/AdminNav";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaff();
  const [reviews, risks, processing] = await Promise.all([
    prisma.paymentIntent.count({ where: { status: "REVIEW" } }),
    prisma.riskFlag.count({ where: { status: "OPEN" } }),
    prisma.order.count({ where: { status: "PROCESSING" } }),
  ]);
  const all: { href: string; label: string; perm: Permission; badge?: number }[] = [
    { href: "/admin", label: "Dashboard", perm: "dashboard.view" },
    { href: "/admin/orders", label: "Orders", perm: "orders.view", badge: processing },
    { href: "/admin/payments", label: "Payments", perm: "payments.review", badge: reviews },
    { href: "/admin/risk", label: "Risk queue", perm: "risk.manage", badge: risks },
    { href: "/admin/products", label: "Products", perm: "catalog.manage" },
    { href: "/admin/codes", label: "Code inventory", perm: "codes.manage" },
    { href: "/admin/customers", label: "Customers", perm: "customers.view" },
    { href: "/admin/wallet", label: "Ledger", perm: "wallet.view" },
    { href: "/admin/staff", label: "Staff & roles", perm: "staff.manage" },
    { href: "/admin/settings", label: "Settings", perm: "settings.manage" },
    { href: "/admin/audit", label: "Audit log", perm: "audit.view" },
  ];
  return (
    <div className="lg:flex">
      <AdminNav items={all.filter((i) => can(user.role, i.perm))} user={{ name: user.name, role: user.role }} />
      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  );
}
