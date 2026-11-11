"use client";
import { usePathname } from "@/i18n/navigation";

/** Pages with their own WhatsApp card, a bottom action bar or product grids: on a phone the round button would cover their buttons. */
const OWN_HELP = ["/account", "/cart", "/checkout", "/faq", "/contact", "/guides", "/auth", "/store", "/categories", "/products"];

export function WhatsAppFloat({ children, className, ...rest }: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  const pathname = usePathname();
  const hideOnPhone = OWN_HELP.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  return (
    <a {...rest} className={`${className ?? ""} ${hideOnPhone ? "max-md:hidden" : ""}`}>
      {children}
    </a>
  );
}
