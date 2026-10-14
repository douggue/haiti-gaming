import type { Settings } from "@/lib/settings";
import { t } from "@/lib/text";

export function AnnouncementBar({ settings, locale }: { settings: Settings; locale: string }) {
  const a = settings.announcement;
  const text = a?.enabled ? t(a.text, locale) : "";
  if (!text) return null;
  const inner = <span className="font-medium">{text}</span>;
  return (
    <div className="bg-navy px-4 py-2 text-center text-sm text-white">
      {a.link ? <a href={a.link} className="underline-offset-4 hover:underline">{inner}</a> : inner}
    </div>
  );
}
