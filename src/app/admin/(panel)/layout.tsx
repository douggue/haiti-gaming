import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { can, type Permission } from "@/lib/permissions";
import { AdminNav } from "@/components/admin/AdminNav";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaff();
  const [settings, reviews, risks, processing, approvals, tickets] = await Promise.all([
    getSettings(),
    prisma.paymentIntent.count({ where: { status: "REVIEW" } }),
    prisma.riskFlag.count({ where: { status: "OPEN" } }),
    prisma.order.count({ where: { status: "PROCESSING" } }),
    prisma.pendingApproval.count({ where: { status: "PENDING" } }),
    prisma.supportTicket.count({ where: { status: "OPEN" } }),
  ]);
  const all: { href: string; label: string; perm: Permission; badge?: number }[] = [
    { href: "/admin", label: "Dashboard", perm: "dashboard.view" },
    { href: "/admin/orders", label: "Orders", perm: "orders.view", badge: processing },
    { href: "/admin/payments", label: "Payments", perm: "payments.review", badge: reviews },
    { href: "/admin/risk", label: "Risk queue", perm: "risk.manage", badge: risks },
    { href: "/admin/approvals", label: "Approvals", perm: "approvals.decide", badge: approvals },
    { href: "/admin/support", label: "Support", perm: "support.manage", badge: tickets },
    { href: "/admin/products", label: "Products", perm: "catalog.manage" },
    { href: "/admin/codes", label: "Code inventory", perm: "codes.manage" },
    { href: "/admin/customers", label: "Customers", perm: "customers.view" },
    { href: "/admin/wallet", label: "Ledger", perm: "wallet.view" },
    { href: "/admin/referrals", label: "Referrals", perm: "referrals.manage" },
    { href: "/admin/analytics", label: "Reports", perm: "analytics.view" },
    { href: "/admin/homepage", label: "Homepage", perm: "content.manage" },
    { href: "/admin/news", label: "News", perm: "content.manage" },
    { href: "/admin/appearance", label: "Appearance", perm: "content.manage" },
    { href: "/admin/translations", label: "Translations", perm: "content.manage" },
    { href: "/admin/seo", label: "SEO", perm: "seo.manage" },
    { href: "/admin/staff", label: "Staff & roles", perm: "staff.manage" },
    { href: "/admin/settings", label: "Settings", perm: "settings.manage" },
    { href: "/admin/audit", label: "Audit log", perm: "audit.view" },
  ];
  return (
    <div className="lg:flex">
      <AdminNav items={all.filter((i) => can(user, i.perm))} user={{ name: user.name, role: user.role }} logo={settings.logoDarkUrl || settings.logoUrl} />
      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  );
}
