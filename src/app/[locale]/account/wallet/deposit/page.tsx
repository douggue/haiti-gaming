import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { moncashAvailable } from "@/lib/payments/moncash";
import { DepositForm } from "@/components/DepositForm";
import { VerifyGate } from "@/components/VerifyGate";
import { mustVerifyEmail } from "@/lib/verify-email";
import { getManualMethods } from "@/lib/manual-methods";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { getBalances } from "@/lib/ledger";

export default async function DepositPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ amount?: string; method?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireUser(locale);
  if (await mustVerifyEmail(user.id)) return <VerifyGate email={user.email} />;
  const sp = await searchParams;
  const [tw, tc, s, manual, balances, profile] = await Promise.all([
    getTranslations("wallet"),
    getTranslations("common"),
    getSettings(),
    getManualMethods(locale, "deposits"),
    getBalances(prisma, user.id),
    prisma.user.findUnique({ where: { id: user.id }, select: { phone: true } }),
  ]);
  // Gourdes-only store: no USD (USDT) deposits and no talk of HTG↔USD exchange, unless this customer holds dollars
  const usd = s.showUsd || balances.USD.available + balances.USD.held > 0;
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/account/wallet" className="text-sm text-muted hover:text-text">← {tc("wallet")}</Link>
        <h1 className="display mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{tw("depositTitle")}</h1>
      </div>
      <DepositForm
        moncash={moncashAvailable(s.moncashEnabled)}
        natcash={s.natcashEnabled}
        natcashName={s.natcashRecipientName}
        natcashPhone={s.natcashRecipientPhone}
        natcashQr={s.natcashQrUrl}
        manual={manual}
        minHtg={s.minDepositHtg}
        maxHtg={s.maxDepositHtg}
        htgPerUsd={s.htgPerUsd}
        usd={usd}
        initialAmount={sp.amount}
        initialMethod={sp.method}
        defaultPhone={profile?.phone ?? undefined}
      />
      <p className="text-sm text-muted">{usd ? tw("storeCredit") : tw("storeCreditHtg")}</p>
    </div>
  );
}
