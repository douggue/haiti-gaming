import { getAppFormatter } from "@/lib/formatter";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { getBalances } from "@/lib/ledger";
import { getDisplayCurrency } from "@/lib/prefs";
import { formatMoney } from "@/lib/money";
import { WalletCard } from "@/components/WalletCard";
import { VerifyEmailBanner } from "@/components/VerifyEmailBanner";
import { emailEnabled } from "@/lib/email";
import { Avatar } from "@/components/Avatar";
import { getSettings } from "@/lib/settings";
import { localeNames, type Locale } from "@/i18n/routing";
import { LocaleSwitch, SignOutButton } from "@/components/HeaderClient";
import { BellIcon, ChatIcon, GiftIcon, GlobeIcon, HeadsetIcon, LockIcon, PinIcon, ShieldIcon, UserIcon, WhatsAppIcon } from "@/components/Icons";
import { ChevronRightIcon, GaugeIcon, ReceiptIcon, SlidersIcon, StorefrontIcon, WalletCardIcon } from "@/components/account/AccountIcons";
import { LedgerRow } from "@/components/account/LedgerRow";
import { ACTIVE_STATUSES, OrderCard, orderCardInclude, orderGroups, parseTab } from "@/components/account/OrderCard";
import { InstantTabs } from "@/components/InstantTabs";
import { DataSaverSwitch } from "@/components/account/DataSaverSwitch";

type Row = { href?: string; icon: React.ReactNode; tone: string; title: string; sub?: string; badge?: string; right?: React.ReactNode };

export default async function Dashboard({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const tab = parseTab((await searchParams).tab);
  const user = await requireUser(locale);
  const settings = await getSettings();
  const [ta, tw, tu, tc, tn, tds, fmt, balances, currency, profile, orders, groups, activity, listings, unread] = await Promise.all([
    getTranslations("account"),
    getTranslations("wallet"),
    getTranslations("accountUi"),
    getTranslations("common"),
    getTranslations("notifications"),
    getTranslations("dataSaver"),
    getAppFormatter(),
    getBalances(prisma, user.id),
    getDisplayCurrency(),
    prisma.user.findUnique({ where: { id: user.id }, select: { phone: true, city: true } }),
    prisma.order.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 30, include: orderCardInclude }),
    prisma.order.groupBy({ by: ["status"], where: { userId: user.id }, _count: true }),
    prisma.ledgerEntry.findMany({
      where: { account: { userId: user.id } },
      orderBy: { createdAt: "desc" },
      take: 4,
      include: { transaction: true, account: { select: { type: true } } },
    }),
    settings.marketEnabled ? prisma.marketListing.count({ where: { sellerId: user.id, status: { in: ["PENDING", "ACTIVE", "RESERVED"] } } }) : Promise.resolve(0),
    prisma.notification.count({ where: { userId: user.id, readAt: null } }).catch(() => 0),
  ]);
  const n = (s?: readonly string[]) => groups.filter((g) => !s || s.includes(g.status)).reduce((x, g) => x + g._count, 0);
  const counts = { all: n(), active: n(ACTIVE_STATUSES), done: n(["FULFILLED"]) };
  const stats = [
    { value: String(counts.done), label: tu("ordersDone"), tone: "" },
    { value: formatMoney(balances.HTG.available, "HTG", locale).replace(/\s?HTG/, ""), label: tu("htgWallet"), tone: "text-amber-400" },
    settings.marketEnabled
      ? { value: String(listings), label: tu("listings"), tone: "text-emerald-400" }
      : { value: String(counts.active), label: ta("statsPending"), tone: "text-emerald-400" },
  ];
  const curLocale = (await getLocale()) as Locale;

  const rows: Row[] = [
    { href: "/account/profile", icon: <UserIcon width={20} height={20} />, tone: "text-[#60a5fa]", title: ta("profile"), sub: user.email },
    { href: "/account/security", icon: <ShieldIcon width={20} height={20} />, tone: "text-emerald-400", title: ta("security"), sub: tu("securitySub") },
    ...(settings.marketEnabled
      ? [
          { href: "/account/market", icon: <StorefrontIcon width={20} height={20} />, tone: "text-emerald-400", title: ta("market"), sub: tu("marketSub"), badge: listings ? tu("activeCount", { n: listings }) : undefined },
          { href: "/account/messages", icon: <ChatIcon width={20} height={20} />, tone: "text-violet-300", title: ta("messages"), sub: tu("messagesSub") },
        ]
      : []),
    { href: "/account/notifications", icon: <BellIcon width={20} height={20} />, tone: "text-amber-300", title: tn("title"), sub: tu("notificationsSub"), badge: unread ? String(unread) : undefined },
    ...(settings.referralEnabled ? [{ href: "/account/referrals", icon: <GiftIcon width={20} height={20} />, tone: "text-pink-300", title: ta("referrals"), sub: tu("referralsSub") }] : []),
    { href: "/account/privacy", icon: <LockIcon width={20} height={20} />, tone: "text-sky-300", title: ta("privacy"), sub: tu("privacySub") },
    { icon: <GaugeIcon width={20} height={20} />, tone: "text-orange-400", title: tds("label"), sub: tds("hint"), right: <DataSaverSwitch label={tds("label")} /> },
    { icon: <GlobeIcon width={20} height={20} />, tone: "text-indigo-300", title: tu("languageCurrency"), sub: `${localeNames[curLocale]} · HTG (${tu("gourdes")})`, right: <LocaleSwitch /> },
  ];

  const tOrder = await getTranslations("order");
  return (
    <div className="space-y-6">
      {/* Profile: who, how to reach them, and three numbers */}
      <section className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-[#1e293b] via-surface/90 to-[#1d4ed8]/25 p-4 sm:p-5">
        <span aria-hidden className="ds-hide pointer-events-none absolute -right-12 -top-16 size-48 rounded-full bg-[#3b82f6]/20 blur-3xl" />
        <div className="relative flex items-center gap-4">
          <span className="relative shrink-0">
            <Avatar name={user.name} image={user.image} size={68} className="rounded-2xl" />
            {user.emailVerified && (
              <span className="absolute -bottom-1 -right-1 grid size-6 place-items-center rounded-full bg-emerald-500 text-[12px] font-black text-white ring-2 ring-surface" aria-hidden>✓</span>
            )}
          </span>
          <div className="min-w-0">
            <h1 className="display truncate text-xl font-extrabold tracking-tight sm:text-2xl">{user.name}</h1>
            <p className="truncate text-sm text-muted">{profile?.phone || user.email}</p>
            <p className="mt-1.5 flex flex-wrap gap-1.5">
              {user.emailVerified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#1d4ed8]/25 px-2.5 py-0.5 text-xs font-bold text-[#93c5fd]">
                  <ShieldIcon width={13} height={13} /> {tu("emailVerified")}
                </span>
              )}
              {profile?.city && (
                <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-semibold text-muted">
                  <PinIcon width={13} height={13} /> {profile.city}
                </span>
              )}
            </p>
          </div>
        </div>
        <dl className="relative mt-4 grid grid-cols-3 divide-x divide-border rounded-2xl bg-black/25 py-3 text-center">
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col-reverse px-1">
              <dt className={`text-[11px] font-bold sm:text-xs ${s.tone || "text-muted"}`}>{s.label}</dt>
              <dd className="display truncate text-xl font-extrabold tabular-nums sm:text-2xl">{s.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {!user.emailVerified && emailEnabled() && <VerifyEmailBanner email={user.email} />}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <WalletCard balances={balances} initial={currency} showUsd={settings.showUsd} />
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="display flex items-center gap-2 text-lg font-bold"><WalletCardIcon width={20} height={20} className="text-[#60a5fa]" /> {tu("ledgerTitle")}</h2>
            <Link href="/account/wallet" className="text-sm font-semibold text-primary">{tc("viewAll")}</Link>
          </div>
          {activity.length === 0 ? (
            <p className="rounded-2xl border border-border bg-surface/80 py-8 text-center text-sm text-muted">{ta("noActivity")}</p>
          ) : (
            <ul className="space-y-2">
              {activity.map((e) => (
                <LedgerRow
                  key={e.id}
                  type={e.transaction.type}
                  amount={e.amount}
                  currency={e.currency}
                  locale={locale}
                  title={tw(`tx.${e.transaction.type}`)}
                  when={fmt.dateTime(e.createdAt, { dateStyle: "medium", timeStyle: "short" })}
                  detail={e.transaction.description?.replace(/^Order #(\d+)$/, (_, n) => tOrder("title", { number: n }))}
                  held={e.account.type === "CUSTOMER_HELD"}
                  heldLabel={tw("onHoldLabel")}
                  doneLabel={tw("done")}
                />
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Order history */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="display flex items-center gap-2 text-lg font-bold sm:text-xl"><ReceiptIcon width={22} height={22} className="text-[#60a5fa]" /> {tu("orderHistory")}</h2>
          <Link href="/account/orders" className="text-sm font-semibold text-primary">{tc("viewAll")}</Link>
        </div>
        <InstantTabs
          label={tu("orderHistory")}
          param="tab"
          initial={tab}
          variant="segmented"
          limit={3}
          counts={counts}
          tabs={(["all", "active", "done"] as const).map((k) => ({ key: k, label: tu(`tab_${k}`) }))}
          empty={
            <div className="rounded-3xl border border-border bg-surface/80 p-8 text-center text-sm text-muted">
              <span className="mb-2 block text-3xl" aria-hidden>🎮</span>
              {ta("noOrders")}
              <Link href="/store" className="btn-primary mx-auto mt-4 flex w-fit min-h-11 px-5">{tc("shopNow")}</Link>
            </div>
          }
          emptyTab={<div className="rounded-3xl border border-border bg-surface/80 p-8 text-center text-sm text-muted"><span className="mb-2 block text-3xl" aria-hidden>🎮</span>{tu("noneInTab")}</div>}
          items={orders.map((o) => ({ id: o.id, groups: orderGroups(o.status), node: <OrderCard order={o} locale={locale} /> }))}
        />
      </section>

      {/* Account & settings */}
      <section className="space-y-3">
        <h2 className="display flex items-center gap-2 text-lg font-bold sm:text-xl"><SlidersIcon width={22} height={22} className="text-[#60a5fa]" /> {tu("settingsTitle")}</h2>
        <ul className="grid gap-2 lg:grid-cols-2">
          {rows.map((r) => {
            const inner = (
              <>
                <span className={`grid size-12 shrink-0 place-items-center rounded-2xl bg-black/30 ${r.tone}`} aria-hidden>{r.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <b className="display text-[15px] font-bold">{r.title}</b>
                    {r.badge && <span className="rounded-md bg-emerald-500/20 px-1.5 py-0.5 text-[11px] font-bold text-emerald-300">{r.badge}</span>}
                  </span>
                  {r.sub && <span className="block truncate text-xs text-muted sm:text-sm">{r.sub}</span>}
                </span>
                {r.right ?? <ChevronRightIcon width={18} height={18} className="shrink-0 text-muted" />}
              </>
            );
            const cls = "flex min-h-[4.5rem] items-center gap-3 rounded-2xl border border-border bg-surface/80 px-3 py-3 sm:px-4";
            return (
              <li key={r.title}>
                {r.href ? <Link href={r.href} className={`${cls} transition-colors hover:border-[#3b82f6]/50`}>{inner}</Link> : <div className={cls}>{inner}</div>}
              </li>
            );
          })}
        </ul>
      </section>

      {/* Direct support */}
      <section className="rounded-3xl border border-border bg-surface/80 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-emerald-600/80 text-white" aria-hidden><HeadsetIcon width={22} height={22} /></span>
          <span className="min-w-0">
            <b className="display flex items-center gap-2 text-[15px] font-bold">{tu("supportTitle")} <span className="size-2 rounded-full bg-emerald-400" aria-hidden /></b>
            <span className="block text-sm text-muted">WhatsApp · {settings.supportHours}</span>
          </span>
        </div>
        <p className="mt-3 text-sm text-muted">{tu("supportBody")}</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <a
            href={`https://wa.me/${settings.whatsappNumber}?text=${encodeURIComponent(tc("whatsappMessage"))}`}
            target="_blank"
            rel="noopener"
            className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#6ee7b7] px-4 text-sm font-bold text-[#052e1c] hover:bg-[#86efc4]"
          >
            <WhatsAppIcon width={18} height={18} /> {tu("chatWhatsApp")}
          </a>
          <Link href="/account/support" className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-surface-2 px-4 text-sm font-bold hover:bg-surface-2/70">
            <HeadsetIcon width={18} height={18} /> {ta("support")}
          </Link>
        </div>
      </section>

      <SignOutButton className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border border-border bg-surface/80 text-sm font-bold text-[#fca5a5] hover:border-danger/50" />
    </div>
  );
}
