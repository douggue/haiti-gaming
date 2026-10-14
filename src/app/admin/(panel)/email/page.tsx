import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { emailEnabled, previewEmail } from "@/lib/email";
import { TestEmailForm } from "@/components/admin/TestEmailForm";
import { PageTitle, Stat, Table } from "@/components/admin/ui";

export const metadata = { title: "Email" };

export default async function Email({ searchParams }: { searchParams: Promise<{ preview?: string; lang?: string }> }) {
  await requireStaff("settings.manage");
  const sp = await searchParams;
  const kind = sp.preview === "verify" ? "verify" : "reset";
  const lang = ["ht", "fr", "en", "es"].includes(sp.lang ?? "") ? sp.lang! : "ht";
  const since = new Date(Date.now() - 7 * 86_400_000);
  const [logs, counts] = await Promise.all([
    prisma.emailLog.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.emailLog.groupBy({ by: ["status"], where: { createdAt: { gte: since } }, _count: true }),
  ]);
  const count = (s: string) => counts.find((c) => c.status === s)?._count ?? 0;
  const on = emailEnabled();
  const preview = previewEmail(kind, lang);
  const from = process.env.EMAIL_FROM ?? "";
  return (
    <>
      <PageTitle title="Email" sub="Delivery status, a test send, recent messages and template previews." />
      <div className={`card mb-6 p-4 text-sm ${on ? "border-success" : "border-warning"}`}>
        {on ? (
          <p><span className="font-semibold text-success">Email is on.</span> Sending from <span className="font-mono">{from}</span> through Resend.</p>
        ) : (
          <p><span className="font-semibold text-warning">Email is off.</span> Password resets go through WhatsApp support and the one-time link in Admin → Customers. To turn it on: verify your domain in Resend, then set <span className="font-mono">RESEND_API_KEY</span> and <span className="font-mono">EMAIL_FROM</span> in Vercel and redeploy.</p>
        )}
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Sent (7 days)" value={count("sent")} />
        <Stat label="Failed (7 days)" value={count("failed")} tone={count("failed") ? "danger" : undefined} />
        <Stat label="Skipped, email off (7 days)" value={count("skipped")} tone={count("skipped") ? "warn" : undefined} />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-3 font-semibold">Send a test</h2>
          <TestEmailForm disabled={!on} />
        </section>
        <section className="card p-5">
          <h2 className="mb-3 font-semibold">Template preview</h2>
          <div className="mb-3 flex flex-wrap gap-2 text-xs">
            {(["reset", "verify"] as const).map((k) => <a key={k} href={`?preview=${k}&lang=${lang}`} className={`badge ${kind === k ? "bg-primary text-white" : "bg-surface-2"}`}>{k === "reset" ? "Password reset" : "Confirm email"}</a>)}
            {["ht", "fr", "en", "es"].map((l) => <a key={l} href={`?preview=${kind}&lang=${l}`} className={`badge ${lang === l ? "bg-primary text-white" : "bg-surface-2"}`}>{l.toUpperCase()}</a>)}
          </div>
          <p className="mb-2 text-sm"><span className="text-muted">Subject:</span> {preview.subject}</p>
          <iframe title="Email preview" srcDoc={preview.html} sandbox="" className="h-80 w-full rounded-xl border border-border bg-white" />
        </section>
      </div>

      <h2 className="mb-3 mt-8 font-semibold">Recent messages</h2>
      <Table head={["When", "To", "Subject", "Status"]} empty={logs.length === 0}>
        {logs.map((l) => (
          <tr key={l.id}>
            <td className="px-4 py-3 text-xs">{l.createdAt.toLocaleString("en-US")}</td>
            <td className="px-4 py-3">{l.to}</td>
            <td className="px-4 py-3">{l.subject}</td>
            <td className="px-4 py-3">
              <span className={`badge ${l.status === "sent" ? "bg-success-soft text-success" : l.status === "failed" ? "bg-danger-soft text-danger" : "bg-warning-soft text-warning"}`}>{l.status}</span>
              {l.error && <p className="mt-1 max-w-xs break-words text-xs text-muted">{l.error}</p>}
            </td>
          </tr>
        ))}
      </Table>
    </>
  );
}
