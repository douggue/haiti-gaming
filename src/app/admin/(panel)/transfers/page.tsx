import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { formatMoney } from "@/lib/money";
import { PageTitle, Table } from "@/components/admin/ui";

export const metadata = { title: "Transfers" };

/** Money customers sent each other (transfer codes). Read-only: a wrong transfer is fixed with a wallet adjustment. */
export default async function TransfersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireStaff("wallet.view");
  const q = ((await searchParams).q ?? "").trim();
  const rows = await prisma.transfer.findMany({
    where: q ? { OR: [{ from: { OR: [{ email: { contains: q, mode: "insensitive" } }, { transferCode: q.toUpperCase() }] } }, { to: { OR: [{ email: { contains: q, mode: "insensitive" } }, { transferCode: q.toUpperCase() }] } }] } : {},
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { from: { select: { id: true, name: true, transferCode: true } }, to: { select: { id: true, name: true, transferCode: true } } },
  });
  const total = rows.reduce((n, r) => n + r.amount, 0);
  return (
    <>
      <PageTitle title="Transfers" sub={`Customer to customer, no fee. ${rows.length} shown · ${formatMoney(total, "HTG", "en")}. Limit and on/off in Settings.`} />
      <form className="mb-4 flex gap-2">
        <input name="q" defaultValue={q} placeholder="Email or code (HG-…)" className="input max-w-xs" />
        <button className="btn-secondary">Search</button>
      </form>
      <Table head={["When", "From", "To", "Amount", "Message"]} empty={!rows.length}>
        {rows.map((r) => (
          <tr key={r.id}>
            <td className="text-xs text-muted">{r.createdAt.toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" })}</td>
            <td><Link href={`/admin/customers/${r.from.id}`} className="text-primary">{r.from.name}</Link> <code className="text-xs text-muted">{r.from.transferCode}</code></td>
            <td><Link href={`/admin/customers/${r.to.id}`} className="text-primary">{r.to.name}</Link> <code className="text-xs text-muted">{r.to.transferCode}</code></td>
            <td className="font-semibold">{formatMoney(r.amount, "HTG", "en")}</td>
            <td className="text-xs text-muted">{r.note}</td>
          </tr>
        ))}
      </Table>
    </>
  );
}
