import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { siteUrl } from "@/lib/site-url";
import { t } from "@/lib/text";
import { deleteRedirect, savePageSeo, saveRedirect, saveSeoSettings } from "@/actions/content";
import { ActionButton, ActionForm } from "@/components/admin/ActionButton";
import { LocalizedInputs } from "@/components/admin/LocalizedInputs";
import { PageTitle, Table } from "@/components/admin/ui";

export const metadata = { title: "SEO" };

const PAGES = [
  ["/", "Homepage"], ["/store", "Store"], ["/categories", "Categories"], ["/news", "News"], ["/guides", "Payment guides"],
  ["/faq", "FAQ"], ["/about", "About"], ["/contact", "Contact"], ["/terms", "Terms"], ["/privacy", "Privacy"], ["/refunds", "Refunds"],
] as const;

const TABS = [
  ["pages", "Fixed pages"], ["products", "Products"], ["categories", "Categories"], ["news", "News"], ["custom", "Custom pages"], ["engines", "Search engines"], ["redirects", "Redirects"],
] as const;

type Seo = { path: string; title: unknown; description: unknown; ogImage: string | null; noindex: boolean };

/** One page's SEO: title, description, share image, hide from Google. Empty = the page's own text. */
function SeoItem({ path, name, seo }: { path: string; name: string; seo?: Seo }) {
  const custom = !!seo && (Object.values((seo.title ?? {}) as object).some(Boolean) || Object.values((seo.description ?? {}) as object).some(Boolean) || !!seo.ogImage);
  return (
    <details className="card p-4">
      <summary className="cursor-pointer font-medium">
        {name} <span className="font-mono text-xs text-muted">{path}</span>
        {custom && <span className="badge ml-2 bg-primary-soft text-primary">Custom</span>}
        {seo?.noindex && <span className="badge ml-2 bg-danger-soft text-danger">Hidden from Google</span>}
      </summary>
      <ActionForm action={savePageSeo} className="mt-4 space-y-3">
        <input type="hidden" name="path" value={path} />
        <LocalizedInputs prefix="title" label="Title (about 60 characters; empty = the page's own)" value={(seo?.title ?? {}) as Record<string, string>} />
        <LocalizedInputs prefix="description" label="Description (about 155 characters)" value={(seo?.description ?? {}) as Record<string, string>} textarea />
        <label className="block"><span className="label">Share image link (WhatsApp, Facebook…; empty = the page's image)</span><input name="ogImage" defaultValue={seo?.ogImage ?? ""} placeholder="https://… or /media/…" className="input" /></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="noindex" defaultChecked={seo?.noindex} /> Hide from Google (noindex, left out of sitemap.xml)</label>
        <button className="btn-secondary min-h-9 px-4 text-xs">Save</button>
      </ActionForm>
    </details>
  );
}

export default async function SeoPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireStaff("seo.manage");
  const tab = (await searchParams).tab ?? "pages";
  const overrides = await prisma.pageSeo.findMany();
  const byPath = Object.fromEntries(overrides.map((o) => [o.path, o]));
  const en = (v: unknown) => t(v, "en") || t(v, "ht");

  let content: React.ReactNode = null;
  if (tab === "pages") {
    content = PAGES.map(([path, name]) => <SeoItem key={path} path={path} name={name} seo={byPath[path]} />);
  } else if (tab === "products") {
    const rows = await prisma.product.findMany({ select: { slug: true, name: true, isPublished: true }, orderBy: { sortOrder: "asc" } });
    content = rows.map((r) => <SeoItem key={r.slug} path={`/products/${r.slug}`} name={`${en(r.name)}${r.isPublished ? "" : " (draft)"}`} seo={byPath[`/products/${r.slug}`]} />);
  } else if (tab === "categories") {
    const rows = await prisma.category.findMany({ select: { slug: true, name: true }, orderBy: { sortOrder: "asc" } });
    content = rows.map((r) => <SeoItem key={r.slug} path={`/categories/${r.slug}`} name={en(r.name)} seo={byPath[`/categories/${r.slug}`]} />);
  } else if (tab === "news") {
    const rows = await prisma.newsArticle.findMany({ select: { slug: true, title: true }, orderBy: { createdAt: "desc" } });
    content = rows.map((r) => <SeoItem key={r.slug} path={`/news/${r.slug}`} name={en(r.title)} seo={byPath[`/news/${r.slug}`]} />);
  } else if (tab === "custom") {
    const rows = await prisma.page.findMany({ select: { slug: true, title: true }, orderBy: { createdAt: "asc" } });
    content = rows.map((r) => <SeoItem key={r.slug} path={`/p/${r.slug}`} name={en(r.title)} seo={byPath[`/p/${r.slug}`]} />);
  } else if (tab === "engines") {
    const s = await getSettings();
    const base = siteUrl();
    content = (
      <ActionForm action={saveSeoSettings} className="card space-y-4 p-5">
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <a href={`${base}/sitemap.xml`} target="_blank" rel="noopener" className="rounded-xl bg-surface-2 px-4 py-3 font-mono text-xs text-primary">{base}/sitemap.xml ↗</a>
          <a href={`${base}/robots.txt`} target="_blank" rel="noopener" className="rounded-xl bg-surface-2 px-4 py-3 font-mono text-xs text-primary">{base}/robots.txt ↗</a>
        </div>
        <label className="block">
          <span className="label">Google Search Console verification</span>
          <input name="google" defaultValue={s.googleSiteVerification} placeholder='Paste the HTML tag or just the code' className="input font-mono text-xs" spellCheck={false} />
          <span className="mt-1 block text-xs text-muted">Search Console → Add property → URL prefix {base} → HTML tag. Paste it here, save, then press Verify there. Then submit {base}/sitemap.xml in Sitemaps.</span>
        </label>
        <label className="block">
          <span className="label">Bing Webmaster Tools verification</span>
          <input name="bing" defaultValue={s.bingSiteVerification} placeholder="Code from the msvalidate.01 tag" className="input font-mono text-xs" spellCheck={false} />
        </label>
        <label className="block">
          <span className="label">Extra paths to keep out of search engines (robots.txt), one per line</span>
          <textarea name="robotsDisallow" rows={4} defaultValue={s.robotsDisallow.join("\n")} placeholder="/order-status" className="input font-mono text-xs" />
          <span className="mt-1 block text-xs text-muted">Admin, account, cart, checkout, sign-in and gift links are always kept out. A path here applies in every language.</span>
        </label>
        <button className="btn-primary min-h-10">Save</button>
      </ActionForm>
    );
  } else if (tab === "redirects") {
    const redirects = await prisma.redirectRule.findMany({ orderBy: { createdAt: "desc" } });
    content = (
      <>
        <ActionForm action={saveRedirect} className="card mb-4 flex flex-wrap items-end gap-3 p-4" resetOnSuccess>
          <label className="flex-1"><span className="label">Old path</span><input name="from" required placeholder="/old-free-fire-page" className="input" /></label>
          <label className="flex-1"><span className="label">New path or URL</span><input name="to" required placeholder="/products/free-fire-diamonds" className="input" /></label>
          <label className="flex items-center gap-2 pb-3 text-sm"><input type="checkbox" name="permanent" defaultChecked /> Permanent (301)</label>
          <button className="btn-primary">Add redirect</button>
        </ActionForm>
        <Table head={["From", "To", "Type", "Used", ""]} empty={redirects.length === 0}>
          {redirects.map((r) => (
            <tr key={r.id}>
              <td className="px-4 py-2.5 font-mono text-xs">{r.from}</td>
              <td className="px-4 py-2.5 font-mono text-xs">{r.to}</td>
              <td className="px-4 py-2.5 text-xs">{r.permanent ? "301" : "302"}</td>
              <td className="px-4 py-2.5">{r.hits}</td>
              <td className="px-4 py-2.5"><ActionButton label="Delete" className="btn-ghost min-h-8 px-2 text-xs text-danger" action={deleteRedirect.bind(null, r.id)} /></td>
            </tr>
          ))}
        </Table>
        <p className="mt-2 text-xs text-muted">Redirects apply in every language: /ht/old-page, /fr/old-page… all go to the new page in the same language.</p>
      </>
    );
  }

  return (
    <>
      <PageTitle title="SEO" sub="How each page appears on Google and when shared on WhatsApp/Facebook. Empty fields use the page's own name, text and image." />
      <nav className="-mx-1 mb-5 flex gap-1 overflow-x-auto px-1">
        {TABS.map(([k, label]) => (
          <Link key={k} href={`/admin/seo?tab=${k}`} className={`shrink-0 rounded-xl px-3.5 py-2 text-sm font-semibold ${tab === k ? "bg-primary text-white" : "bg-surface-2 text-muted"}`}>{label}</Link>
        ))}
      </nav>
      <div className="space-y-3">{content}</div>
    </>
  );
}
