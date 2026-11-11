import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { ACTIVE_STATUSES, OrderCard, orderCardInclude, orderGroups, parseTab } from "@/components/account/OrderCard";
import { InstantTabs } from "@/components/InstantTabs";
import { ReceiptIcon } from "@/components/account/AccountIcons";

export default async function OrdersPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const tab = parseTab((await searchParams).tab);
  const user = await requireUser(locale);
  const [tc, ta, tu] = await Promise.all([getTranslations("common"), getTranslations("account"), getTranslations("accountUi")]);
  const [orders, groups] = await Promise.all([
    prisma.order.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 100, include: orderCardInclude }),
    prisma.order.groupBy({ by: ["status"], where: { userId: user.id }, _count: true }),
  ]);
  const n = (s?: readonly string[]) => groups.filter((g) => !s || s.includes(g.status)).reduce((x, g) => x + g._count, 0);
  const counts = { all: n(), active: n(ACTIVE_STATUSES), done: n(["FULFILLED"]) };
  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <h1 className="display flex items-center gap-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
          <ReceiptIcon width={26} height={26} className="text-[#60a5fa]" /> {tu("orderHistory")}
        </h1>
        <Link href="/store" className="text-sm font-semibold text-primary">{tc("store")} →</Link>
      </div>
      <InstantTabs
        label={tu("orderHistory")}
        param="tab"
        initial={tab}
        variant="segmented"
        counts={counts}
        tabs={(["all", "active", "done"] as const).map((k) => ({ key: k, label: tu(`tab_${k}`) }))}
        empty={<div className="rounded-3xl border border-border bg-surface/80 p-10 text-center text-sm text-muted"><span className="mb-2 block text-3xl" aria-hidden>🎮</span>{ta("noOrders")}</div>}
        emptyTab={<div className="rounded-3xl border border-border bg-surface/80 p-10 text-center text-sm text-muted"><span className="mb-2 block text-3xl" aria-hidden>🎮</span>{tu("noneInTab")}</div>}
        items={orders.map((o) => ({ id: o.id, groups: orderGroups(o.status), node: <OrderCard order={o} locale={locale} /> }))}
      />
    </div>
  );
}
