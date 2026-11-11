import { getTranslations } from "next-intl/server";
import { BoltIcon, ShieldIcon, WalletIcon } from "./Icons";
import { LanguageFlags } from "./HeaderClient";

/** Sign-in pages: dark welcome panel beside the form on wide screens; the form alone on phones. */
export async function AuthShell({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("authUi");
  const items = [
    [BoltIcon, "b1t", "b1b"],
    [WalletIcon, "b2t", "b2b"],
    [ShieldIcon, "b3t", "b3b"],
  ] as const;
  return (
    <div className="container-page grid items-center gap-8 py-8 sm:py-12 lg:min-h-[calc(100dvh-4rem)] lg:grid-cols-[1.05fr_1fr] lg:gap-14">
      {/* Left: who we are (wide screens); the animated background shows through */}
      <section className="hidden lg:block">
        <div className="stagger flex max-w-xl flex-col gap-6">
          <p className="eyebrow animate-rise inline-flex w-fit items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-emerald-300">
            <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" /> 🇭🇹 {t("madeInHaiti")}
          </p>
          <p className="display animate-rise text-5xl font-extrabold leading-[1.05] tracking-tight">
            {t("heroTitle")} <span className="bg-gradient-to-r from-[#60a5fa] via-[#38bdf8] to-[#34d399] bg-clip-text text-transparent">{t("heroAccent")}</span>
          </p>
          <p className="animate-rise text-lg text-muted">{t("heroBody")}</p>
          <ul className="animate-rise grid gap-3 sm:grid-cols-3">
            {items.map(([Icon, title, body], i) => (
              <li key={title} className="rounded-2xl border border-border bg-surface/70 p-4 backdrop-blur">
                <span className={`grid size-10 place-items-center rounded-xl ${["bg-emerald-500/20 text-emerald-300", "bg-amber-500/20 text-amber-300", "bg-[#3b82f6]/25 text-[#93c5fd]"][i]}`}><Icon /></span>
                <b className="display mt-3 block text-sm">{t(title)}</b>
                <span className="mt-1 block text-xs text-muted">{t(body)}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <div className="flex flex-col items-center justify-center gap-5">
        <LanguageFlags className="justify-center" />
        {children}
      </div>
    </div>
  );
}
