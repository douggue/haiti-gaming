import { requireStaff } from "@/lib/session";
import { DEFAULT_THEME, getSettings } from "@/lib/settings";
import { ThemeEditor } from "@/components/admin/ThemeEditor";
import { PageTitle } from "@/components/admin/ui";

export const metadata = { title: "Appearance" };

export default async function AppearancePage() {
  await requireStaff("content.manage");
  const s = await getSettings();
  return (
    <>
      <PageTitle title="Appearance" sub="Brand colors, corner rounding and animations for the store and customer account. Colors that would make text unreadable are refused." />
      <ThemeEditor initial={{ ...DEFAULT_THEME, ...s.theme }} defaults={DEFAULT_THEME} history={(s.themeHistory ?? []).map((h) => ({ at: h.at, by: h.by, theme: { ...DEFAULT_THEME, ...h.theme } }))} />
    </>
  );
}
