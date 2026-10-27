import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/session";
import { can, isStaff } from "@/lib/permissions";
import { readPrivateFile } from "@/lib/storage";

/** A vendor applicant's ID photo: staff with catalog rights (and 2FA) only. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user || !isStaff(user.role) || !user.twoFactorEnabled) return new NextResponse("Forbidden", { status: 403 });
  const allowed = user.role === "CUSTOM" ? (await prisma.user.findUnique({ where: { id: user.id }, include: { customRole: true } }))?.customRole?.permissions.includes("catalog.manage") : can(user.role, "catalog.manage");
  if (!allowed) return new NextResponse("Forbidden", { status: 403 });
  const { id } = await params;
  const v = await prisma.marketVendor.findUnique({ where: { id }, select: { idPhotoPath: true } });
  if (!v?.idPhotoPath) return new NextResponse("Not found", { status: 404 });
  const buf = await readPrivateFile(v.idPhotoPath);
  const ext = v.idPhotoPath.split(".").pop();
  return new NextResponse(new Uint8Array(buf), { headers: { "content-type": ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg", "cache-control": "private, no-store", "x-content-type-options": "nosniff" } });
}
