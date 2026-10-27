import { headers } from "next/headers";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { getSession, requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { SecurityForms, SessionsList, type DeviceSession } from "@/components/SecurityForms";
import { TwoFactorSettings } from "@/components/TwoFactorSettings";

/** "iPhone · Safari" instead of the raw browser string. */
function describeDevice(ua: string) {
  const device = /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad" : /Android/.test(ua) ? (/Mobile/.test(ua) ? "Android" : "Android tablet") : /Windows/.test(ua) ? "Windows" : /Mac OS X|Macintosh/.test(ua) ? "Mac" : /CrOS/.test(ua) ? "Chromebook" : /Linux/.test(ua) ? "Linux" : "—";
  const browser = /SamsungBrowser/.test(ua) ? "Samsung Internet" : /Edg\//.test(ua) ? "Edge" : /OPR\/|Opera/.test(ua) ? "Opera" : /Firefox|FxiOS/.test(ua) ? "Firefox" : /CriOS|Chrome/.test(ua) ? "Chrome" : /Safari/.test(ua) ? "Safari" : "Browser";
  return { device, browser, mobile: /iPhone|Android|Mobile/.test(ua) };
}

export default async function SecurityPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireUser(locale);
  const [ts, fmt, current, sessions] = await Promise.all([
    getTranslations("security"),
    getFormatter(),
    getSession(),
    // A failure here must not break the whole page
    auth.api.listSessions({ headers: await headers() }).catch((e) => {
      console.error("listSessions failed", e);
      return [] as { token: string; userAgent?: string | null; ipAddress?: string | null; updatedAt: Date | string }[];
    }),
  ]);
  const hasPassword = (await prisma.account.count({ where: { userId: user.id, providerId: "credential" } })) > 0;
  const tg = await getTranslations("google");
  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{ts("title")}</h1>
        <p className="mt-1 text-sm text-muted">{ts("subtitle")}</p>
      </div>
      {hasPassword ? (
        <>
          <SecurityForms />
          <TwoFactorSettings enabled={!!user.twoFactorEnabled} />
        </>
      ) : (
        <p className="card flex items-start gap-3 p-5 text-sm"><span className="text-2xl" aria-hidden>🔐</span><span>{tg("securityNote")}</span></p>
      )}
      <SessionsList
        sessions={sessions.map((s): DeviceSession => {
          const d = describeDevice(s.userAgent ?? "");
          return { token: s.token, ...d, ip: s.ipAddress ?? "", when: fmt.dateTime(new Date(s.updatedAt), { dateStyle: "medium", timeStyle: "short" }), current: s.token === current?.session.token };
        })}
      />
    </div>
  );
}
