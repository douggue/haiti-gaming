import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/money";
import { moncashAvailable } from "@/lib/payments/moncash";
import { DepositForm } from "@/components/DepositForm";
import { getManualMethods } from "@/lib/manual-methods";
import { Link } from "@/i18n/navigation";

export default async function DepositPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireUser(locale);
  const [tw, tc, s, manual] = await Promise.all([getTranslations("wallet"), getTranslations("common"), getSettings(), getManualMethods(locale, "deposits")]);
  return (
    <div className="max-w-xl space-y-6">
      <div>
        <Link href="/account/wallet" className="text-sm text-muted hover:text-text">← {tc("wallet")}</Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{tw("depositTitle")}</h1>
      </div>
      <DepositForm
        moncash={moncashAvailable(s.moncashEnabled)}
        natcash={s.natcashEnabled}
        recipientName={s.natcashRecipientName}
        recipientPhone={s.natcashRecipientPhone}
        manual={manual}
        hint={tw("amountHint", { min: formatMoney(s.minDepositHtg, "HTG", locale), max: formatMoney(s.maxDepositHtg, "HTG", locale) })}
      />
      <p className="text-sm text-muted">{tw("storeCredit")}</p>
    </div>
  );
}
