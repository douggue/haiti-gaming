import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("common");
  return (
    <div className="container-page grid min-h-[50vh] place-items-center py-16 text-center">
      <div className="relative w-full max-w-md space-y-4 overflow-hidden rounded-3xl border border-border bg-surface/80 p-8 backdrop-blur">
        <span aria-hidden className="ds-hide pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-[#3b82f6]/25 blur-3xl" />
        <p className="display relative bg-gradient-to-r from-[#60a5fa] via-[#a78bfa] to-[#f87171] bg-clip-text text-7xl font-extrabold text-transparent">404</p>
        <h1 className="display relative text-2xl font-bold tracking-tight">{t("notFoundTitle")}</h1>
        <p className="relative text-muted">{t("notFoundBody")}</p>
        <div className="relative flex flex-wrap justify-center gap-2">
          <Link href="/store" className="btn-primary min-h-12 px-6">{t("notFoundCta")}</Link>
          <Link href="/faq" className="btn-secondary min-h-12 px-6">{t("help")}</Link>
        </div>
      </div>
    </div>
  );
}
