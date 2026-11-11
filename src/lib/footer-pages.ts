import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";

/** Custom pages the admin marked "show in footer" (also listed under Legal in the phone menu). */
export const footerPages = unstable_cache(
  () => prisma.page.findMany({ where: { isPublished: true, showInFooter: true }, select: { slug: true, title: true }, orderBy: { createdAt: "asc" } }),
  ["footer-pages"],
  { tags: ["pages"], revalidate: 300 },
);
