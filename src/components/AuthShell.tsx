import { getTranslations } from "next-intl/server";
import { BoltIcon, ShieldIcon, WalletIcon } from "./Icons";

/** Sign-in pages: dark welcome panel beside the form on wide screens; the form alone on phones. */
export async function AuthShell({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("authUi");
  const items = [
    [BoltIcon, "b1t", "b1b"],
    [WalletIcon, "b2t", "b2b"],
    [ShieldIcon, "b3t", "b3b"],
  ] as const;
  return (
    <div className="grid lg:min-h-[calc(100dvh-4rem)] lg:grid-cols-2">
      <section className="hero-dark relative hidden overflow-hidden px-12 py-16 lg:flex lg:flex-col lg:justify-center">
        <div className="hero-grid" aria-hidden />
        <div className="stagger relative flex max-w-lg flex-col gap-6">
          <p className="display animate-rise text-5xl font-bold leading-[1.05]">
            {t("heroTitle")} <span className="text-[#46d8ff]">{t("heroAccent")}</span>
          </p>
          <p className="animate-rise text-lg text-[#b7c6e4]">{t("heroBody")}</p>
          <ul className="animate-rise mt-2 space-y-4">
            {items.map(([Icon, title, body]) => (
              <li key={title} className="flex items-center gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#2f74ff]/25 text-[#8fb5ff]"><Icon /></span>
                <span>
                  <b className="block">{t(title)}</b>
                  <span className="text-sm text-[#9fb0d0]">{t(body)}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <div className="flex items-center justify-center px-4 py-10 sm:py-16">{children}</div>
    </div>
  );
}
