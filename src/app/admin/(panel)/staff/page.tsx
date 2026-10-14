import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { ROLE_PERMISSIONS } from "@/lib/permissions";
import { setStaffRole } from "@/actions/admin";
import { ActionForm } from "@/components/admin/ActionButton";
import { PageTitle, Table } from "@/components/admin/ui";
import type { Role } from "@prisma/client";

export const metadata = { title: "Staff & roles" };

export default async function StaffPage() {
  await requireStaff("staff.manage");
  const staff = await prisma.user.findMany({ where: { role: { not: "CUSTOMER" } }, orderBy: { name: "asc" } });
  const roles = Object.keys(ROLE_PERMISSIONS) as Role[];
  const assign = async (fd: FormData) => {
    "use server";
    return setStaffRole(String(fd.get("email")), String(fd.get("role")) as Role);
  };
  return (
    <>
      <PageTitle title="Staff & roles" sub="Staff must register a normal account first, then you assign a role here. Two-factor authentication is mandatory for every staff role." />
      <ActionForm action={assign} className="card mb-6 flex flex-wrap items-end gap-3 p-5" resetOnSuccess>
        <label className="flex-1"><span className="label">Account email</span><input name="email" type="email" required className="input" /></label>
        <label><span className="label">Role</span><select name="role" className="input">{roles.map((r) => <option key={r}>{r}</option>)}</select></label>
        <button className="btn-primary">Assign role</button>
      </ActionForm>
      <Table head={["Name", "Email", "Role", "2FA"]}>
        {staff.map((s) => (
          <tr key={s.id}>
            <td className="px-4 py-3 font-medium">{s.name}</td>
            <td className="px-4 py-3">{s.email}</td>
            <td className="px-4 py-3 text-xs">{s.role}</td>
            <td className="px-4 py-3">{s.twoFactorEnabled ? <span className="text-success">On</span> : <span className="text-warning">Pending</span>}</td>
          </tr>
        ))}
      </Table>
      <h2 className="mb-3 mt-8 font-semibold">What each role can do</h2>
      <Table head={["Role", "Permissions"]}>
        {roles.filter((r) => r !== "CUSTOMER").map((r) => <tr key={r}><td className="px-4 py-3 text-xs font-semibold">{r}</td><td className="px-4 py-3 text-xs text-muted">{ROLE_PERMISSIONS[r].join(", ")}</td></tr>)}
      </Table>
    </>
  );
}
