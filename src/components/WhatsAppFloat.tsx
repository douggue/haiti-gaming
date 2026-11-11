"use client";
import { usePathname } from "@/i18n/navigation";

/** Pages with their own WhatsApp card or a bottom action bar: the round button would only cover their buttons on a phone. */
const OWN_HELP = ["/account", "/cart", "/checkout", "/faq", "/contact", "/guides", "/auth"];

export function WhatsAppFloat({ children, className, ...rest }: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  const pathname = usePathname();
  const hideOnPhone = OWN_HELP.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  return (
    <a {...rest} className={`${className ?? ""} ${hideOnPhone ? "max-md:hidden" : ""}`}>
      {children}
    </a>
  );
}
