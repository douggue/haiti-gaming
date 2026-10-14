import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Locale resolution: saved cookie → Accept-Language → Kreyòl. Bots are never redirected by location.
export default createMiddleware(routing);

export const config = {
  matcher: ["/((?!api|admin|_next|_vercel|.*\\..*).*)"],
};
