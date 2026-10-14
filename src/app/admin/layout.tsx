import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Haiti Gaming Admin" }, robots: { index: false, follow: false } };

const themeScript = `try{if(localStorage.getItem('hg_theme')==='dark')document.documentElement.classList.add('dark')}catch(e){}`;

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
